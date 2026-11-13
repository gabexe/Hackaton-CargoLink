export interface LocationSearchResult {
  name: string;
  lat: number;
  lng: number;
  category?: string;
}

export const AR_INDUSTRIAL_HUBS: LocationSearchResult[] = [
  { name: 'Polo 52 Parque Industrial, Córdoba', lat: -31.4618, lng: -64.1135, category: 'Parque Industrial' },
  { name: 'Parque Industrial Ferreyra, Córdoba', lat: -31.4721, lng: -64.1352, category: 'Parque Industrial' },
  { name: 'Parque Industrial San Francisco, Cba', lat: -31.4285, lng: -62.0827, category: 'Parque Industrial' },
  { name: 'Parque Industrial Villa María, Cba', lat: -32.3912, lng: -63.2205, category: 'Parque Industrial' },
  { name: 'Jesús María (Molinos / Agro), Cba', lat: -30.9817, lng: -64.0942, category: 'Centro Agroindustrial' },
  { name: 'Río Cuarto Parque Industrial, Cba', lat: -33.1232, lng: -64.3493, category: 'Centro Logístico' },
  { name: 'Rosario Puerto y Zona Sur, Santa Fe', lat: -32.9734, lng: -60.6282, category: 'Puerto / Industrial' },
  { name: 'Parque Industrial Alvear, Santa Fe', lat: -33.0421, lng: -60.6295, category: 'Parque Industrial' },
  { name: 'Parque Industrial Sauce Viejo, Santa Fe', lat: -31.7342, lng: -60.8194, category: 'Parque Industrial' },
  { name: 'Parque Industrial Rafaela, Santa Fe', lat: -31.2503, lng: -61.4867, category: 'Parque Industrial' },
  { name: 'Parque Industrial San Nicolás, BsAs', lat: -33.3614, lng: -60.2152, category: 'Siderurgia / Puerto' },
  { name: 'Parque Industrial Campana, BsAs', lat: -34.1825, lng: -58.9312, category: 'Petroquímica / Puerto' },
  { name: 'Parque Industrial Zárate, BsAs', lat: -34.1205, lng: -59.0354, category: 'Automotriz / Puerto' },
  { name: 'Parque Industrial Pilar, BsAs', lat: -34.4587, lng: -58.9142, category: 'Parque Industrial' },
  { name: 'Centro Logístico Pacheco / Tigre, BsAs', lat: -34.4521, lng: -58.6432, category: 'Centro Logístico' },
  { name: 'Puerto de Buenos Aires / Retiro, CABA', lat: -34.5824, lng: -58.3712, category: 'Puerto Federal' },
  { name: 'Parque Industrial Mendoza (Luján de Cuyo)', lat: -33.0245, lng: -68.8792, category: 'Petroquímica / Enología' },
  { name: 'Parque Industrial Tucumán (Banda del Río Salí)', lat: -26.8432, lng: -65.1782, category: 'Azúcar / Citrus' },
];

