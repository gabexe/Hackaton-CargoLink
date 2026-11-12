export type UserRole = 'shipper' | 'carrier' | 'receiver';
export type ThemeMode = 'light' | 'dark';
export type CanvasViewMode = '3d' | 'map';
export type CameraPreset = 'isometric' | 'side' | 'top';
export type TripStatus =
  | 'docked'
  | 'in_transit'
  | 'near_dock'
  | 'incident'
  | 'arrived'
  | 'delivered';

export interface PalletSlot {
  id: string;
  row: number;
  col: number;
  status: 'available' | 'occupied' | 'user_booked';
  weightKg: number;
  volumeM3: number;
  cargoLabel?: string;
  shipperName?: string;
  bookingCode?: string;
  protectedCargo?: boolean;
}

export interface CorridorCheckpoint {
  city: string;
  kmFromOrigin: number;
  lat: number;
  lng: number;
  status: 'passed' | 'current' | 'upcoming';
  etaLabel: string;
}

export interface RoadIncident {
  id: string;
  title: string;
  kmLocation: string;
  delayMinutes: number;
  photoUrl: string;
  reportedAtLabel: string;
  relayRequested: boolean;
  relayCarrierName?: string;
}

export interface PrivateTelemetry {
  lat: string;
  lng: string;
  speedKmh: number;
  driverName: string;
  driverLicense: string;
  unionAgreement: string;
  routeVerified: boolean;
}

export interface CorridorRoute {
  id: string;
  code: string;
  origin: string;
  destination: string;
  receiverPlantName: string;
  departureLabel: string;
  vehicleLabel: string;
  carrierName: string;
  isBackhaul: boolean;
  tripStatus: TripStatus;
  pricePerPalletArs: number;
  dedicatedTruckPriceArs: number;
  co2SavedPerPalletKg: number;
  assignedDock: string | null;
  sealPhotoVerified: boolean;
  incident: RoadIncident | null;
  privateTelemetry: PrivateTelemetry;
  slots: PalletSlot[];
  checkpoints: CorridorCheckpoint[];
}

export interface CarbonEstimate {
  palletsCount: number;
  distanceKm: number;
  co2SavedKg: number;
  exclusiveCo2Kg: number;
  sharedCo2Kg: number;
  dieselSavedLiters: number;
  reductionPct: number;
}

export interface SimulationEvent {
  id: string;
  timeLabel: string;
  actor: UserRole;
  routeCode: string;
  summary: string;
}

export interface HandoffHint {
  targetRole: UserRole;
  routeId: string;
  message: string;
  ctaLabel: string;
}

export interface BackhaulDraft {
  origin: string;
  destination: string;
  vehicleLabel: string;
  availablePallets: number;
  departureWindow: string;
  pricePerPalletArs: number;
}

export interface IncidentDraft {
  title: string;
  kmLocation: string;
  delayMinutes: number;
  requestRelay: boolean;
}

export interface PilotStats {
  totalBookedPallets: number;
  totalSavingsArs: number;
  totalCo2SavedKg: number;
  totalDieselSavedLiters: number;
  avgOccupancyPct: number;
  activeAlertsCount: number;
}
