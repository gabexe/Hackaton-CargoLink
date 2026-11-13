import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CORRIDOR_ROUTES } from '../data/corridors';
import { co2ToDieselLiters } from '../utils/carbon';
import { fetchRealRoadRoute } from '../utils/routing';
import type {
  BackhaulDraft,
  CanvasViewMode,
  CorridorCheckpoint,
  CorridorRoute,
  HandoffHint,
  IncidentDraft,
  PackagingFormat,
  PalletSlot,
  PilotStats,
  PushNotificationItem,
  RoadIncident,
  SimulationEvent,
  TripStatus,
  UserRole,
} from '../types/logistics';

export interface CustomRouteInput {
  originName: string;
  originLat: number;
  originLng: number;
  destinationName: string;
  destinationLat: number;
  destinationLng: number;
  carrierName?: string;
  pricePerPalletArs?: number;
}

export interface SimulationContextValue {
  routes: CorridorRoute[];
  activeRoute: CorridorRoute;
  selectedRouteId: string;
  activeRole: UserRole;
  canvasView: CanvasViewMode;
  isAutoSimulating: boolean;
  selectedSlotIds: string[];
  draftPackagingFormat: PackagingFormat;
  draftCargoLabel: string;
  draftPalletWeightKg: number;
  hasCargoProtection: boolean;
  events: SimulationEvent[];
  handoffHint: HandoffHint | null;
  activePushNotification: PushNotificationItem | null;
  dismissPushNotification: () => void;
  triggerNearDockAlert: (routeId: string) => void;
  inspectedSlotId: string | null;
  pilotStats: PilotStats;
  setActiveRole: (role: UserRole) => void;
  setCanvasView: (view: CanvasViewMode) => void;
  toggleAutoSimulation: () => void;
  selectRoute: (routeId: string) => void;
  setInspectedSlotId: (slotId: string | null) => void;
  toggleDraftSlot: (slotId: string) => void;
  applyPalletQuantityPreset: (count: number) => void;
  setDraftPackagingFormat: (format: PackagingFormat) => void;
  setDraftCargo: (label: string, weightKg: number) => void;
  setHasCargoProtection: (enabled: boolean) => void;
  confirmShipperBooking: () => string | null;
  publishBackhaulRoute: (draft: BackhaulDraft) => string;
  createCustomRoute: (input: CustomRouteInput) => Promise<string>;
  startRouteTrip: (routeId: string) => void;
  advanceNextCheckpoint: (routeId: string) => void;
  reportRoadIncident: (routeId: string, draft: IncidentDraft) => void;
  resolveRoadIncident: (routeId: string) => void;
  assignReceivingDock: (routeId: string, dockName: string) => void;
  confirmDeliveryUnload: (routeId: string) => void;
  dismissHandoffHint: () => void;
  resetSimulation: () => void;
}

const SimulationContext = createContext<SimulationContextValue | null>(null);

const INITIAL_EVENTS: SimulationEvent[] = [
  {
    id: 'evt-seed-1',
    timeLabel: '14:48 hs',
    actor: 'carrier',
    routeCode: 'RN9-JMA',
    summary: 'Logística Norte Cordobés SRL pasando por Estación Juárez Celman (km 29).',
  },
  {
    id: 'evt-seed-2',
    timeLabel: '14:15 hs',
    actor: 'carrier',
    routeCode: 'RN9-JMA',
    summary: 'Salida precintada desde Polo 52 rumbo a Molinos Norte SA.',
  },
  {
    id: 'evt-seed-3',
    timeLabel: '13:50 hs',
    actor: 'shipper',
    routeCode: 'RN9-ROS',
    summary: 'Autopartes Córdoba SA consolidó 2 pallets en Transporte Serrano SRL.',
  },
];

const CITY_COORDINATES: Array<{ match: string; lat: string; lng: string }> = [
  { match: 'Polo 52', lat: '-31.4618', lng: '-64.1135' },
  { match: 'Estación Juárez Celman', lat: '-31.2647', lng: '-64.1614' },
  { match: 'Acceso Sur Jesús María', lat: '-31.0280', lng: '-64.0955' },
  { match: 'Jesús María', lat: '-30.9817', lng: '-64.0942' },
  { match: 'Circunvalación', lat: '-31.3890', lng: '-64.1420' },
  { match: 'Villa María', lat: '-32.4075', lng: '-63.2402' },
  { match: 'Marcos Juárez', lat: '-32.6978', lng: '-62.1067' },
  { match: 'Rosario', lat: '-32.9442', lng: '-60.6505' },
  { match: 'Campana', lat: '-34.1687', lng: '-58.9591' },
  { match: 'CABA', lat: '-34.4587', lng: '-58.9142' },
  { match: 'Buenos Aires', lat: '-34.4587', lng: '-58.9142' },
  { match: 'Pilar', lat: '-34.4587', lng: '-58.9142' },
];

function cloneInitialRoutes(): CorridorRoute[] {
  return CORRIDOR_ROUTES.map((route) => ({
    ...route,
    incident: route.incident ? { ...route.incident } : null,
    privateTelemetry: { ...route.privateTelemetry },
    slots: route.slots.map((slot) => ({ ...slot })),
    checkpoints: route.checkpoints.map((cp) => ({ ...cp })),
  }));
}

