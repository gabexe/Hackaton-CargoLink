import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Camera,
  CheckCircle,
  Clock,
  IdentificationCard,
  LockSimple,
  MapPin,
  Minus,
  NavigationArrow,
  Package,
  Plus,
  Truck,
  User,
  Warehouse,
  Warning,
} from '@phosphor-icons/react';
import { useSimulation } from '../context/SimulationContext';
import type { PalletSlot } from '../types/logistics';

type CarrierTab = 'control' | 'publish';

const INCIDENT_TYPES = [
  'Corte por piquete',
  'Desvío por obra vial',
  'Demora operativa',
] as const;

const BACKHAUL_ORIGINS = [
  { label: 'Rosario, Santa Fe', suggestedArs: 36500 },
  { label: 'CABA / Zona Norte', suggestedArs: 48000 },
  { label: 'Jesús María, Córdoba', suggestedArs: 19800 },
] as const;

const DEPARTURE_WINDOWS = [
  'Hoy, 20:00 hs',
  'Mañana, 07:30 hs',
  'Mañana, 14:00 hs',
] as const;

function formatArs(amount: number): string {
  return `$ ${Math.round(amount).toLocaleString('es-AR')}`;
}

function formatKg(kg: number): string {
  return `${Math.round(kg).toLocaleString('es-AR')} kg`;
}

interface ManifestEntry {
  key: string;
  shipperName: string;
  bookingCode: string;
  cargoLabel: string;
  slotIds: string[];
  totalKg: number;
  isUserBooked: boolean;
}

function buildManifest(slots: PalletSlot[]): ManifestEntry[] {
  const map = new Map<string, ManifestEntry>();
  for (const slot of slots) {
    if (slot.status === 'available') {
      continue;
    }
    const bookingCode = slot.bookingCode ?? slot.id;
    const shipperName = slot.shipperName ?? 'Dador verificado';
    const key = `${bookingCode}::${shipperName}`;
    const existing = map.get(key);
    if (existing) {
      existing.slotIds.push(slot.id);
      existing.totalKg += slot.weightKg;
      existing.isUserBooked = existing.isUserBooked || slot.status === 'user_booked';
    } else {
      map.set(key, {
        key,
        shipperName,
        bookingCode,
        cargoLabel: slot.cargoLabel ?? 'Carga general',
        slotIds: [slot.id],
        totalKg: slot.weightKg,
        isUserBooked: slot.status === 'user_booked',
      });
    }
  }
  // Show user_booked PyME entries first for quick verification
  return Array.from(map.values()).sort((a, b) => Number(b.isUserBooked) - Number(a.isUserBooked));
}

