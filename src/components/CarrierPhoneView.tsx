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
  Warning,
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
    <div className="w-full flex justify-center py-0 sm:py-2">
      {/* Mobile Frame Simulation (Only decorative on desktop; seamless on mobile) */}
      <div className="w-full sm:max-w-[400px] rounded-none sm:rounded-[38px] border-0 sm:border-[5px] border-[var(--border-hairline)] sm:shadow-2xl bg-[var(--bg-canvas)] overflow-hidden flex flex-col h-[680px] sm:h-[720px] relative">
        {/* Fake Phone Status Bar */}
        <div className="hidden sm:flex h-6 items-center justify-between px-5 pt-1.5 text-[10px] font-semibold text-[var(--text-secondary)] select-none z-30">
          <span>9:41</span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[9px]">LTE</span>
            <div className="h-2 w-4 rounded-sm border border-current p-0.5">
              <div className="h-full w-2.5 bg-current rounded-xs" />
            </div>
          </div>
        </div>

        {/* Top Floating App Bar (Uber Driver style) */}
        <div className="absolute top-2 sm:top-7 left-3 right-3 z-30 flex items-center justify-between gap-2">
          {/* Driver identity pill */}
          <div className="flex items-center gap-2 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)]/95 px-3 py-1 shadow-md backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-[#276EF1]" />
            <span className="text-xs font-bold text-[var(--text-primary)]">
              {activeRoute.privateTelemetry.driverName.split(' ')[0]} (Chofer)
            </span>
          </div>

          {/* View toggle (Map vs 3D) */}
          <div className="flex items-center rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)]/95 p-0.5 shadow-md backdrop-blur-md">
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold cursor-pointer transition-colors ${
                viewMode === 'map'
                  ? 'bg-[#276EF1] text-[#FEFEFE]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <MapTrifold size={12} weight="bold" />
              <span>Mapa</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('3d')}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold cursor-pointer transition-colors ${
                viewMode === '3d'
                  ? 'bg-[#141414] text-[#F6F6F6] dark:bg-[#F5F5F7] dark:text-[#111112]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Cube size={12} weight="bold" />
              <span>Estiba 3D</span>
            </button>
          </div>
        </div>

        {/* Viewport Center: Full-height Leaflet or 3D */}
        <div className="flex-1 w-full relative z-0">
          {viewMode === 'map' ? (
            <div className="h-full w-full">
              <CorridorMap theme={theme} />
            </div>
          ) : (
            <div className="h-full w-full pt-10">
              <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-[var(--text-secondary)]">Cargando 3D...</div>}>
                <TruckScene3D theme={theme} />
              </Suspense>
            </div>
          )}
        </div>

        {/* Bottom Operational Sheet (Uber Driver / Mercado Libre Transporte style) */}
        <div className="z-20 border-t border-[var(--border-hairline)] bg-[var(--bg-surface)] px-4 pt-3 pb-4 shadow-xl space-y-2.5">
          {/* Trip heading & next stop */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono text-[var(--text-secondary)]">
                {activeRoute.code} · Parada {currentIdx + 1} de {checkpoints.length}
              </p>
              <h3 className="text-sm font-bold text-[var(--text-primary)] leading-tight">
                {activeRoute.tripStatus === 'docked'
                  ? `Cargar en ${activeRoute.origin.split(',')[0]}`
                  : activeRoute.tripStatus === 'near_dock'
                    ? `Aproximando a ${activeRoute.receiverPlantName}`
                    : activeRoute.tripStatus === 'arrived'
                      ? `En dársena: ${activeRoute.assignedDock ?? 'Dársena 1'}`
                      : activeRoute.tripStatus === 'delivered'
                        ? 'Viaje finalizado con conformidad'
                        : `Hacia ${nextCp?.city.split(',')[0]}`}
              </h3>
            </div>

            {/* Compact Retorno button */}
            <button
              type="button"
              onClick={() => setShowBackhaulModal(true)}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-primary)] hover:border-[#276EF1]"
            >
              <Plus size={11} weight="bold" />
              <span>Retorno</span>
            </button>
          </div>

          {/* 3 Metric Pills Row */}
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] py-1.5">
              <span className="block text-[9px] text-[var(--text-secondary)]">Carga</span>
              <span className="font-mono text-xs font-bold text-[var(--text-primary)]">
                {occupiedSlots.length}/12 mód.
              </span>
            </div>
            <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] py-1.5">
              <span className="block text-[9px] text-[var(--text-secondary)]">Ingreso</span>
              <span className="font-mono text-xs font-bold text-[var(--text-primary)]">
                {formatArs(revenueArs)}
              </span>
            </div>
            <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] py-1.5">
              <span className="block text-[9px] text-[var(--text-secondary)]">CO2e evitado</span>
              <span className="font-mono text-xs font-bold text-[#276EF1]">
                -{routeCarbon.co2SavedKg} kg
              </span>
            </div>
          </div>

          {/* Primary Action Button by stage (En camino -> Próximo <10 km -> Dársena) */}
          <div className="space-y-2 pt-1">
            {activeRoute.tripStatus === 'docked' && (
              <ActionButton
                variant="dark"
                onClick={() => startRouteTrip(activeRoute.id)}
                confirmedLabel="Salida precintada"
                className="w-full min-h-[46px]"
              >
                <span>En camino (Iniciar viaje)</span>
                <NavigationArrow size={15} weight="bold" />
              </ActionButton>
            )}

            {activeRoute.tripStatus === 'in_transit' && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => advanceNextCheckpoint(activeRoute.id)}
                  className="flex min-h-[46px] cursor-pointer items-center justify-center gap-1 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 text-xs font-semibold text-[var(--text-primary)] hover:border-[#276EF1]"
                >
                  <span>Paso {nextCp?.city.split(',')[0]}</span>
                  <ArrowRight size={13} weight="bold" />
                </button>

                <ActionButton
                  variant="primary"
                  onClick={() => triggerNearDockAlert(activeRoute.id)}
                  confirmedLabel="Planta notificada"
                  className="min-h-[46px]"
                >
                  <MapPin size={15} weight="bold" />
                  <span>Próximo (&lt;10 km)</span>
                </ActionButton>
              </div>
            )}

            {activeRoute.tripStatus === 'near_dock' && (
              <ActionButton
                variant="primary"
                onClick={() => advanceNextCheckpoint(activeRoute.id)}
                confirmedLabel="Arribo confirmado"
                className="w-full min-h-[46px]"
              >
                <CheckCircle size={16} weight="bold" />
                <span>Confirmar llegada a dársena</span>
              </ActionButton>
            )}

            {activeRoute.tripStatus === 'arrived' && (
              <div className="rounded-xl bg-[#276EF1]/10 border border-[#276EF1]/30 p-2.5 text-center text-xs text-[#276EF1] font-semibold">
                Esperando descarga en {activeRoute.assignedDock ?? 'Dársena 1'} (Planta)
              </div>
            )}

            {/* Quick Road Incident Button with Mandatory Photo */}
            {isInMotion && (
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => setShowIncidentModal(true)}
                  className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[#D97706]"
                >
                  <Camera size={13} weight="bold" />
                  <span>Reportar corte con foto</span>
                </button>

                <button
                  type="button"
                  onClick={toggleAutoSimulation}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-[var(--bg-subtle)] px-2.5 py-1 text-[10px] font-semibold text-[var(--text-primary)]"
                >
                  {isAutoSimulating ? (
                    <>
                      <Pause size={10} weight="bold" />
                      <span>Simulación activa</span>
                    </>
                  ) : (
                    <>
                      <Play size={10} weight="bold" />
                      <span>Simulación auto</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modal Corte de Ruta con Foto */}
        {showIncidentModal && (
          <div className="absolute inset-0 z-40 bg-[#141414]/70 p-4 flex items-center justify-center backdrop-blur-xs">
            <div className="w-full rounded-2xl bg-[var(--bg-surface)] p-4 border border-[var(--border-hairline)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[#D97706]">
                  <Warning size={16} weight="bold" />
                  <h4 className="text-xs font-bold text-[var(--text-primary)]">
                    Reportar corte de ruta (Foto requerida)
                  </h4>
                </div>
                <button type="button" onClick={() => setShowIncidentModal(false)} className="text-[var(--text-secondary)]">
                  <X size={15} weight="bold" />
                </button>
              </div>

              <img
                src="/images/incident-road-block.jpg"
                alt="Foto del corte en ruta"
                className="w-full h-24 rounded-xl object-cover border border-[var(--border-hairline)]"
              />

              <p className="text-[11px] text-[var(--text-secondary)]">
                RN 9 km 214 (+35 min). Se notificará inmediatamente al Dador y a la Planta con la foto verificada.
              </p>

              <ActionButton
                variant="dark"
                onClick={handleSendIncident}
                confirmedLabel="Corte reportado"
                className="min-h-[40px] text-xs"
              >
                <span>Enviar reporte a la red</span>
              </ActionButton>
            </div>
          </div>
        )}

        {/* Modal Publicar Retorno Vacío */}
        {showBackhaulModal && (
          <div className="absolute inset-0 z-40 bg-[#141414]/70 p-4 flex items-center justify-center backdrop-blur-xs">
            <div className="w-full rounded-2xl bg-[var(--bg-surface)] p-4 border border-[var(--border-hairline)] space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[var(--text-primary)]">Publicar retorno vacío</h4>
                <button type="button" onClick={() => setShowBackhaulModal(false)} className="text-[var(--text-secondary)]">
                  <X size={15} weight="bold" />
                </button>
              </div>

              <form onSubmit={handlePublishBackhaul} className="space-y-2.5">
                <select
                  value={originIndex}
                  onChange={(e) => setOriginIndex(Number(e.target.value))}
                  className="w-full h-9 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-2 text-xs text-[var(--text-primary)]"
                >
                  {BACKHAUL_ORIGINS.map((o, idx) => (
                    <option key={o.label} value={idx}>
                      {o.label} ({formatArs(o.price)}/mód.)
                    </option>
                  ))}
                </select>

                <div className="flex items-center justify-between text-xs px-1">
                  <span>Módulos libres:</span>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={freePallets}
                    onChange={(e) => setFreePallets(Number(e.target.value))}
                    className="w-14 h-8 rounded-lg border border-[var(--border-hairline)] text-center font-mono"
                  />
                </div>

                <ActionButton
                  type="submit"
                  variant="primary"
                  onClick={() => {}}
                  confirmedLabel="Retorno publicado"
                  className="min-h-[40px] text-xs"
                >
                  <span>Publicar unidad</span>
                </ActionButton>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