function formatSimTime(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm} hs`;
}

function resolveCityCoordinates(cityName: string, fallbackLat: string, fallbackLng: string) {
  const found = CITY_COORDINATES.find((entry) =>
    cityName.toLowerCase().includes(entry.match.toLowerCase())
  );
  return found ? { lat: found.lat, lng: found.lng } : { lat: fallbackLat, lng: fallbackLng };
}

function buildBackhaulRouteConfig(draft: BackhaulDraft): {
  checkpoints: CorridorCheckpoint[];
  dedicatedTruckPriceArs: number;
  co2SavedPerPalletKg: number;
  receiverPlantName: string;
  initialLat: string;
  initialLng: string;
} {
  const originLower = draft.origin.toLowerCase();
  const destLower = draft.destination.toLowerCase();
  const receiverPlantName =
    destLower.includes('polo 52') || destLower.includes('córdoba')
      ? 'Centro Logístico Polo 52'
      : `Planta Receptora ${draft.destination}`;

  if (originLower.includes('caba') || originLower.includes('buenos aires')) {
    return {
      checkpoints: [
        {
          city: draft.origin,
          kmFromOrigin: 0,
          lat: -34.4587,
          lng: -58.9142,
          status: 'current',
          etaLabel: `${draft.departureWindow} - Carga en dársena`,
        },
        {
          city: 'Rosario, Santa Fe',
          kmFromOrigin: 302,
          lat: -32.9442,
          lng: -60.6505,
          status: 'upcoming',
          etaLabel: '+4 h 00 min',
        },
        {
          city: 'Villa María',
          kmFromOrigin: 556,
          lat: -32.4075,
          lng: -63.2402,
          status: 'upcoming',
          etaLabel: '+7 h 15 min',
        },
        {
          city: draft.destination,
          kmFromOrigin: 704,
          lat: -31.4618,
          lng: -64.1135,
          status: 'upcoming',
          etaLabel: '+9 h 10 min - Dársena',
        },
      ],
      dedicatedTruckPriceArs: 1340000,
      co2SavedPerPalletKg: 67.2,
      receiverPlantName,
      initialLat: '-34.4587',
      initialLng: '-58.9142',
    };
  }

  if (originLower.includes('rosario')) {
    return {
      checkpoints: [
        {
          city: draft.origin,
          kmFromOrigin: 0,
          lat: -32.9442,
          lng: -60.6505,
          status: 'current',
          etaLabel: `${draft.departureWindow} - Carga en dársena`,
        },
        {
          city: 'Marcos Juárez',
          kmFromOrigin: 146,
          lat: -32.6978,
          lng: -62.1067,
          status: 'upcoming',
          etaLabel: '+2 h 00 min',
        },
        {
          city: 'Villa María',
          kmFromOrigin: 254,
          lat: -32.4075,
          lng: -63.2402,
          status: 'upcoming',
          etaLabel: '+3 h 25 min',
        },
        {
          city: draft.destination,
          kmFromOrigin: 402,
          lat: -31.4618,
          lng: -64.1135,
          status: 'upcoming',
          etaLabel: '+5 h 15 min - Dársena',
        },
      ],
      dedicatedTruckPriceArs: 890000,
      co2SavedPerPalletKg: 38.4,
      receiverPlantName,
      initialLat: '-32.9442',
      initialLng: '-60.6505',
    };
  }

  if (originLower.includes('jesús maría') || originLower.includes('jesus maria')) {
    return {
      checkpoints: [
        {
          city: draft.origin,
          kmFromOrigin: 0,
          lat: -30.9817,
          lng: -64.0942,
          status: 'current',
          etaLabel: `${draft.departureWindow} - Carga en dársena`,
        },
        {
          city: 'Estación Juárez Celman',
          kmFromOrigin: 25,
          lat: -31.2647,
          lng: -64.1614,
          status: 'upcoming',
          etaLabel: '+0 h 25 min',
        },
        {
          city: 'Circunvalación Córdoba',
          kmFromOrigin: 45,
          lat: -31.3890,
          lng: -64.1420,
          status: 'upcoming',
          etaLabel: '+0 h 45 min',
        },
        {
          city: draft.destination,
          kmFromOrigin: 54,
          lat: -31.4618,
          lng: -64.1135,
          status: 'upcoming',
          etaLabel: '+1 h 00 min - Dársena',
        },
      ],
      dedicatedTruckPriceArs: 360000,
      co2SavedPerPalletKg: 12.6,
      receiverPlantName,
      initialLat: '-30.9817',
      initialLng: '-64.0942',
    };
  }

  return {
    checkpoints: [
      {
        city: draft.origin,
        kmFromOrigin: 0,
        lat: -32.4075,
        lng: -63.2402,
        status: 'current',
        etaLabel: `${draft.departureWindow} - Carga en dársena`,
      },
      {
        city: 'Posta RN 9 Intermedia',
        kmFromOrigin: 160,
        lat: -32.0200,
        lng: -63.6800,
        status: 'upcoming',
        etaLabel: '+2 h 15 min',
      },
      {
        city: 'Circunvalación Córdoba',
        kmFromOrigin: 320,
        lat: -31.3890,
        lng: -64.1420,
        status: 'upcoming',
        etaLabel: '+4 h 20 min',
      },
      {
        city: draft.destination,
        kmFromOrigin: 345,
        lat: -31.4618,
        lng: -64.1135,
        status: 'upcoming',
        etaLabel: '+4 h 45 min - Dársena',
      },
    ],
    dedicatedTruckPriceArs: Math.round(Math.max(360000, draft.pricePerPalletArs * 16)),
    co2SavedPerPalletKg: 34.0,
    receiverPlantName,
    initialLat: '-32.4075',
    initialLng: '-63.2402',
  };
}

function buildBackhaulSlots(availablePallets: number): PalletSlot[] {
  const freeCount = Math.max(1, Math.min(12, Math.round(availablePallets)));
  const occupiedCount = 12 - freeCount;

  const sampleCargos = [
    { cargo: 'Insumos industriales', shipper: 'Metalúrgica Litoral SA', kg: 640 },
    { cargo: 'Envases reciclados', shipper: 'Recuperadora Centro SRL', kg: 520 },
    { cargo: 'Autopartes de reposición', shipper: 'Frenos del Sur SA', kg: 690 },
    { cargo: 'Bobinas de film', shipper: 'Embalajes Pampeanos SA', kg: 580 },
  ];

  const slots: PalletSlot[] = [];
  for (let index = 0; index < 12; index += 1) {
    const slotNumber = index + 1;
    const id = `P-${String(slotNumber).padStart(2, '0')}`;
    const row = index < 6 ? 1 : 2;
    const col = (index % 6) + 1;

    if (index < occupiedCount) {
      const sample = sampleCargos[index % sampleCargos.length];
      slots.push({
        id,
        row,
        col,
        status: 'occupied',
        weightKg: sample.kg,
        volumeM3: 1.5,
        cargoLabel: sample.cargo,
        shipperName: sample.shipper,
        bookingCode: `TRM-${7100 + index * 7}`,
        protectedCargo: index % 2 === 0,
      });
    } else {
      slots.push({
        id,
        row,
        col,
        status: 'available',
        weightKg: 0,
        volumeM3: 0,
      });
    }
  }
  return slots;
}

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [routes, setRoutes] = useState<CorridorRoute[]>(cloneInitialRoutes);
  const [selectedRouteId, setSelectedRouteId] = useState<string>(CORRIDOR_ROUTES[0].id);
  const [activeRole, setActiveRoleState] = useState<UserRole>('shipper');
  const [canvasView, setCanvasView] = useState<CanvasViewMode>('3d');
  const [isAutoSimulating, setIsAutoSimulating] = useState<boolean>(false);
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);
  const [draftPackagingFormat, setDraftPackagingFormat] = useState<PackagingFormat>('pallet');
  const [draftCargoLabel, setDraftCargoLabel] = useState<string>('Autopartes y metalúrgica');
  const [draftPalletWeightKg, setDraftPalletWeightKg] = useState<number>(650);
  const [hasCargoProtection, setHasCargoProtection] = useState<boolean>(false);
  const [events, setEvents] = useState<SimulationEvent[]>(INITIAL_EVENTS);
  const [handoffHint, setHandoffHint] = useState<HandoffHint | null>(null);
  const [activePushNotification, setActivePushNotification] = useState<PushNotificationItem | null>(null);
  const [inspectedSlotId, setInspectedSlotId] = useState<string | null>(null);

  const pushTimerRef = useRef<number | null>(null);

  const dismissPushNotification = useCallback(() => {
    if (pushTimerRef.current) {
      window.clearTimeout(pushTimerRef.current);
      pushTimerRef.current = null;
    }
    setActivePushNotification(null);
  }, []);

  const triggerPush = useCallback(
    (item: Omit<PushNotificationItem, 'id' | 'timeLabel'>) => {
      if (pushTimerRef.current) {
        window.clearTimeout(pushTimerRef.current);
      }
      const newItem: PushNotificationItem = {
        ...item,
        id: `push-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timeLabel: 'Ahora',
      };
      setActivePushNotification(newItem);
      pushTimerRef.current = window.setTimeout(() => {
        setActivePushNotification(null);
        pushTimerRef.current = null;
      }, 5500);
    },
    []
  );

  const bookingCounterRef = useRef<number>(0);
  const backhaulCounterRef = useRef<number>(0);
  const incidentCounterRef = useRef<number>(0);
  const customRouteCounterRef = useRef<number>(0);
  const eventCounterRef = useRef<number>(10);
  const preIncidentStatusRef = useRef<Record<string, 'in_transit' | 'near_dock'>>({});

  const activeRoute = useMemo(
    () => routes.find((route) => route.id === selectedRouteId) ?? routes[0],
    [routes, selectedRouteId]
  );

  const appendEvent = useCallback((actor: UserRole, routeCode: string, summary: string) => {
    eventCounterRef.current += 1;
    const nextEvent: SimulationEvent = {
      id: `evt-${eventCounterRef.current}`,
      timeLabel: formatSimTime(),
      actor,
      routeCode,
      summary,
    };
    setEvents((prev) => [nextEvent, ...prev]);
  }, []);

  const setActiveRole = useCallback(
    (role: UserRole) => {
      setActiveRoleState(role);
      setInspectedSlotId(null);
      if (role === 'carrier') {
        if (
          activeRoute.tripStatus === 'in_transit' ||
          activeRoute.tripStatus === 'near_dock' ||
          activeRoute.tripStatus === 'incident'
        ) {
          setCanvasView('map');
        }
      } else if (role === 'shipper') {
        setCanvasView(activeRoute.tripStatus === 'docked' ? '3d' : 'map');
      } else if (role === 'receiver') {
        setCanvasView(
          activeRoute.tripStatus === 'near_dock' ||
            activeRoute.tripStatus === 'in_transit' ||
            activeRoute.tripStatus === 'arrived'
            ? 'map'
            : '3d'
        );
      }
    },
    [activeRoute.tripStatus]
  );

  const selectRoute = useCallback(
    (routeIdOrCode: string) => {
      const target = routes.find(
        (route) => route.id === routeIdOrCode || route.code === routeIdOrCode
      );
      if (!target) {
        return;
      }
      if (target.id !== selectedRouteId) {
        setSelectedRouteId(target.id);
        setSelectedSlotIds([]);
        setInspectedSlotId(null);
        setIsAutoSimulating(false);
        if (target.tripStatus === 'docked') {
          setCanvasView('3d');
        } else {
          setCanvasView('map');
        }
      }
    },
    [routes, selectedRouteId]
  );

  const toggleDraftSlot = useCallback(
    (slotId: string) => {
      if (activeRoute.tripStatus !== 'docked') {
        return;
      }
      const slot = activeRoute.slots.find((item) => item.id === slotId);
      if (!slot || slot.status !== 'available') {
        return;
      }
      setSelectedSlotIds((prev) =>
        prev.includes(slotId) ? prev.filter((id) => id !== slotId) : [...prev, slotId]
      );
    },
    [activeRoute]
  );

  const applyPalletQuantityPreset = useCallback(
    (count: number) => {
      if (activeRoute.tripStatus !== 'docked') {
        setSelectedSlotIds([]);
        return;
      }
      const availableIds = activeRoute.slots
        .filter((slot) => slot.status === 'available')
        .map((slot) => slot.id);
      const clampedCount = Math.max(0, Math.min(count, availableIds.length));

      if (clampedCount === 0) {
        setSelectedSlotIds([]);
        return;
      }

      setSelectedSlotIds((prev) => {
        const validPrev = prev.filter((id) => availableIds.includes(id));
        if (validPrev.length >= clampedCount) {
          return validPrev.slice(0, clampedCount);
        }
        const remaining = availableIds.filter((id) => !validPrev.includes(id));
        return [...validPrev, ...remaining.slice(0, clampedCount - validPrev.length)];
      });
    },
    [activeRoute]
  );

  const setDraftCargo = useCallback((label: string, weightKg: number) => {
    setDraftCargoLabel(label.trim() || 'Envases PET');
    const safeWeight = Math.max(100, Math.min(1200, Math.round(weightKg)));
    setDraftPalletWeightKg(safeWeight);
  }, []);

  const confirmShipperBooking = useCallback((): string | null => {
    if (activeRoute.tripStatus !== 'docked') {
      return null;
    }

    const availableIdSet = new Set(
      activeRoute.slots.filter((slot) => slot.status === 'available').map((slot) => slot.id)
    );
    const validSelectedIds = selectedSlotIds.filter((id) => availableIdSet.has(id));
    if (validSelectedIds.length === 0) {
      return null;
    }

    const bookingCode = `TRM-${9042 + bookingCounterRef.current * 17}`;
    bookingCounterRef.current += 1;

    const validSet = new Set(validSelectedIds);
    const bookedCount = validSelectedIds.length;
    const bookedCargo = draftCargoLabel;
    const bookedFormat = draftPackagingFormat;
    const bookedWeight = draftPalletWeightKg;
    const bookedProtection = hasCargoProtection;
    const targetRouteId = activeRoute.id;
    const targetRouteCode = activeRoute.code;

    setRoutes((prev) =>
      prev.map((route) => {
        if (route.id !== targetRouteId) {
          return route;
        }
        return {
          ...route,
          slots: route.slots.map((slot) =>
            validSet.has(slot.id)
              ? {
                  ...slot,
                  status: 'user_booked',
                  weightKg: bookedWeight,
                  volumeM3: 1.6,
                  packagingFormat: bookedFormat,
                  cargoLabel: bookedCargo,
                  shipperName: 'Plásticos Polo 52 SA',
                  bookingCode,
                  protectedCargo: bookedProtection,
                }
              : slot
          ),
        };
      })
    );

    setSelectedSlotIds([]);
    appendEvent(
      'shipper',
      targetRouteCode,
      `Plásticos Polo 52 SA reservó ${bookedCount} ${
        bookedCount === 1 ? 'módulo' : 'módulos'
      } (${bookedFormat}: ${bookedCargo}) - ${bookingCode}.`
    );
    triggerPush({
      targetRole: 'carrier',
      title: '¡Nueva carga asignada en tu ruta!',
      body: `Plásticos Polo 52 SA sumó ${bookedCount} mód. de ${bookedCargo} (+$ ${(bookedCount * activeRoute.pricePerPalletArs).toLocaleString('es-AR')}).`,
      badgeLabel: bookingCode,
      actionLabel: 'Ver en chofer',
    });
    setHandoffHint({
      targetRole: 'carrier',
      routeId: targetRouteId,
      message: `Reserva ${bookingCode} confirmada en ${targetRouteCode}. Podés simular el precintado y salida como Transportista.`,
      ctaLabel: 'Ir a Transportista',
    });

    return bookingCode;
  }, [
    activeRoute,
    appendEvent,
    triggerPush,
    draftCargoLabel,
    draftPackagingFormat,
    draftPalletWeightKg,
    hasCargoProtection,
    selectedSlotIds,
  ]);

  const publishBackhaulRoute = useCallback(
    (draft: BackhaulDraft): string => {
      const code = `RN9-RET-${4821 + backhaulCounterRef.current * 13}`;
      backhaulCounterRef.current += 1;
      const newId = code.toLowerCase();
      const freePallets = Math.max(1, Math.min(12, Math.round(draft.availablePallets)));
      const config = buildBackhaulRouteConfig(draft);

      const newRoute: CorridorRoute = {
        id: newId,
        code,
        origin: draft.origin.trim() || 'Rosario, Santa Fe',
        destination: draft.destination.trim() || 'Polo 52, Córdoba',
        receiverPlantName: config.receiverPlantName,
        departureLabel: draft.departureWindow.trim() || 'Hoy, 20:00 hs',
        vehicleLabel: draft.vehicleLabel.trim() || 'Semirremolque Sider 12 pallets',
        carrierName: 'Expreso Ruta Sur SA',
        isBackhaul: true,
        tripStatus: 'docked',
        pricePerPalletArs: Math.max(15000, Math.round(draft.pricePerPalletArs)),
        dedicatedTruckPriceArs: config.dedicatedTruckPriceArs,
        co2SavedPerPalletKg: config.co2SavedPerPalletKg,
        assignedDock: null,
        sealPhotoVerified: false,
        incident: null,
        privateTelemetry: {
          lat: config.initialLat,
          lng: config.initialLng,
          speedKmh: 0,
          driverName: 'Diego Ferreyra',
          driverLicense: 'LINTI Cargas Generales #503118',
          unionAgreement: 'CCT 40/89 - Sindicato al día',
          routeVerified: true,
        },
        slots: buildBackhaulSlots(freePallets),
        checkpoints: config.checkpoints,
      };

      setRoutes((prev) => [newRoute, ...prev]);
      setSelectedRouteId(newId);
      setSelectedSlotIds([]);
      setInspectedSlotId(null);

      appendEvent(
        'carrier',
        code,
        `Retorno vacío publicado desde ${newRoute.origin} hacia ${newRoute.destination} (${freePallets} pallets libres).`
      );
      setHandoffHint({
        targetRole: 'shipper',
        routeId: newId,
        message: `Retorno ${code} disponible con ${freePallets} pallets libres. Reservá espacio como Dador PyME.`,
        ctaLabel: 'Reservar como Dador PyME',
      });

      return code;
    },
    [appendEvent]
  );

  const createCustomRoute = useCallback(
    async (input: CustomRouteInput): Promise<string> => {
      customRouteCounterRef.current += 1;
      const code = `RN-USR-${100 + customRouteCounterRef.current}`;
      const newId = code.toLowerCase();

      const waypoints = [
        { lat: input.originLat, lng: input.originLng },
        { lat: input.destinationLat, lng: input.destinationLng },
      ];

      const roadData = await fetchRealRoadRoute(waypoints);
      const distKm = roadData.distanceKm > 0 ? roadData.distanceKm : 350;
      const pricePerPallet = input.pricePerPalletArs ?? Math.max(18000, Math.round(distKm * 115));
      const dedicatedPrice = Math.round(pricePerPallet * 15);
      const co2SavedPerPallet = Math.round(distKm * 0.095 * 10) / 10;

      const checkpoints: CorridorCheckpoint[] = [
        {
          city: input.originName,
          kmFromOrigin: 0,
          lat: input.originLat,
          lng: input.originLng,
          status: 'current',
          etaLabel: 'Salida en dársena',
        },
        {
          city: input.destinationName,
          kmFromOrigin: distKm,
          lat: input.destinationLat,
          lng: input.destinationLng,
          status: 'upcoming',
          etaLabel: `+${Math.round(roadData.durationMinutes / 60)}h ${roadData.durationMinutes % 60}m`,
        },
      ];

      const newRoute: CorridorRoute = {
        id: newId,
        code,
        origin: input.originName,
        destination: input.destinationName,
        receiverPlantName: `Planta Destino (${input.destinationName.split(',')[0]})`,
        departureLabel: 'Hoy, a coordinar',
        vehicleLabel: 'Semirremolque Sider 12 módulos',
        carrierName: input.carrierName?.trim() || 'Logística Federal Conectada',
        isBackhaul: false,
        tripStatus: 'docked',
        pricePerPalletArs: pricePerPallet,
        dedicatedTruckPriceArs: dedicatedPrice,
        co2SavedPerPalletKg: co2SavedPerPallet,
        assignedDock: null,
        sealPhotoVerified: false,
        incident: null,
        privateTelemetry: {
          lat: String(input.originLat),
          lng: String(input.originLng),
          speedKmh: 0,
          driverName: 'Conductor Asignado',
          driverLicense: 'LINTI Cargas Generales #882190',
          unionAgreement: 'CCT 40/89 - Sindicato al día',
          routeVerified: true,
        },
        slots: buildBackhaulSlots(8), // 8 free slots
        checkpoints,
        routeGeometry: roadData.geometry,
        distanceKm: distKm,
      };

      setRoutes((prev) => [newRoute, ...prev]);
      setSelectedRouteId(newId);
      setSelectedSlotIds([]);
      setInspectedSlotId(null);
      setCanvasView('map');

      appendEvent(
        'carrier',
        code,
        `Nueva ruta real configurada: ${input.originName.split(',')[0]} -> ${input.destinationName.split(',')[0]} (${distKm} km reales).`
      );

      return code;
    },
    [appendEvent]
  );

  const startRouteTrip = useCallback(
    (routeId: string) => {
      const target = routes.find((route) => route.id === routeId);
      if (!target || target.tripStatus !== 'docked') {
        return;
      }

      const nextCity = target.checkpoints[1]?.city ?? target.checkpoints[0]?.city ?? target.origin;
      const coords = resolveCityCoordinates(
        nextCity,
        target.privateTelemetry.lat,
        target.privateTelemetry.lng
      );

      setRoutes((prev) =>
        prev.map((route) => {
          if (route.id !== routeId) {
            return route;
          }
          return {
            ...route,
            tripStatus: 'in_transit',
            sealPhotoVerified: true,
            incident: null,
            privateTelemetry: {
              ...route.privateTelemetry,
              lat: coords.lat,
              lng: coords.lng,
              speedKmh: 82,
            },
            checkpoints: route.checkpoints.map((cp, idx) => {
              if (idx === 0) {
                return { ...cp, status: 'passed' };
              }
              if (idx === 1) {
                return { ...cp, status: 'current' };
              }
              return { ...cp, status: 'upcoming' };
            }),
          };
        })
      );

      if (selectedRouteId === routeId) {
        setSelectedSlotIds([]);
        setCanvasView('map');
      }

      setHandoffHint((prev) =>
        prev && prev.routeId === routeId && prev.targetRole === 'carrier' ? null : prev
      );

      appendEvent(
        'carrier',
        target.code,
        `Estiba precintada en origen y salida a ruta (${target.carrierName}).`
      );
      triggerPush({
        targetRole: 'shipper',
        title: 'Camión en camino hacia destino',
        body: `Salida de dársena precintada. Próximo checkpoint: ${nextCity.split(',')[0]}.`,
        badgeLabel: target.code,
        actionLabel: 'Ver ruta',
      });
    },
    [appendEvent, triggerPush, routes, selectedRouteId]
  );

  const advanceNextCheckpoint = useCallback(
    (routeId: string) => {
      const target = routes.find((route) => route.id === routeId);
      if (
        !target ||
        target.tripStatus === 'docked' ||
        target.tripStatus === 'incident' ||
        target.tripStatus === 'arrived' ||
        target.tripStatus === 'delivered'
      ) {
        return;
      }

      const checkpoints = target.checkpoints;
      if (checkpoints.length === 0) {
        return;
      }

      const lastIdx = checkpoints.length - 1;
      const foundCurrent = checkpoints.findIndex((cp) => cp.status === 'current');
      const currentIdx = foundCurrent >= 0 ? foundCurrent : 0;

      if (target.tripStatus === 'near_dock') {
        const destCity = checkpoints[lastIdx].city;
        const coords = resolveCityCoordinates(
          destCity,
          target.privateTelemetry.lat,
          target.privateTelemetry.lng
        );

        setRoutes((prev) =>
          prev.map((route) => {
            if (route.id !== routeId) {
              return route;
            }
            return {
              ...route,
              tripStatus: 'arrived',
              privateTelemetry: {
                ...route.privateTelemetry,
                lat: coords.lat,
                lng: coords.lng,
                speedKmh: 0,
              },
              checkpoints: route.checkpoints.map((cp, idx) => ({
                ...cp,
                status: idx === lastIdx ? 'current' : 'passed',
              })),
            };
          })
        );

        appendEvent(
          'carrier',
          target.code,
          `Unidad arribó a dársena destino en ${target.receiverPlantName}.`
        );
        setHandoffHint({
          targetRole: 'receiver',
          routeId,
          message: `${target.code} arribó a ${target.receiverPlantName}. Confirmá dársena y descarga.`,
          ctaLabel: 'Ir a Planta Receptora',
        });
        return;
      }

      const nextIdx = Math.min(currentIdx + 1, lastIdx);

      // On short corridors where nextIdx jumps straight to final city, enter <10 km window first
      if (nextIdx >= lastIdx) {
        const approachCity = checkpoints[currentIdx]?.city ?? target.destination;
        const coords = resolveCityCoordinates(
          approachCity,
          target.privateTelemetry.lat,
          target.privateTelemetry.lng
        );

        setRoutes((prev) =>
          prev.map((route) => {
            if (route.id !== routeId) {
              return route;
            }
            return {
              ...route,
              tripStatus: 'near_dock',
              privateTelemetry: {
                ...route.privateTelemetry,
                lat: coords.lat,
                lng: coords.lng,
                speedKmh: 48,
              },
            };
          })
        );

        appendEvent(
          'carrier',
          target.code,
          `Unidad en radio próximo (<10 km) de ${target.receiverPlantName}.`
        );
        setHandoffHint({
          targetRole: 'receiver',
          routeId,
          message: `${target.code} ingresó al radio <10 km de ${target.receiverPlantName}. Preparar dársena.`,
          ctaLabel: 'Preparar en Planta Receptora',
        });
        return;
      }

      const enteringPenultimate = nextIdx === lastIdx - 1;
      const nextStatus: TripStatus = enteringPenultimate ? 'near_dock' : 'in_transit';
      const nextCity = checkpoints[nextIdx].city;
      const coords = resolveCityCoordinates(
        nextCity,
        target.privateTelemetry.lat,
        target.privateTelemetry.lng
      );

      setRoutes((prev) =>
        prev.map((route) => {
          if (route.id !== routeId) {
            return route;
          }
          return {
            ...route,
            tripStatus: nextStatus,
            privateTelemetry: {
              ...route.privateTelemetry,
              lat: coords.lat,
              lng: coords.lng,
              speedKmh: enteringPenultimate ? 62 : 84,
            },
            checkpoints: route.checkpoints.map((cp, idx) => {
              if (idx < nextIdx) {
                return { ...cp, status: 'passed' };
              }
              if (idx === nextIdx) {
                return { ...cp, status: 'current' };
              }
              return { ...cp, status: 'upcoming' };
            }),
          };
        })
      );

      if (enteringPenultimate) {
        appendEvent(
          'carrier',
          target.code,
          `Unidad pasando por ${nextCity} (<10 km de aproximación) - notificada Planta Receptora.`
        );
        setHandoffHint({
          targetRole: 'receiver',
          routeId,
          message: `${target.code} ingresó en aproximación (<10 km) hacia ${target.receiverPlantName}. Prepará dársena.`,
          ctaLabel: 'Preparar en Planta Receptora',
        });
      } else {
        appendEvent(
          'carrier',
          target.code,
          `Unidad pasando por ${nextCity} (km ${checkpoints[nextIdx].kmFromOrigin}).`
        );
      }
    },
    [appendEvent, routes]
  );

  const reportRoadIncident = useCallback(
    (routeId: string, draft: IncidentDraft) => {
      const target = routes.find((route) => route.id === routeId);
      if (!target || target.tripStatus === 'arrived' || target.tripStatus === 'delivered') {
        return;
      }

      preIncidentStatusRef.current[routeId] =
        target.tripStatus === 'near_dock' ? 'near_dock' : 'in_transit';

      incidentCounterRef.current += 1;
      const incident: RoadIncident = {
        id: `INC-${300 + incidentCounterRef.current}`,
        title: draft.title.trim() || 'Corte operativo en calzada',
        kmLocation: draft.kmLocation.trim() || 'RN 9 km 214',
        delayMinutes: Math.max(5, Math.round(draft.delayMinutes || 35)),
        photoUrl: '/images/incident-road-block.jpg',
        reportedAtLabel: formatSimTime(),
        relayRequested: draft.requestRelay,
        ...(draft.requestRelay
          ? { relayCarrierName: 'Logística Norte Cordobés SRL - Relevo 25 min' }
          : {}),
      };

      setRoutes((prev) =>
        prev.map((route) => {
          if (route.id !== routeId) {
            return route;
          }
          return {
            ...route,
            tripStatus: 'incident',
            incident,
            privateTelemetry: {
              ...route.privateTelemetry,
              speedKmh: 0,
            },
          };
        })
      );

      appendEvent(
        'carrier',
        target.code,
        `Alerta vial con foto: ${incident.title} en ${incident.kmLocation} (+${incident.delayMinutes} min).`
      );
      triggerPush({
        targetRole: 'shipper',
        title: 'Alerta de corte en ruta con foto',
        body: `${incident.kmLocation}: demora de +${incident.delayMinutes} min reportada por conductor con evidencia.`,
        badgeLabel: 'Desvío en curso',
        actionLabel: 'Ver evidencia',
      });
    },
    [appendEvent, triggerPush, routes]
  );

  const resolveRoadIncident = useCallback(
    (routeId: string) => {
      const target = routes.find((route) => route.id === routeId);
      if (!target || target.tripStatus !== 'incident') {
        return;
      }

      const currentIdx = target.checkpoints.findIndex((cp) => cp.status === 'current');
      const fallbackStatus: 'in_transit' | 'near_dock' =
        currentIdx >= target.checkpoints.length - 2 ? 'near_dock' : 'in_transit';
      const restoredStatus = preIncidentStatusRef.current[routeId] ?? fallbackStatus;
      delete preIncidentStatusRef.current[routeId];

      setRoutes((prev) =>
        prev.map((route) => {
          if (route.id !== routeId) {
            return route;
          }
          return {
            ...route,
            tripStatus: restoredStatus,
            incident: null,
            privateTelemetry: {
              ...route.privateTelemetry,
              speedKmh: restoredStatus === 'near_dock' ? 62 : 82,
            },
          };
        })
      );

      appendEvent(
        'carrier',
        target.code,
        `Tránsito reanudado en ${target.code} tras normalizar calzada.`
      );
    },
    [appendEvent, routes]
  );

  const assignReceivingDock = useCallback(
    (routeId: string, dockName: string) => {
      const target = routes.find((route) => route.id === routeId);
      const cleanDock = dockName.trim();
      if (!target || !cleanDock) {
        return;
      }

      setRoutes((prev) =>
        prev.map((route) => {
          if (route.id !== routeId) {
            return route;
          }
          return {
            ...route,
            assignedDock: cleanDock,
          };
        })
      );

      appendEvent(
        'receiver',
        target.code,
        `${target.receiverPlantName} asignó ${cleanDock} para recepción.`
      );
      triggerPush({
        targetRole: 'carrier',
        title: `Dársena asignada: ${cleanDock}`,
        body: `${target.receiverPlantName} preparó descarga en ${cleanDock}. Podés ingresar al arribar.`,
        badgeLabel: cleanDock,
        actionLabel: 'Ver chofer',
      });
    },
    [appendEvent, triggerPush, routes]
  );

  const confirmDeliveryUnload = useCallback(
    (routeId: string) => {
      const target = routes.find((route) => route.id === routeId);
      if (!target) {
        return;
      }

      const finalDock = target.assignedDock ?? 'Dársena 1';
      const destCity =
        target.checkpoints[target.checkpoints.length - 1]?.city ?? target.destination;
      const coords = resolveCityCoordinates(
        destCity,
        target.privateTelemetry.lat,
        target.privateTelemetry.lng
      );

      setRoutes((prev) =>
        prev.map((route) => {
          if (route.id !== routeId) {
            return route;
          }
          return {
            ...route,
            tripStatus: 'delivered',
            sealPhotoVerified: true,
            incident: null,
            assignedDock: finalDock,
            privateTelemetry: {
              ...route.privateTelemetry,
              lat: coords.lat,
              lng: coords.lng,
              speedKmh: 0,
            },
            checkpoints: route.checkpoints.map((cp) => ({
              ...cp,
              status: 'passed',
            })),
          };
        })
      );

      setHandoffHint((prev) => (prev && prev.routeId === routeId ? null : prev));
      appendEvent(
        'receiver',
        target.code,
        `Descarga y conformidad registrada en ${target.receiverPlantName} (${finalDock}).`
      );
      triggerPush({
        targetRole: 'shipper',
        title: '¡Carga entregada en destino!',
        body: `Descarga finalizada en ${target.receiverPlantName} (${finalDock}). Certificado de huella disponible.`,
        badgeLabel: 'Entregado',
        actionLabel: 'Ver remito',
      });
    },
    [appendEvent, triggerPush, routes]
  );

  const triggerNearDockAlert = useCallback(
    (routeId: string) => {
      const target = routes.find((route) => route.id === routeId);
      if (!target) return;

      const lastIdx = target.checkpoints.length - 1;
      const approachCity = target.checkpoints[lastIdx - 1]?.city ?? target.destination;
      const coords = resolveCityCoordinates(
        approachCity,
        target.privateTelemetry.lat,
        target.privateTelemetry.lng
      );

      setRoutes((prev) =>
        prev.map((route) => {
          if (route.id !== routeId) return route;
          return {
            ...route,
            tripStatus: 'near_dock',
            privateTelemetry: {
              ...route.privateTelemetry,
              lat: coords.lat,
              lng: coords.lng,
              speedKmh: 42,
            },
          };
        })
      );

      appendEvent(
        'carrier',
        target.code,
        `Chofer activó botón "Próximo (<10 km)" rumbo a ${target.receiverPlantName}.`
      );

      triggerPush({
        targetRole: 'receiver',
        title: '¡Unidad a menos de 10 km!',
        body: `${target.code} (${target.carrierName}) ingresó a geocerca de aproximación. Preparar rampa de descarga.`,
        badgeLabel: '<10 km',
        actionLabel: 'Asignar rampa',
      });
    },
    [appendEvent, triggerPush, routes]
  );

  const toggleAutoSimulation = useCallback(() => {
    setIsAutoSimulating((prev) => !prev);
  }, []);

  useEffect(() => {
    if (!isAutoSimulating) {
      return;
    }
    if (
      activeRoute.tripStatus !== 'in_transit' &&
      activeRoute.tripStatus !== 'near_dock'
    ) {
      setIsAutoSimulating(false);
      return;
    }

    const timer = window.setTimeout(() => {
      advanceNextCheckpoint(activeRoute.id);
    }, 2400);

    return () => window.clearTimeout(timer);
  }, [
    isAutoSimulating,
    activeRoute.id,
    activeRoute.tripStatus,
    activeRoute.checkpoints,
    advanceNextCheckpoint,
  ]);

  const dismissHandoffHint = useCallback(() => {
    setHandoffHint(null);
  }, []);

  const resetSimulation = useCallback(() => {
    bookingCounterRef.current = 0;
    backhaulCounterRef.current = 0;
    incidentCounterRef.current = 0;
    eventCounterRef.current = 10;
    preIncidentStatusRef.current = {};
    setRoutes(cloneInitialRoutes());
    setSelectedRouteId(CORRIDOR_ROUTES[0].id);
    setActiveRoleState('shipper');
    setCanvasView('3d');
    setIsAutoSimulating(false);
    setSelectedSlotIds([]);
    setDraftCargoLabel('Envases PET');
    setDraftPalletWeightKg(650);
    setHasCargoProtection(false);
    setEvents(INITIAL_EVENTS);
    setHandoffHint(null);
    setInspectedSlotId(null);
  }, []);

  const pilotStats = useMemo<PilotStats>(() => {
    let totalBookedPallets = 0;
    let totalCapacity = 0;
    let totalSavingsArs = 0;
    let totalCo2SavedKg = 0;
    let activeAlertsCount = 0;

    for (const route of routes) {
      const filledCount = route.slots.filter(
        (slot) => slot.status === 'occupied' || slot.status === 'user_booked'
      ).length;
      totalBookedPallets += filledCount;
      totalCapacity += route.slots.length;
      // Savings compared to hiring traditional partial/dedicated freight (~34.8% reduction on Tramo)
      totalSavingsArs += filledCount * Math.round(route.pricePerPalletArs * 0.534);
      totalCo2SavedKg += filledCount * route.co2SavedPerPalletKg;
      if (route.tripStatus === 'incident' || route.tripStatus === 'near_dock') {
        activeAlertsCount += 1;
      }
    }

    const avgOccupancyPct =
      totalCapacity > 0 ? Math.round((totalBookedPallets / totalCapacity) * 100) : 0;
    const roundedCo2 = Math.round(totalCo2SavedKg * 10) / 10;

    return {
      totalBookedPallets,
      totalSavingsArs,
      totalCo2SavedKg: roundedCo2,
      totalDieselSavedLiters: co2ToDieselLiters(roundedCo2),
      avgOccupancyPct,
      activeAlertsCount,
    };
  }, [routes]);

  const value = useMemo<SimulationContextValue>(
    () => ({
      routes,
      activeRoute,
      selectedRouteId,
      activeRole,
      canvasView,
      isAutoSimulating,
      selectedSlotIds,
      draftPackagingFormat,
      draftCargoLabel,
      draftPalletWeightKg,
      hasCargoProtection,
      events,
      handoffHint,
      activePushNotification,
      dismissPushNotification,
      triggerNearDockAlert,
      inspectedSlotId,
      pilotStats,
      setActiveRole,
      setCanvasView,
      toggleAutoSimulation,
      selectRoute,
      setInspectedSlotId,
      toggleDraftSlot,
      applyPalletQuantityPreset,
      setDraftPackagingFormat,
      setDraftCargo,
      setHasCargoProtection,
      confirmShipperBooking,
      publishBackhaulRoute,
      createCustomRoute,
      startRouteTrip,
      advanceNextCheckpoint,
      reportRoadIncident,
      resolveRoadIncident,
      assignReceivingDock,
      confirmDeliveryUnload,
      dismissHandoffHint,
      resetSimulation,
    }),
    [
      routes,
      activeRoute,
      selectedRouteId,
      activeRole,
      canvasView,
      isAutoSimulating,
      selectedSlotIds,
      draftPackagingFormat,
      draftCargoLabel,
      draftPalletWeightKg,
      hasCargoProtection,
      events,
      handoffHint,
      activePushNotification,
      dismissPushNotification,
      triggerNearDockAlert,
      inspectedSlotId,
      pilotStats,
      setActiveRole,
      toggleAutoSimulation,
      selectRoute,
      toggleDraftSlot,
      applyPalletQuantityPreset,
      setDraftCargo,
      confirmShipperBooking,
      publishBackhaulRoute,
      startRouteTrip,
      advanceNextCheckpoint,
      reportRoadIncident,
      resolveRoadIncident,
      assignReceivingDock,
      confirmDeliveryUnload,
      dismissHandoffHint,
      resetSimulation,
    ]
  );

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
}

export function useSimulation(): SimulationContextValue {
  const ctx = useContext(SimulationContext);
  if (!ctx) {
    throw new Error('useSimulation debe utilizarse dentro de SimulationProvider');
  }
  return ctx;
}