export function CarrierPanel() {
  const {
    routes,
    activeRoute,
    selectRoute,
    setActiveRole,
    setInspectedSlotId,
    startRouteTrip,
    advanceNextCheckpoint,
    reportRoadIncident,
    resolveRoadIncident,
    publishBackhaulRoute,
  } = useSimulation();

  const [activeTab, setActiveTab] = useState<CarrierTab>('control');

  // Incident inline form state
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [incidentTitle, setIncidentTitle] = useState<string>(INCIDENT_TYPES[0]);
  const [incidentKm, setIncidentKm] = useState<string>('RN 9 km 214');
  const [incidentDelay, setIncidentDelay] = useState<number>(35);
  const [requestRelay, setRequestRelay] = useState<boolean>(false);

  // Backhaul publishing form state
  const [backhaulOrigin, setBackhaulOrigin] = useState<string>(BACKHAUL_ORIGINS[0].label);
  const [backhaulPallets, setBackhaulPallets] = useState<number>(6);
  const [backhaulWindow, setBackhaulWindow] = useState<string>(DEPARTURE_WINDOWS[0]);
  const [backhaulPrice, setBackhaulPrice] = useState<number>(BACKHAUL_ORIGINS[0].suggestedArs);
  const [publishedCode, setPublishedCode] = useState<string | null>(null);

  useEffect(() => {
    setShowIncidentForm(false);
  }, [activeRoute.id, activeRoute.tripStatus]);

  useEffect(() => {
    if (publishedCode && activeRoute.code !== publishedCode) {
      setPublishedCode(null);
    }
  }, [activeRoute.code, publishedCode]);

  const manifest = buildManifest(activeRoute.slots);
  const occupiedPalletsCount = activeRoute.slots.filter((s) => s.status !== 'available').length;
  const totalCargoKg = activeRoute.slots.reduce((sum, slot) => sum + slot.weightKg, 0);
  const currentCheckpoint =
    activeRoute.checkpoints.find((cp) => cp.status === 'current') ??
    activeRoute.checkpoints[activeRoute.checkpoints.length - 1];
  const nextCheckpoint = activeRoute.checkpoints.find((cp) => cp.status === 'upcoming');

  const grossRevenueArs = occupiedPalletsCount * activeRoute.pricePerPalletArs;
  const extraMarginArs = activeRoute.isBackhaul
    ? grossRevenueArs
    : Math.round(grossRevenueArs * 0.34);

  const otherActiveRoute = routes.find(
    (route) => route.id !== activeRoute.id && route.tripStatus !== 'delivered'
  );

  const handleOriginChange = (originLabel: string) => {
    setBackhaulOrigin(originLabel);
    const preset = BACKHAUL_ORIGINS.find((o) => o.label === originLabel);
    if (preset) {
      setBackhaulPrice(preset.suggestedArs);
    }
  };

  const handleIncidentSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    reportRoadIncident(activeRoute.id, {
      title: incidentTitle,
      kmLocation: incidentKm,
      delayMinutes: incidentDelay,
      requestRelay,
    });
    setShowIncidentForm(false);
  };

  const handleBackhaulSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const code = publishBackhaulRoute({
      origin: backhaulOrigin,
      destination: 'Polo 52, Córdoba',
      vehicleLabel: 'Semirremolque Sider 12 pallets',
      availablePallets: backhaulPallets,
      departureWindow: backhaulWindow,
      pricePerPalletArs: backhaulPrice,
    });
    setPublishedCode(code);
    setActiveTab('control');
  };

  return (
    <aside
      aria-label="Panel Transportista y Chofer"
      className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-2xl p-5 sm:p-6 space-y-5"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium text-[var(--text-secondary)] truncate">
            Transportista - {activeRoute.carrierName}
          </p>
          <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)] truncate">
            Operación y flota
          </h2>
          <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5 flex-wrap">
            <span>{activeRoute.origin}</span>
            <ArrowRight size={13} weight="regular" aria-hidden="true" />
            <span>{activeRoute.destination}</span>
          </p>
        </div>
        <span className="shrink-0 px-2.5 py-1 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-xs font-mono font-medium tabular-nums text-[var(--text-primary)]">
          {activeRoute.code}
        </span>
      </div>

      {/* Compact 2-Tab Switcher */}
      <div
        role="tablist"
        aria-label="Modos de Transportista"
        className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-hairline)]"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'control'}
          onClick={() => setActiveTab('control')}
          className={`min-h-[44px] rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
            activeTab === 'control'
              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-hairline)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'
          }`}
        >
          Control de unidad
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'publish'}
          onClick={() => setActiveTab('publish')}
          className={`min-h-[44px] rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
            activeTab === 'publish'
              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-hairline)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'
          }`}
        >
          Publicar retorno
        </button>
      </div>

      {activeTab === 'control' ? (
        <div className="space-y-4">
          {publishedCode && (
            <div className="rounded-xl border border-[#276EF1]/35 bg-[#276EF1]/10 p-3.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#1E5BD6] dark:text-[#7AA7FF]">
                  Retorno {publishedCode} publicado en flota
                </p>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Ya podés recibir reservas de Dadores PyME.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveRole('shipper')}
                className="min-h-[44px] shrink-0 rounded-full bg-[#276EF1] hover:bg-[#1E5BD6] text-[#FEFEFE] px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
              >
                Ir a Dador PyME
              </button>
            </div>
          )}

          {/* Fleet Privacy Telemetry Card */}
          <div className="rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-hairline)] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-primary)]">
                <LockSimple size={14} weight="regular" aria-hidden="true" />
                <span>Telemetría GPS privada de flota</span>
              </span>
              <span className="font-mono text-xs font-medium tabular-nums text-[#1E5BD6] dark:text-[#7AA7FF]">
                {activeRoute.privateTelemetry.speedKmh} km/h
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
              <div className="flex items-center gap-1.5 text-[var(--text-secondary)] min-w-0">
                <NavigationArrow size={14} weight="regular" className="shrink-0" aria-hidden="true" />
                <span className="font-mono tabular-nums text-[var(--text-primary)] truncate">
                  {activeRoute.privateTelemetry.lat}, {activeRoute.privateTelemetry.lng}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[var(--text-secondary)] min-w-0">
                <User size={14} weight="regular" className="shrink-0" aria-hidden="true" />
                <span className="truncate text-[var(--text-primary)]">
                  {activeRoute.privateTelemetry.driverName}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-[var(--border-hairline)] text-[11px] text-[var(--text-secondary)] flex-wrap">
              <span className="flex items-center gap-1.5">
                <IdentificationCard size={14} weight="regular" aria-hidden="true" />
                <span>{activeRoute.privateTelemetry.unionAgreement}</span>
              </span>
              <span className="font-mono tabular-nums">{activeRoute.privateTelemetry.driverLicense}</span>
            </div>
          </div>

          {/* Live Trip Simulator Controls by tripStatus */}
          {activeRoute.tripStatus === 'docked' && (
            <div className="rounded-xl border border-[var(--border-hairline)] p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-medium text-[var(--text-primary)]">
                  Unidad en dársena de origen
                </span>
                <span className="font-mono tabular-nums text-[var(--text-secondary)]">
                  {occupiedPalletsCount}/12 pallets · {formatKg(totalCargoKg)}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Verificá los bultos asignados en el manifiesto y registrá el precinto antes de salir a ruta.
              </p>
              <button
                type="button"
                onClick={() => startRouteTrip(activeRoute.id)}
                className="min-h-[44px] w-full rounded-full bg-[var(--text-primary)] text-[var(--bg-surface)] hover:opacity-90 px-5 py-3 text-sm font-medium transition-opacity flex items-center justify-center gap-2 cursor-pointer"
              >
                <Truck size={17} weight="regular" aria-hidden="true" />
                <span>Iniciar viaje y sellar estiba</span>
              </button>
            </div>
          )}

          {(activeRoute.tripStatus === 'in_transit' || activeRoute.tripStatus === 'near_dock') && (
            <div className="rounded-xl border border-[var(--border-hairline)] p-4 space-y-3.5">
              {activeRoute.tripStatus === 'near_dock' && (
                <div className="rounded-lg bg-[#276EF1]/10 border border-[#276EF1]/35 px-3 py-2 text-xs font-medium text-[#1E5BD6] dark:text-[#7AA7FF] flex items-center gap-2">
                  <MapPin size={15} weight="regular" className="shrink-0" aria-hidden="true" />
                  <span>Próximo (&lt;10 km) - Planta Receptora notificada</span>
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-[var(--text-secondary)]">Hito actual</span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {currentCheckpoint?.city ?? activeRoute.origin}
                  </span>
                </div>
                {nextCheckpoint && (
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-[var(--text-secondary)]">Próximo hito</span>
                    <span className="font-mono tabular-nums text-[var(--text-secondary)]">
                      {nextCheckpoint.city} ({nextCheckpoint.etaLabel})
                    </span>
                  </div>
                )}
                {activeRoute.sealPhotoVerified && (
                  <p className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5 pt-1">
                    <CheckCircle size={13} weight="regular" aria-hidden="true" />
                    <span>Precinto de origen verificado</span>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => advanceNextCheckpoint(activeRoute.id)}
                  className="min-h-[44px] w-full rounded-full bg-[#276EF1] hover:bg-[#1E5BD6] text-[#FEFEFE] px-5 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>
                    {activeRoute.tripStatus === 'near_dock'
                      ? 'Confirmar arribo a dársena'
                      : 'Avanzar al siguiente hito'}
                  </span>
                  <ArrowRight size={16} weight="regular" aria-hidden="true" />
                </button>

                {!showIncidentForm && (
                  <button
                    type="button"
                    onClick={() => setShowIncidentForm(true)}
                    className="min-h-[44px] w-full rounded-full border border-[var(--border-hairline)] bg-[var(--bg-subtle)] hover:border-[var(--text-secondary)] text-[var(--text-primary)] px-4 py-2.5 text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Warning size={15} weight="regular" aria-hidden="true" />
                    <span>Reportar novedad vial</span>
                  </button>
                )}
              </div>

              {/* Compact inline road incident form */}
              {showIncidentForm && (
                <form
                  onSubmit={handleIncidentSubmit}
                  className="rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-hairline)] p-3.5 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-[var(--text-primary)]">
                      Reporte de novedad vial en corredor
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowIncidentForm(false)}
                      className="min-h-[44px] px-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium text-[var(--text-secondary)]">
                      Tipo de incidencia
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {INCIDENT_TYPES.map((type) => {
                        const active = incidentTitle === type;
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setIncidentTitle(type)}
                            className={`min-h-[44px] rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors cursor-pointer ${
                              active
                                ? 'bg-[#276EF1] border-[#276EF1] text-[#FEFEFE]'
                                : 'bg-[var(--bg-surface)] border-[var(--border-hairline)] text-[var(--text-primary)]'
                            }`}
                          >
                            {type}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <label className="space-y-1 block">
                      <span className="text-[11px] font-medium text-[var(--text-secondary)] block">
                        Ubicación (km)
                      </span>
                      <input
                        type="text"
                        value={incidentKm}
                        onChange={(e) => setIncidentKm(e.target.value)}
                        className="min-h-[44px] w-full rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[#276EF1]"
                      />
                    </label>
                    <label className="space-y-1 block">
                      <span className="text-[11px] font-medium text-[var(--text-secondary)] block">
                        Demora estimada (min)
                      </span>
                      <input
                        type="number"
                        min={5}
                        max={240}
                        step={5}
                        value={incidentDelay}
                        onChange={(e) => setIncidentDelay(Number(e.target.value) || 35)}
                        className="min-h-[44px] w-full rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3 text-xs font-mono tabular-nums text-[var(--text-primary)] focus:outline-none focus:border-[#276EF1]"
                      />
                    </label>
                  </div>

                  <label className="min-h-[44px] flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requestRelay}
                      onChange={(e) => setRequestRelay(e.target.checked)}
                      className="h-4 w-4 accent-[#276EF1]"
                    />
                    <span className="text-xs text-[var(--text-primary)]">
                      Solicitar transportista de relevo
                    </span>
                  </label>

                  <figure className="space-y-1.5">
                    <div className="rounded-lg overflow-hidden border border-[var(--border-hairline)]">
                      <img
                        src="/images/incident-road-block.jpg"
                        alt="Vista previa fotográfica de novedad vial reportada por chofer"
                        className="w-full h-28 object-cover block"
                      />
                    </div>
                    <figcaption className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5">
                      <Camera size={13} weight="regular" aria-hidden="true" />
                      <span>Evidencia fotográfica obligatoria del chofer adjunta</span>
                    </figcaption>
                  </figure>

                  <button
                    type="submit"
                    className="min-h-[44px] w-full rounded-full bg-[#276EF1] hover:bg-[#1E5BD6] text-[#FEFEFE] px-4 py-2.5 text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Camera size={15} weight="regular" aria-hidden="true" />
                    <span>Enviar reporte con foto</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {activeRoute.tripStatus === 'incident' && activeRoute.incident && (
            <div className="rounded-xl border border-[var(--text-primary)]/25 bg-[var(--bg-subtle)] p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                  <Warning size={17} weight="regular" aria-hidden="true" />
                  <span>{activeRoute.incident.title}</span>
                </div>
                <span className="font-mono text-xs tabular-nums px-2 py-0.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-primary)]">
                  +{activeRoute.incident.delayMinutes} min
                </span>
              </div>

              <p className="text-xs text-[var(--text-secondary)]">
                {activeRoute.incident.kmLocation} - Reportado {activeRoute.incident.reportedAtLabel}
              </p>

              {activeRoute.incident.relayRequested && (
                <div className="rounded-lg border border-[#276EF1]/35 bg-[#276EF1]/10 px-3 py-2 text-xs font-medium text-[#1E5BD6] dark:text-[#7AA7FF]">
                  Relevo activo: {activeRoute.incident.relayCarrierName ?? 'Unidad de apoyo en camino'}
                </div>
              )}

              <figure className="space-y-1.5">
                <div className="rounded-lg overflow-hidden border border-[var(--border-hairline)]">
                  <img
                    src={activeRoute.incident.photoUrl}
                    alt={`Evidencia fotográfica de ${activeRoute.incident.title}`}
                    className="w-full h-36 object-cover block"
                  />
                </div>
                <figcaption className="text-xs text-[var(--text-secondary)]">
                  Foto verificada por chofer en {activeRoute.incident.kmLocation}
                </figcaption>
              </figure>

              <button
                type="button"
                onClick={() => resolveRoadIncident(activeRoute.id)}
                className="min-h-[44px] w-full rounded-full bg-[#276EF1] hover:bg-[#1E5BD6] text-[#FEFEFE] px-5 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Reanudar tránsito</span>
                <ArrowRight size={16} weight="regular" aria-hidden="true" />
              </button>
            </div>
          )}

          {activeRoute.tripStatus === 'arrived' && (
            <div className="rounded-xl border border-[var(--border-hairline)] p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                <Warehouse size={17} weight="regular" aria-hidden="true" />
                <span>En dársena destino</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Unidad posicionada en {activeRoute.receiverPlantName}.{' '}
                {activeRoute.assignedDock
                  ? `${activeRoute.assignedDock} lista para descarga.`
                  : 'Aguardando confirmación de dársena y descarga por Planta Receptora.'}
              </p>
              <button
                type="button"
                onClick={() => setActiveRole('receiver')}
                className="min-h-[44px] w-full rounded-full bg-[#276EF1] hover:bg-[#1E5BD6] text-[#FEFEFE] px-5 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Ir a Planta Receptora</span>
                <ArrowRight size={16} weight="regular" aria-hidden="true" />
              </button>
            </div>
          )}

          {activeRoute.tripStatus === 'delivered' && (
            <div className="rounded-xl border border-[var(--border-hairline)] p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                <CheckCircle size={17} weight="regular" aria-hidden="true" />
                <span>Viaje liquidado y entregado</span>
              </div>
              <div className="rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-hairline)] p-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[var(--text-secondary)]">Ingreso bruto consolidado</span>
                  <span className="font-mono font-semibold tabular-nums text-[var(--text-primary)]">
                    {formatArs(grossRevenueArs)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[var(--text-secondary)]">
                    {activeRoute.isBackhaul ? 'Margen extra vs. retorno vacío' : 'Margen extra consolidado'}
                  </span>
                  <span className="font-mono font-medium tabular-nums text-[#1E5BD6] dark:text-[#7AA7FF]">
                    +{formatArs(extraMarginArs)}
                  </span>
                </div>
              </div>
              {otherActiveRoute && (
                <button
                  type="button"
                  onClick={() => selectRoute(otherActiveRoute.id)}
                  className="min-h-[44px] w-full rounded-full border border-[var(--border-hairline)] bg-[var(--bg-subtle)] hover:border-[var(--text-secondary)] text-[var(--text-primary)] px-4 py-2.5 text-xs font-medium transition-colors cursor-pointer"
                >
                  Cambiar a unidad {otherActiveRoute.code}
                </button>
              )}
            </div>
          )}

          {/* Compact Stowage Manifest */}
          <div className="rounded-xl border border-[var(--border-hairline)] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                <Package size={15} weight="regular" aria-hidden="true" />
                Manifiesto de estiba
              </span>
              <span className="font-mono text-[11px] tabular-nums text-[var(--text-secondary)]">
                {occupiedPalletsCount}/12 pallets
              </span>
            </div>

            {manifest.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)]">
                Sin pallets consolidados aún en esta unidad.
              </p>
            ) : (
              <ul className="space-y-1.5 max-h-44 overflow-y-auto pr-0.5">
                {manifest.map((entry) => (
                  <li key={entry.key}>
                    <button
                      type="button"
                      onClick={() => setInspectedSlotId(entry.slotIds[0] ?? null)}
                      className={`min-h-[44px] w-full rounded-lg border px-2.5 py-2 text-left transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                        entry.isUserBooked
                          ? 'border-[#276EF1]/45 bg-[#276EF1]/10'
                          : 'border-[var(--border-hairline)] bg-[var(--bg-subtle)] hover:border-[var(--text-secondary)]'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                          {entry.shipperName}
                        </p>
                        <p className="text-[11px] text-[var(--text-secondary)] truncate">
                          {entry.cargoLabel} ({entry.slotIds.join(', ')})
                        </p>
                      </div>
                      <div className="shrink-0 text-right font-mono tabular-nums">
                        <p className="text-[11px] font-medium text-[var(--text-primary)]">
                          {entry.bookingCode}
                        </p>
                        <p className="text-[11px] text-[var(--text-secondary)]">
                          {formatKg(entry.totalKg)}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        /* Tab 2: Publicar retorno */
        <form onSubmit={handleBackhaulSubmit} className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-medium text-[var(--text-primary)]">
              Origen del retorno vacío
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {BACKHAUL_ORIGINS.map((origin) => {
                const selected = backhaulOrigin === origin.label;
                return (
                  <button
                    key={origin.label}
                    type="button"
                    onClick={() => handleOriginChange(origin.label)}
                    aria-pressed={selected}
                    className={`min-h-[44px] rounded-xl px-3 py-2 text-xs font-medium border transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                      selected
                        ? 'bg-[#276EF1] border-[#276EF1] text-[#FEFEFE]'
                        : 'bg-[var(--bg-subtle)] border-[var(--border-hairline)] text-[var(--text-primary)] hover:border-[var(--text-secondary)]'
                    }`}
                  >
                    <span>{origin.label}</span>
                    <span className="font-mono tabular-nums opacity-90">
                      {formatArs(origin.suggestedArs)}/p
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-hairline)] px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
            <span className="text-[var(--text-secondary)]">Destino corredor</span>
            <span className="font-medium text-[var(--text-primary)]">Polo 52, Córdoba</span>
          </div>

          {/* 1 to 12 pallets with 12-segment indicator */}
          <div className="rounded-xl border border-[var(--border-hairline)] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-[var(--text-primary)]">
                  Pallets libres en bodega
                </p>
                <p className="text-[11px] font-mono tabular-nums text-[var(--text-secondary)]">
                  {backhaulPallets} / 12 disponibles
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Reducir pallets libres"
                  disabled={backhaulPallets <= 1}
                  onClick={() => setBackhaulPallets((prev) => Math.max(1, prev - 1))}
                  className="min-h-[44px] min-w-[44px] rounded-full border border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[var(--text-primary)] disabled:opacity-40 cursor-pointer flex items-center justify-center"
                >
                  <Minus size={15} weight="regular" aria-hidden="true" />
                </button>
                <span className="w-7 text-center font-mono text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                  {backhaulPallets}
                </span>
                <button
                  type="button"
                  aria-label="Aumentar pallets libres"
                  disabled={backhaulPallets >= 12}
                  onClick={() => setBackhaulPallets((prev) => Math.min(12, prev + 1))}
                  className="min-h-[44px] min-w-[44px] rounded-full border border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[var(--text-primary)] disabled:opacity-40 cursor-pointer flex items-center justify-center"
                >
                  <Plus size={15} weight="regular" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* 12 discrete pallet bay segments */}
            <div
              className="grid grid-cols-12 gap-1"
              role="group"
              aria-label="Indicador de 12 posiciones de pallet"
            >
              {Array.from({ length: 12 }, (_, idx) => {
                const slotNumber = idx + 1;
                const active = slotNumber <= backhaulPallets;
                return (
                  <button
                    key={slotNumber}
                    type="button"
                    aria-label={`${slotNumber} pallets libres`}
                    onClick={() => setBackhaulPallets(slotNumber)}
                    className="min-h-[44px] flex items-center justify-center cursor-pointer group"
                  >
                    <span
                      className={`h-5 w-full rounded-sm transition-colors border ${
                        active
                          ? 'bg-[#276EF1] border-[#276EF1]'
                          : 'bg-[var(--bg-subtle)] border-[var(--border-hairline)] group-hover:border-[var(--text-secondary)]'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Departure Window */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5">
              <Clock size={14} weight="regular" aria-hidden="true" />
              Ventana de salida
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
              {DEPARTURE_WINDOWS.map((win) => {
                const selected = backhaulWindow === win;
                return (
                  <button
                    key={win}
                    type="button"
                    onClick={() => setBackhaulWindow(win)}
                    className={`min-h-[44px] rounded-xl px-2.5 py-2 text-[11px] font-medium border transition-colors cursor-pointer ${
                      selected
                        ? 'bg-[var(--text-primary)] border-[var(--text-primary)] text-[var(--bg-surface)]'
                        : 'bg-[var(--bg-subtle)] border-[var(--border-hairline)] text-[var(--text-primary)]'
                    }`}
                  >
                    {win}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Discounted Pallet Tariff */}
          <div className="rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-hairline)] p-3.5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-[var(--text-primary)]">
                Tarifa retorno bonificada
              </p>
              <p className="text-[11px] text-[var(--text-secondary)]">Por pallet hacia Polo 52</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Reducir tarifa por pallet"
                onClick={() => setBackhaulPrice((p) => Math.max(15000, p - 1500))}
                className="min-h-[44px] min-w-[44px] rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-primary)] cursor-pointer flex items-center justify-center"
              >
                <Minus size={14} weight="regular" aria-hidden="true" />
              </button>
              <span className="font-mono text-xs font-semibold tabular-nums text-[var(--text-primary)] min-w-[74px] text-center">
                {formatArs(backhaulPrice)}
              </span>
              <button
                type="button"
                aria-label="Aumentar tarifa por pallet"
                onClick={() => setBackhaulPrice((p) => Math.min(120000, p + 1500))}
                className="min-h-[44px] min-w-[44px] rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-primary)] cursor-pointer flex items-center justify-center"
              >
                <Plus size={14} weight="regular" aria-hidden="true" />
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="min-h-[44px] w-full rounded-full bg-[#276EF1] hover:bg-[#1E5BD6] text-[#FEFEFE] px-5 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Publicar retorno disponible</span>
            <ArrowRight size={16} weight="regular" aria-hidden="true" />
          </button>
        </form>
      )}
    </aside>
  );
}
