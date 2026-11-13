import { Suspense, lazy, useState } from 'react';
import {
  ArrowRight,
  Camera,
  CheckCircle,
  Cube,
  MapPin,
  MapTrifold,
  NavigationArrow,
  Pause,
  Play,
  Plus,
  X,
} from '@phosphor-icons/react';
import { useSimulation } from '../context/SimulationContext';
import { estimateCarbonSavings } from '../utils/carbon';
import type { ThemeMode } from '../types/logistics';
import { CorridorMap } from './CorridorMap';
import { ActionButton } from './ActionButton';

const TruckScene3D = lazy(() =>
  import('./TruckScene3D').then((module) => ({ default: module.TruckScene3D }))
);

const BACKHAUL_ORIGINS = [
  { label: 'Rosario, Santa Fe', price: 36500 },
  { label: 'CABA / Zona Norte', price: 48000 },
  { label: 'Jesús María, Córdoba', price: 19800 },
] as const;

function formatArs(amount: number): string {
  return `$ ${Math.round(amount).toLocaleString('es-AR')}`;
}

export function CarrierPhoneView({ theme }: { theme: ThemeMode }) {
  const {
    activeRoute,
    setActiveRole,
    startRouteTrip,
    advanceNextCheckpoint,
    triggerNearDockAlert,
    reportRoadIncident,
    publishBackhaulRoute,
    isAutoSimulating,
    toggleAutoSimulation,
  } = useSimulation();

  const [viewMode, setViewMode] = useState<'map' | '3d'>('map');
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showBackhaulModal, setShowBackhaulModal] = useState(false);
  const [originIndex, setOriginIndex] = useState(0);
  const [freePallets, setFreePallets] = useState(6);

  const checkpoints = activeRoute.checkpoints;
  const currentIdx = Math.max(0, checkpoints.findIndex((c) => c.status === 'current'));
  const nextCp = checkpoints[Math.min(checkpoints.length - 1, currentIdx + 1)] ?? checkpoints[checkpoints.length - 1];

  const occupiedSlots = activeRoute.slots.filter((s) => s.status !== 'available');
  const revenueArs = occupiedSlots.length * activeRoute.pricePerPalletArs;
  const routeCarbon = estimateCarbonSavings(activeRoute, occupiedSlots.length);
  const isInMotion = activeRoute.tripStatus === 'in_transit' || activeRoute.tripStatus === 'near_dock';

  const handleSendIncident = () => {
    reportRoadIncident(activeRoute.id, {
      title: 'Corte preventivo en calzada',
      kmLocation: 'RN 9 km 214',
      delayMinutes: 35,
      requestRelay: true,
    });
    setShowIncidentModal(false);
  };

  const handlePublishBackhaul = (e: React.FormEvent) => {
    e.preventDefault();
    const chosen = BACKHAUL_ORIGINS[originIndex];
    publishBackhaulRoute({
      origin: chosen.label,
      destination: 'Polo 52, Córdoba',
      vehicleLabel: 'Semirremolque Sider 12 pallets',
      availablePallets: freePallets,
      departureWindow: 'Hoy, 20:00 hs',
      pricePerPalletArs: chosen.price,
    });
    setShowBackhaulModal(false);
  };

  return (
    <div className="w-full flex flex-col space-y-4">
      {/* Driver Clean Hero HUD */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#276EF1] text-[#FEFEFE]">
            <NavigationArrow size={20} weight="bold" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#276EF1]" />
              <span className="text-xs font-mono font-semibold text-[var(--text-secondary)]">
                {activeRoute.code} · Chofer {activeRoute.privateTelemetry.driverName.split(' ')[0]}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] truncate">
              {activeRoute.tripStatus === 'docked'
                ? `Cargar en ${activeRoute.origin.split(',')[0]}`
                : activeRoute.tripStatus === 'near_dock'
                  ? `Llegando a ${activeRoute.receiverPlantName}`
                  : activeRoute.tripStatus === 'arrived'
                    ? `En dársena: ${activeRoute.assignedDock ?? 'Dársena 1'}`
                    : activeRoute.tripStatus === 'delivered'
                      ? 'Viaje completado'
                      : `Hacia ${nextCp?.city.split(',')[0]} (Parada ${currentIdx + 1} de ${checkpoints.length})`}
            </h2>
          </div>
        </div>

        {/* Action Pills & Mode Toggle */}
        <div className="flex items-center gap-2">
          {isInMotion && (
            <button
              type="button"
              onClick={toggleAutoSimulation}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold cursor-pointer transition-colors ${
                isAutoSimulating
                  ? 'bg-[#141414] text-[#FEFEFE] dark:bg-[#F5F5F7] dark:text-[#111112]'
                  : 'bg-[#276EF1] text-[#FEFEFE] hover:bg-[#1E5BD6]'
              }`}
            >
              {isAutoSimulating ? (
                <>
                  <Pause size={13} weight="bold" aria-hidden="true" />
                  <span>Pausar recorrido</span>
                </>
              ) : (
                <>
                  <Play size={13} weight="bold" aria-hidden="true" />
                  <span>Simular en vivo</span>
                </>
              )}
            </button>
          )}

          <div className="inline-flex rounded-full border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium cursor-pointer transition-colors ${
                viewMode === 'map'
                  ? 'bg-[#276EF1] text-[#FEFEFE]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <MapTrifold size={14} weight="bold" />
              <span>Mapa</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('3d')}
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium cursor-pointer transition-colors ${
                viewMode === '3d'
                  ? 'bg-[#141414] text-[#F6F6F6] dark:bg-[#F5F5F7] dark:text-[#111112]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Cube size={14} weight="bold" />
              <span>Estiba 3D</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Responsive 100% Map on Left/Top + Generous Driver Control on Right/Bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Full Height Map with zero void space */}
        <div className="lg:col-span-8 flex flex-col min-h-[380px] sm:min-h-[460px] lg:min-h-[520px]">
          {viewMode === 'map' ? (
            <div className="flex-1 w-full h-full">
              <CorridorMap theme={theme} className="h-full min-h-[380px] sm:min-h-[460px] lg:min-h-[520px]" />
            </div>
          ) : (
            <div className="flex-1 w-full h-full rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] overflow-hidden">
              <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-[var(--text-secondary)]">Cargando 3D...</div>}>
                <TruckScene3D theme={theme} />
              </Suspense>
            </div>
          )}
        </div>

        {/* Driver Operational Console */}
        <div className="lg:col-span-4 flex flex-col justify-between rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 shadow-sm space-y-4">
          <div className="space-y-4">
            {/* Metric Summary Cards */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-2.5">
                <span className="block text-[10px] text-[var(--text-secondary)]">Ocupación</span>
                <span className="font-mono text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                  {occupiedSlots.length}/12 mód.
                </span>
              </div>
              <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-2.5">
                <span className="block text-[10px] text-[var(--text-secondary)]">Ingreso viaje</span>
                <span className="font-mono text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                  {formatArs(revenueArs)}
                </span>
              </div>
              <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-2.5">
                <span className="block text-[10px] text-[var(--text-secondary)]">CO2e evitado</span>
                <span className="font-mono text-xs sm:text-sm font-bold text-[#276EF1]">
                  -{routeCarbon.co2SavedKg} kg
                </span>
              </div>
            </div>

            {/* Checkpoint Status List */}
            <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-3 space-y-2">
              <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Progreso de ruta</span>
              <div className="space-y-1.5">
                {checkpoints.map((cp) => {
                  const isCurrent = cp.status === 'current';
                  const isPassed = cp.status === 'passed';
                  return (
                    <div key={cp.city} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            isCurrent
                              ? 'bg-[#276EF1] ring-2 ring-[#276EF1]/30'
                              : isPassed
                                ? 'bg-[var(--text-secondary)]'
                                : 'bg-[var(--border-hairline)]'
                          }`}
                        />
                        <span className={`font-medium ${isCurrent ? 'text-[var(--text-primary)] font-bold' : 'text-[var(--text-secondary)]'}`}>
                          {cp.city.split(',')[0]}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-[var(--text-secondary)]">
                        km {cp.kmFromOrigin}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action Area */}
          <div className="space-y-2 pt-2">
            {activeRoute.tripStatus === 'docked' && (
              <ActionButton
                variant="dark"
                onClick={() => startRouteTrip(activeRoute.id)}
                confirmedLabel="Salida precintada"
                className="w-full min-h-[48px]"
              >
                <span>Iniciar recorrido precintado</span>
                <ArrowRight size={16} weight="bold" />
              </ActionButton>
            )}

            {activeRoute.tripStatus === 'in_transit' && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => advanceNextCheckpoint(activeRoute.id)}
                    className="flex min-h-[48px] cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 text-xs font-semibold text-[var(--text-primary)] hover:border-[#276EF1]"
                  >
                    <span>Paso {nextCp?.city.split(',')[0]}</span>
                    <ArrowRight size={13} weight="bold" />
                  </button>

                  <ActionButton
                    variant="primary"
                    onClick={() => triggerNearDockAlert(activeRoute.id)}
                    confirmedLabel="Planta notificada"
                    className="min-h-[48px]"
                  >
                    <MapPin size={15} weight="bold" />
                    <span>Avisar (&lt;10 km)</span>
                  </ActionButton>
                </div>

                <button
                  type="button"
                  onClick={() => setShowIncidentModal(true)}
                  className="flex min-h-[38px] w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-4 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <Camera size={14} weight="regular" aria-hidden="true" />
                  <span>Reportar corte en ruta con foto</span>
                </button>
              </div>
            )}

            {activeRoute.tripStatus === 'near_dock' && (
              <ActionButton
                variant="primary"
                onClick={() => advanceNextCheckpoint(activeRoute.id)}
                confirmedLabel="Arribo confirmado"
                className="w-full min-h-[48px]"
              >
                <CheckCircle size={16} weight="bold" />
                <span>Confirmar llegada a dársena</span>
              </ActionButton>
            )}

            {activeRoute.tripStatus === 'arrived' && (
              <ActionButton
                variant="primary"
                onClick={() => setActiveRole('receiver')}
                confirmedLabel="Abriendo Planta"
                className="w-full min-h-[48px]"
              >
                <span>Pasar a recepción en Planta</span>
                <ArrowRight size={15} weight="bold" />
              </ActionButton>
            )}

            {activeRoute.tripStatus === 'delivered' && (
              <div className="flex items-center gap-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-3 text-xs font-medium text-[var(--text-primary)]">
                <CheckCircle size={18} weight="bold" className="text-[#276EF1] shrink-0" aria-hidden="true" />
                <span>Viaje liquidado con conformidad en destino ({formatArs(revenueArs)})</span>
              </div>
            )}

            {/* Backhaul button */}
            <button
              type="button"
              onClick={() => setShowBackhaulModal(true)}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] hover:border-[#276EF1]"
            >
              <Plus size={13} weight="bold" />
              <span>Publicar retorno vacío</span>
            </button>
          </div>
        </div>
      </div>

      {/* Incident Modal */}
      {showIncidentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Reportar corte preventivo</h3>
              <button
                type="button"
                onClick={() => setShowIncidentModal(false)}
                className="cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X size={16} weight="bold" />
              </button>
            </div>
            <div className="space-y-3">
              <img
                src="/images/incident-road-block.jpg"
                alt="Corte en calzada"
                className="h-28 w-full rounded-xl object-cover"
              />
              <p className="text-xs text-[var(--text-secondary)]">
                Se notificará a la red un desvío de +35 minutos en RN 9 km 214 y se coordinará relevo preventivo.
              </p>
            </div>
            <div className="flex gap-2">
              <ActionButton
                variant="dark"
                onClick={handleSendIncident}
                confirmedLabel="Alerta enviada"
                className="flex-1 min-h-[40px] text-xs"
              >
                <span>Emitir alerta</span>
              </ActionButton>
              <button
                type="button"
                onClick={() => setShowIncidentModal(false)}
                className="cursor-pointer rounded-full border border-[var(--border-hairline)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backhaul Modal */}
      {showBackhaulModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Publicar retorno vacío</h3>
              <button
                type="button"
                onClick={() => setShowBackhaulModal(false)}
                className="cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X size={16} weight="bold" />
              </button>
            </div>
            <form onSubmit={handlePublishBackhaul} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                  Origen de regreso
                </label>
                <select
                  value={originIndex}
                  onChange={(e) => setOriginIndex(Number(e.target.value))}
                  className="h-10 w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 text-xs font-medium text-[var(--text-primary)]"
                >
                  {BACKHAUL_ORIGINS.map((o, idx) => (
                    <option key={o.label} value={idx}>
                      {o.label} ({formatArs(o.price)} / mód.)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                  Módulos disponibles en acoplado
                </label>
                <div className="flex items-center justify-between rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 py-2">
                  <span className="font-mono text-xs font-bold text-[var(--text-primary)]">
                    {freePallets} pallets libres
                  </span>
                  <div className="flex gap-1">
                    {[4, 6, 8, 12].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setFreePallets(cnt)}
                        className={`px-2 py-0.5 rounded-lg text-xs font-mono font-semibold cursor-pointer ${
                          freePallets === cnt
                            ? 'bg-[#276EF1] text-[#FEFEFE]'
                            : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                        }`}
                      >
                        {cnt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <ActionButton
                  type="submit"
                  variant="dark"
                  onClick={() => {}}
                  confirmedLabel="Publicado"
                  className="flex-1 min-h-[42px] text-xs"
                >
                  <span>Publicar en red</span>
                </ActionButton>
                <button
                  type="button"
                  onClick={() => setShowBackhaulModal(false)}
                  className="cursor-pointer rounded-full border border-[var(--border-hairline)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)]"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
