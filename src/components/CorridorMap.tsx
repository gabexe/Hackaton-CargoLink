import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Compass,
  LockSimple,
  MapPin,
  NavigationArrow,
  Pause,
  Play,
  Warning,
} from '@phosphor-icons/react';
import { useSimulation } from '../context/SimulationContext';
import {
  fetchRealRoadRoute,
  interpolateAlongPolyline,
} from '../utils/routing';
import type { ThemeMode } from '../types/logistics';
import { RouteBuilderModal } from './RouteBuilderModal';

function getTargetProgress(
  tripStatus: string,
  checkpoints: Array<{ status: 'passed' | 'current' | 'upcoming' }>
): number {
  if (tripStatus === 'docked') return 0;
  if (tripStatus === 'arrived' || tripStatus === 'delivered') return 1;
  if (checkpoints.length <= 1) return 0;

  const currentIdx = checkpoints.findIndex((cp) => cp.status === 'current');
  const idx = currentIdx >= 0 ? currentIdx : 0;
  const baseRatio = idx / (checkpoints.length - 1);

  if (tripStatus === 'near_dock') {
    return Math.max(baseRatio, 0.92);
  }
  return baseRatio;
}

export function CorridorMap({ theme }: { theme: ThemeMode }) {
  const {
    activeRoute,
    activeRole,
    isAutoSimulating,
    toggleAutoSimulation,
    createCustomRoute,
  } = useSimulation();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const routePolylinePendingRef = useRef<L.Polyline | null>(null);
  const routePolylineActiveRef = useRef<L.Polyline | null>(null);
  const geofenceCircleRef = useRef<L.Circle | null>(null);
  const truckMarkerRef = useRef<L.Marker | null>(null);
  const checkpointMarkersRef = useRef<L.Marker[]>([]);

  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [roadPolyline, setRoadPolyline] = useState<Array<[number, number]>>(
    activeRoute.routeGeometry ?? []
  );
  const [roadKm, setRoadKm] = useState<number>(activeRoute.distanceKm ?? 402);

  const isDark = theme === 'dark';
  const isCarrier = activeRole === 'carrier';
  const isInMotion =
    activeRoute.tripStatus === 'in_transit' || activeRoute.tripStatus === 'near_dock';

  const targetProgress = useMemo(
    () => getTargetProgress(activeRoute.tripStatus, activeRoute.checkpoints),
    [activeRoute.tripStatus, activeRoute.checkpoints]
  );

  const animProgressRef = useRef<number>(targetProgress);

  // Load real road geometry via OSRM when route changes
  useEffect(() => {
    let isCancelled = false;
    animProgressRef.current = targetProgress;

    const waypoints = activeRoute.checkpoints.map((c) => ({ lat: c.lat, lng: c.lng }));
    if (waypoints.length >= 2) {
      fetchRealRoadRoute(waypoints).then((res) => {
        if (!isCancelled) {
          setRoadPolyline(res.geometry);
          setRoadKm(res.distanceKm > 0 ? res.distanceKm : 402);
        }
      });
    }

    return () => {
      isCancelled = true;
    };
  }, [activeRoute.id, activeRoute.checkpoints, targetProgress]);

  // Initialize and maintain real Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
      });

      // Default center around Cordoba / central corridor
      map.setView([-31.4618, -64.1135], 9);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // CartoDB tiles: Dark Matter vs Positron
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    // CartoDB tiles with optional user API key support, fallback to OpenStreetMap (100% free, zero watermarks)
    const cartoApiKey = import.meta.env.VITE_CARTO_API_KEY as string | undefined;

    let tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    let subdomains: string | string[] = 'abc';

    if (cartoApiKey) {
      tileUrl = isDark
        ? `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?api_key=${cartoApiKey}`
        : `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?api_key=${cartoApiKey}`;
      subdomains = 'abcd';
    }

    const tileLayer = L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    return () => {
      // Map instance cleaned up on unmount
    };
  }, [isDark]);

  // Update polylines, geofence, and markers on map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old checkpoint markers
    checkpointMarkersRef.current.forEach((m) => map.removeLayer(m));
    checkpointMarkersRef.current = [];

    // Clear old geofence circle
    if (geofenceCircleRef.current) {
      map.removeLayer(geofenceCircleRef.current);
      geofenceCircleRef.current = null;
    }

    // Clear old polylines
    if (routePolylinePendingRef.current) {
      map.removeLayer(routePolylinePendingRef.current);
      routePolylinePendingRef.current = null;
    }
    if (routePolylineActiveRef.current) {
      map.removeLayer(routePolylineActiveRef.current);
      routePolylineActiveRef.current = null;
    }

    const points = roadPolyline.length > 0
      ? roadPolyline
      : activeRoute.checkpoints.map((c) => [c.lat, c.lng] as [number, number]);

    if (points.length >= 2) {
      // 1. Pending road line (subtle grey track)
      const pendingLine = L.polyline(points, {
        color: isDark ? '#3F3F46' : '#C4C4C8',
        weight: 5,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
      routePolylinePendingRef.current = pendingLine;

      // 2. Traveled road line (Uber blue #276EF1)
      const activeLine = L.polyline([], {
        color: '#276EF1',
        weight: 6,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
      routePolylineActiveRef.current = activeLine;

      // Fit map bounds to whole route with comfortable padding
      map.fitBounds(pendingLine.getBounds(), { padding: [50, 50], maxZoom: 13 });

      // 3. Real 10 km Geofence around final destination
      const lastPoint = points[points.length - 1];
      const isNearDock = activeRoute.tripStatus === 'near_dock';
      const geofence = L.circle(lastPoint, {
        radius: 10000, // 10 km real radius
        color: '#276EF1',
        weight: isNearDock ? 2 : 1,
        dashArray: '4, 6',
        fillColor: '#276EF1',
        fillOpacity: isNearDock ? 0.16 : 0.05,
      }).addTo(map);
      geofenceCircleRef.current = geofence;

      // 4. Checkpoint pins with city names
      activeRoute.checkpoints.forEach((cp) => {
        const isCurrent = cp.status === 'current';
        const isPassed = cp.status === 'passed';

        const pinHtml = `
          <div style="
            display: flex;
            align-items: center;
            gap: 4px;
            background: ${isDark ? '#19191B' : '#FEFEFE'};
            color: ${isDark ? '#F5F5F7' : '#141414'};
            border: 1px solid ${isDark ? '#333338' : '#D4D4D8'};
            padding: 2px 7px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 600;
            font-family: system-ui, sans-serif;
            white-space: nowrap;
            box-shadow: 0 1px 4px rgba(0,0,0,0.18);
          ">
            <span style="
              width: 7px;
              height: 7px;
              border-radius: 50%;
              background: ${isPassed || isCurrent ? '#276EF1' : isDark ? '#71717A' : '#A1A1AA'};
            "></span>
            <span>${cp.city.split(',')[0]}</span>
          </div>
        `;

        const icon = L.divIcon({
          className: 'custom-cp-pin',
          html: pinHtml,
          iconAnchor: [30, 12],
        });

        const marker = L.marker([cp.lat, cp.lng], { icon, interactive: false }).addTo(map);
        checkpointMarkersRef.current.push(marker);
      });
    }
  }, [
    activeRoute.id,
    activeRoute.checkpoints,
    activeRoute.tripStatus,
    roadPolyline,
    isDark,
  ]);

  // Smooth frame loop to animate truck marker and active blue line
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    let rafId = 0;
    let lastTime = performance.now();

    const points = roadPolyline.length > 0
      ? roadPolyline
      : activeRoute.checkpoints.map((c) => [c.lat, c.lng] as [number, number]);

    if (points.length < 2) return;

    const animate = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const diff = targetProgress - animProgressRef.current;
      animProgressRef.current += diff * Math.min(1, dt * 5);
      const progress = animProgressRef.current;

      const { lat, lng, bearing } = interpolateAlongPolyline(points, progress);

      // Update active blue polyline
      if (routePolylineActiveRef.current) {
        const segCount = Math.floor(progress * (points.length - 1));
        const activeLatLngs = points.slice(0, segCount + 1);
        activeLatLngs.push([lat, lng]);
        routePolylineActiveRef.current.setLatLngs(activeLatLngs);
      }

      // Update or create truck puck marker (visible for carrier, docked, arrived)
      const canShowPuck = isCarrier || activeRoute.tripStatus === 'docked' || activeRoute.tripStatus === 'arrived';
      if (canShowPuck) {
        const puckHtml = `
          <div style="
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: #276EF1;
            border: 2.5px solid #FEFEFE;
            box-shadow: 0 2px 8px rgba(39,110,241,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            transform: rotate(${Math.round(bearing)}deg);
            transition: transform 0.15s ease-out;
          ">
            <div style="
              width: 0;
              height: 0;
              border-left: 5px solid transparent;
              border-right: 5px solid transparent;
              border-bottom: 12px solid #FEFEFE;
              transform: translateY(-1px);
            "></div>
          </div>
        `;

        const puckIcon = L.divIcon({
          className: 'truck-puck',
          html: puckHtml,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        if (!truckMarkerRef.current) {
          truckMarkerRef.current = L.marker([lat, lng], { icon: puckIcon, zIndexOffset: 1000 }).addTo(map);
        } else {
          truckMarkerRef.current.setLatLng([lat, lng]);
          truckMarkerRef.current.setIcon(puckIcon);
        }
      } else if (truckMarkerRef.current) {
        map.removeLayer(truckMarkerRef.current);
        truckMarkerRef.current = null;
      }

      rafId = window.requestAnimationFrame(animate);
    };

    rafId = window.requestAnimationFrame(animate);
    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [
    roadPolyline,
    targetProgress,
    activeRoute.checkpoints,
    activeRoute.tripStatus,
    isCarrier,
  ]);

  const checkpoints = activeRoute.checkpoints;
  const currentIdx = Math.max(0, checkpoints.findIndex((c) => c.status === 'current'));
  const currentCp = checkpoints[currentIdx] ?? checkpoints[0];
  const nextCp = checkpoints[Math.min(checkpoints.length - 1, currentIdx + 1)] ?? checkpoints[checkpoints.length - 1];

  return (
    <div className="relative h-[280px] sm:h-[340px] lg:h-[420px] w-full overflow-hidden rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)]">
      {/* Real Interactive Leaflet Container */}
      <div ref={mapContainerRef} className="h-full w-full z-0" />

      {/* Top HUD: Carrier navigation banner vs Shipper/Receiver Privacy Checkpoint banner */}
      <div className="absolute left-2.5 right-2.5 top-12 sm:top-13 z-10 flex items-center justify-between gap-2">
        {isCarrier ? (
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-[#141414]/92 px-3 py-2 text-[#F6F6F6] shadow-md backdrop-blur-md dark:bg-[#19191B]/95 dark:border dark:border-[var(--border-hairline)]">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#276EF1] text-[#FEFEFE]">
              <NavigationArrow size={15} weight="bold" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">
                {activeRoute.tripStatus === 'docked'
                  ? `En dársena · ${activeRoute.origin.split(',')[0]}`
                  : activeRoute.tripStatus === 'arrived' || activeRoute.tripStatus === 'delivered'
                    ? `Arribo · ${activeRoute.receiverPlantName}`
                    : `Hacia ${nextCp?.city.split(',')[0]}`}
              </p>
              <p className="truncate font-mono text-[11px] opacity-80">
                {roadKm} km de ruta real (OSRM) · {activeRoute.privateTelemetry.speedKmh} km/h
              </p>
            </div>
            {isInMotion && (
              <button
                type="button"
                onClick={toggleAutoSimulation}
                className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-full bg-[#276EF1] px-2.5 text-[11px] font-semibold text-[#FEFEFE] transition-colors hover:bg-[#1E5BD6]"
              >
                {isAutoSimulating ? (
                  <>
                    <Pause size={11} weight="bold" aria-hidden="true" />
                    <span>Pausa</span>
                  </>
                ) : (
                  <>
                    <Play size={11} weight="bold" aria-hidden="true" />
                    <span>Auto</span>
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)]/95 px-3 py-2 text-xs shadow-md backdrop-blur-md">
            <div className="flex min-w-0 items-center gap-2">
              <LockSimple size={14} weight="regular" className="shrink-0 text-[#276EF1]" aria-hidden="true" />
              <p className="truncate font-medium text-[var(--text-primary)]">
                Hito: {currentCp?.city.split(',')[0]} (GPS protegido)
              </p>
            </div>
            {activeRoute.tripStatus === 'near_dock' && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#276EF1] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#FEFEFE]">
                <MapPin size={11} weight="bold" aria-hidden="true" />
                <span>&lt;10 km real</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Floating Bottom Strip: Real telemetry & Real Route Configurator Button */}
      <div className="absolute bottom-4 left-3 right-3 z-10 flex items-center justify-between gap-2 pointer-events-none">
        <button
          type="button"
          onClick={() => setIsBuilderOpen(true)}
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)]/95 px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] shadow-md backdrop-blur-md hover:border-[#276EF1] cursor-pointer"
        >
          <Compass size={14} weight="regular" className="text-[#276EF1]" aria-hidden="true" />
          <span>Configurar ruta real</span>
        </button>

        {activeRoute.tripStatus === 'incident' && activeRoute.incident ? (
          <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)]/95 px-2.5 py-1 text-[11px] shadow-sm backdrop-blur-sm">
            <Warning size={13} weight="bold" className="text-[#D97706] shrink-0" aria-hidden="true" />
            <span className="font-medium text-[var(--text-primary)]">
              {activeRoute.incident.kmLocation} (+{activeRoute.incident.delayMinutes} min)
            </span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)]/90 px-2.5 py-1 font-mono text-[10px] text-[var(--text-secondary)] shadow-sm backdrop-blur-sm">
            <span>OSRM {roadKm} km · OpenStreetMap</span>
          </div>
        )}
      </div>

      {/* Route Builder Modal */}
      <RouteBuilderModal
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        onSubmit={async (data) => {
          await createCustomRoute(data);
        }}
      />
    </div>
  );
}