export async function searchRealLocations(query: string): Promise<LocationSearchResult[]> {
  const q = query.trim().toLowerCase();
  if (!q) return AR_INDUSTRIAL_HUBS.slice(0, 6);

  // Match local catalog first
  const localMatches = AR_INDUSTRIAL_HUBS.filter(
    (h) => h.name.toLowerCase().includes(q) || (h.category && h.category.toLowerCase().includes(q))
  );

  if (localMatches.length >= 4) {
    return localMatches;
  }

  // Complement with Nominatim OpenStreetMap if network permits
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2800);
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&countrycodes=ar&q=${encodeURIComponent(
        query
      )}&limit=5`,
      { signal: controller.signal }
    );
    clearTimeout(timer);

    if (resp.ok) {
      const data = (await resp.json()) as Array<{
        display_name: string;
        lat: string;
        lon: string;
      }>;
      const apiResults: LocationSearchResult[] = data.map((item) => ({
        name: item.display_name.split(',').slice(0, 3).join(','),
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        category: 'Georreferencia OSM',
      }));

      // Combine without exact coordinate duplicates
      const combined = [...localMatches];
      for (const res of apiResults) {
        if (!combined.some((c) => Math.abs(c.lat - res.lat) < 0.01 && Math.abs(c.lng - res.lng) < 0.01)) {
          combined.push(res);
        }
      }
      return combined.slice(0, 8);
    }
  } catch {
    // Network or timeout fallback to local
  }

  return localMatches;
}

export interface RoadRouteResponse {
  geometry: Array<[number, number]>; // [lat, lng]
  distanceKm: number;
  durationMinutes: number;
  isRealRoad: boolean;
}

// Straight-line geodetic fallback with 12 intermediate interpolated points per segment
function buildGeodeticFallback(waypoints: Array<{ lat: number; lng: number }>): RoadRouteResponse {
  const points: Array<[number, number]> = [];
  let totalKm = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const start = waypoints[i];
    const end = waypoints[i + 1];
    const dLat = end.lat - start.lat;
    const dLng = end.lng - start.lng;
    // Approximation for Argentina latitudes
    const segKm = Math.sqrt(Math.pow(dLat * 111, 2) + Math.pow(dLng * 95, 2)) * 1.15; // +15% winding road factor
    totalKm += segKm;

    const steps = 14;
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      points.push([start.lat + dLat * t, start.lng + dLng * t]);
    }
  }
  const last = waypoints[waypoints.length - 1];
  points.push([last.lat, last.lng]);

  return {
    geometry: points,
    distanceKm: Math.round(totalKm),
    durationMinutes: Math.round((totalKm / 75) * 60), // avg 75 km/h for heavy trucks
    isRealRoad: false,
  };
}

export async function fetchRealRoadRoute(
  waypoints: Array<{ lat: number; lng: number }>
): Promise<RoadRouteResponse> {
  if (waypoints.length < 2) {
    return {
      geometry: waypoints.map((w) => [w.lat, w.lng]),
      distanceKm: 0,
      durationMinutes: 0,
      isRealRoad: false,
    };
  }

  const coordinatesStr = waypoints.map((w) => `${w.lng},${w.lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coordinatesStr}?overview=full&geometries=geojson`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3800);
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (resp.ok) {
      const data = await resp.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        // GeoJSON coordinates are [lng, lat] -> convert to Leaflet [lat, lng]
        const latLngs: Array<[number, number]> = route.geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]]
        );
        return {
          geometry: latLngs,
          distanceKm: Math.round(route.distance / 1000),
          durationMinutes: Math.round(route.duration / 60),
          isRealRoad: true,
        };
      }
    }
  } catch {
    // Fall back to geodetic line with road curving factor
  }

  return buildGeodeticFallback(waypoints);
}

export function interpolateAlongPolyline(
  geometry: Array<[number, number]>,
  progress: number
): { lat: number; lng: number; bearing: number; coveredKm: number } {
  if (geometry.length === 0) {
    return { lat: -31.4618, lng: -64.1135, bearing: 0, coveredKm: 0 };
  }
  if (geometry.length === 1) {
    return { lat: geometry[0][0], lng: geometry[0][1], bearing: 0, coveredKm: 0 };
  }

  const clamped = Math.max(0, Math.min(1, progress));
  const totalSegments = geometry.length - 1;
  const targetIndex = clamped * totalSegments;
  const segIdx = Math.min(totalSegments - 1, Math.floor(targetIndex));
  const localT = targetIndex - segIdx;

  const a = geometry[segIdx];
  const b = geometry[segIdx + 1];

  const lat = a[0] + (b[0] - a[0]) * localT;
  const lng = a[1] + (b[1] - a[1]) * localT;

  const y = Math.sin(((b[1] - a[1]) * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180);
  const x =
    Math.cos((a[0] * Math.PI) / 180) * Math.sin((b[0] * Math.PI) / 180) -
    Math.sin((a[0] * Math.PI) / 180) *
      Math.cos((b[0] * Math.PI) / 180) *
      Math.cos(((b[1] - a[1]) * Math.PI) / 180);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;

  return {
    lat,
    lng,
    bearing: (bearing + 360) % 360,
    coveredKm: clamped,
  };
}
