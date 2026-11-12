import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  Camera,
  CheckCircle,
  Leaf,
  Minus,
  Plus,
  Warning,
} from '@phosphor-icons/react';
import { useSimulation } from '../context/SimulationContext';
import { estimateCarbonSavings } from '../utils/carbon';
import { ActionButton } from './ActionButton';

const BACKHAUL_ORIGINS = [
  { label: 'Rosario, Santa Fe', price: 36500 },
  { label: 'CABA / Zona Norte', price: 48000 },
  { label: 'Jesús María, Córdoba', price: 19800 },
] as const;

function formatArs(amount: number): string {
  return `$ ${Math.round(amount).toLocaleString('es-AR')}`;
}

export function CarrierPanel() {
  const shouldReduceMotion = useReducedMotion();
  const {
    activeRoute,
    setActiveRole,
    startRouteTrip,
    advanceNextCheckpoint,
    reportRoadIncident,
    resolveRoadIncident,
    publishBackhaulRoute,
  } = useSimulation();

  const [showPublish, setShowPublish] = useState(false);
  const [showIncidentBox, setShowIncidentBox] = useState(false);
  const [originIndex, setOriginIndex] = useState(0);
  const [freePallets, setFreePallets] = useState(6);

  const occupiedSlots = activeRoute.slots.filter((s) => s.status !== 'available');
  const revenueArs = occupiedSlots.length * activeRoute.pricePerPalletArs;
  const routeCarbonEstimate = estimateCarbonSavings(activeRoute, occupiedSlots.length);

  const checkpoints = activeRoute.checkpoints;
  const currentIdx = Math.max(
    0,
    checkpoints.findIndex((c) => c.status === 'current')
  );
  const currentCp = checkpoints[currentIdx] ?? checkpoints[0];
  const nextCp =
    checkpoints[Math.min(checkpoints.length - 1, currentIdx + 1)] ??
    checkpoints[checkpoints.length - 1];

  const handlePublishSubmit = (e: React.FormEvent) => {
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
    setShowPublish(false);
  };

  const handleSendIncident = () => {
    reportRoadIncident(activeRoute.id, {
      title: 'Corte preventivo en calzada',
      kmLocation: 'RN 9 km 214',
      delayMinutes: 35,
      requestRelay: true,
    });
    setShowIncidentBox(false);
  };

  // Vista 1C: Publicar retorno vacío
  if (showPublish) {
    const chosen = BACKHAUL_ORIGINS[originIndex];
    return (
      <aside aria-label="Publicar retorno vacío" className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Publicar retorno vacío
          </h2>
          <button
            type="button"
            onClick={() => setShowPublish(false)}
            className="cursor-pointer text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Cancelar
          </button>
        </div>

        <form onSubmit={handlePublishSubmit} className="space-y-3">
          <select
            aria-label="Origen de regreso a Córdoba"
            value={originIndex}
            onChange={(e) => setOriginIndex(Number(e.target.value))}
            className="h-10 w-full cursor-pointer rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 text-xs font-medium text-[var(--text-primary)]"
          >
            {BACKHAUL_ORIGINS.map((o, idx) => (
              <option key={o.label} value={idx} className="bg-[var(--bg-surface)]">
                {o.label} ({formatArs(o.price)} / mód.)
              </option>
            ))}
          </select>

          <div className="flex h-11 items-center justify-between rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-2">
            <motion.button
              type="button"
              whileTap={shouldReduceMotion ? undefined : { scale: 0.88 }}
              onClick={() => setFreePallets((p) => Math.max(1, p - 1))}
              aria-label="Restar módulo libre"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
            >
              <Minus size={15} weight="regular" aria-hidden="true" />
            </motion.button>
            <span className="font-mono text-sm font-semibold tabular-nums text-[var(--text-primary)]">
              {freePallets} libres · {formatArs(freePallets * chosen.price)}
            </span>
            <motion.button
              type="button"
              whileTap={shouldReduceMotion ? undefined : { scale: 0.88 }}
              onClick={() => setFreePallets((p) => Math.min(12, p + 1))}
              aria-label="Sumar módulo libre"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
            >
              <Plus size={15} weight="regular" aria-hidden="true" />
            </motion.button>
          </div>

          <ActionButton
            type="submit"
            variant="dark"
            onClick={() => {}}
            confirmedLabel="Unidad publicada"
            confirmBeatMs={200}
            className="min-h-[48px]"
          >
            <span>Publicar unidad en red</span>
          </ActionButton>
        </form>
      </aside>
    );
  }

  // Vista 1A & 1B: Interfaz Uber Driver / Mercado Libre Transporte
  const headline =
    activeRoute.tripStatus === 'docked'
      ? `Cargar en ${activeRoute.origin.split(',')[0]}`
      : activeRoute.tripStatus === 'near_dock'
        ? `Llegando a ${activeRoute.receiverPlantName}`
        : activeRoute.tripStatus === 'arrived'
          ? `En dársena · ${activeRoute.receiverPlantName}`
          : activeRoute.tripStatus === 'delivered'
            ? 'Viaje completado'
            : activeRoute.tripStatus === 'incident'
              ? `Corte en ${activeRoute.incident?.kmLocation ?? 'ruta'}`
              : `Hacia ${nextCp?.city.split(',')[0]}`;

  return (
    <aside aria-label="Control de Transportista" className="space-y-3.5">
      {/* Top Driver Status Strip (Uber Driver / MeLi Flex style) */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-secondary)]">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                activeRoute.tripStatus === 'incident'
                  ? 'bg-[#D97706]'
                  : activeRoute.tripStatus === 'delivered'
                    ? 'bg-[var(--text-secondary)]'
                    : 'bg-[#276EF1]'
              }`}
            />
            <span className="truncate">
              Parada {currentIdx + 1} de {checkpoints.length} · {activeRoute.privateTelemetry.driverName}
            </span>
          </div>
          <h2 className="mt-0.5 truncate text-lg font-semibold tracking-tight text-[var(--text-primary)]">
            {headline}
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setShowPublish(true)}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
        >
          <Plus size={12} weight="bold" aria-hidden="true" />
          <span>Retorno</span>
        </button>
      </div>

      {/* Single Compact Trip Summary Row */}
      <div className="grid grid-cols-3 gap-1.5 text-center">
        <div className="rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-hairline)] px-2 py-2">
          <span className="block text-[10px] text-[var(--text-secondary)]">Ocupación</span>
          <span className="font-mono text-xs font-semibold text-[var(--text-primary)]">
            {occupiedSlots.length}/12
          </span>
        </div>
        <div className="rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-hairline)] px-2 py-2">
          <span className="block text-[10px] text-[var(--text-secondary)]">Ingreso</span>
          <span className="font-mono text-xs font-semibold text-[var(--text-primary)]">
            {formatArs(revenueArs)}
          </span>
        </div>
        <div className="rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-hairline)] px-2 py-2">
          <span className="flex items-center justify-center gap-1 text-[10px] text-[var(--text-secondary)]">
            <Leaf size={10} weight="regular" className="text-[#276EF1]" aria-hidden="true" />
            <span>CO2e</span>
          </span>
          <span className="font-mono text-xs font-semibold text-[#276EF1]">
            -{routeCarbonEstimate.co2SavedKg.toLocaleString('es-AR')} kg
          </span>
        </div>
      </div>

      {/* Primary Uber/MeLi Single Action Button */}
      {activeRoute.tripStatus === 'docked' && (
        <ActionButton
          variant="dark"
          onClick={() => startRouteTrip(activeRoute.id)}
          confirmedLabel="Salida precintada"
          confirmBeatMs={200}
          className="min-h-[50px]"
        >
          <span>Iniciar recorrido</span>
          <ArrowRight size={16} weight="bold" aria-hidden="true" />
        </ActionButton>
      )}

      {(activeRoute.tripStatus === 'in_transit' || activeRoute.tripStatus === 'near_dock') && (
        <div className="space-y-2">
          <ActionButton
            onClick={() => advanceNextCheckpoint(activeRoute.id)}
            confirmedLabel={
              activeRoute.tripStatus === 'near_dock' ? 'Arribo registrado' : 'Parada registrada'
            }
            confirmBeatMs={180}
            className="min-h-[50px]"
          >
            <span>
              {activeRoute.tripStatus === 'near_dock'
                ? 'Confirmar llegada a dársena'
                : `Confirmar paso: ${nextCp?.city.split(',')[0]}`}
            </span>
            <ArrowRight size={16} weight="bold" aria-hidden="true" />
          </ActionButton>

          {!showIncidentBox ? (
            <button
              type="button"
              onClick={() => setShowIncidentBox(true)}
              className="flex min-h-[38px] w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-4 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <Camera size={14} weight="regular" aria-hidden="true" />
              <span>Reportar corte con foto ({currentCp?.city.split(',')[0]})</span>
            </button>
          ) : (
            <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-2.5 space-y-2">
              <div className="flex items-center gap-2.5">
                <img
                  src="/images/incident-road-block.jpg"
                  alt="Vista de corte en ruta desde cabina"
                  className="h-14 w-20 shrink-0 rounded-lg object-cover"
                />
                <p className="text-[11px] text-[var(--text-secondary)]">
                  RN 9 km 214 (+35 min) con solicitud de relevo preventivo.
                </p>
              </div>
              <div className="flex gap-2">
                <ActionButton
                  variant="dark"
                  onClick={handleSendIncident}
                  confirmedLabel="Alerta enviada"
                  confirmBeatMs={200}
                  className="min-h-[38px] text-xs"
                >
                  <span>Enviar alerta</span>
                </ActionButton>
                <button
                  type="button"
                  onClick={() => setShowIncidentBox(false)}
                  className="cursor-pointer rounded-full border border-[var(--border-hairline)] px-4 py-2 text-xs text-[var(--text-secondary)]"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeRoute.tripStatus === 'incident' && activeRoute.incident && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5 rounded-xl border border-[var(--border-hairline)] p-2.5">
            <img
              src={activeRoute.incident.photoUrl}
              alt="Corte reportado en ruta"
              className="h-14 w-20 shrink-0 rounded-lg object-cover"
            />
            <div className="min-w-0 text-xs">
              <p className="flex items-center gap-1 font-semibold text-[var(--text-primary)]">
                <Warning size={14} weight="bold" className="text-[#D97706]" aria-hidden="true" />
                <span>{activeRoute.incident.kmLocation}</span>
              </p>
              <p className="truncate text-[11px] text-[var(--text-secondary)]">
                {activeRoute.incident.relayCarrierName ?? 'Desvío preventivo'}
              </p>
            </div>
          </div>
          <ActionButton
            onClick={() => resolveRoadIncident(activeRoute.id)}
            confirmedLabel="Ruta normalizada"
            confirmBeatMs={180}
            className="min-h-[48px]"
          >
            <span>Reanudar recorrido</span>
          </ActionButton>
        </div>
      )}

      {activeRoute.tripStatus === 'arrived' && (
        <ActionButton
          onClick={() => setActiveRole('receiver')}
          confirmedLabel="Abriendo Planta"
          confirmBeatMs={180}
          className="min-h-[50px]"
        >
          <span>Pasar a recepción en Planta</span>
          <ArrowRight size={15} weight="bold" aria-hidden="true" />
        </ActionButton>
      )}

      {activeRoute.tripStatus === 'delivered' && (
        <div className="flex items-center gap-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-3 text-xs font-medium text-[var(--text-primary)]">
          <CheckCircle size={18} weight="bold" className="text-[#276EF1] shrink-0" aria-hidden="true" />
          <span>Viaje liquidado en destino ({formatArs(revenueArs)})</span>
        </div>
      )}
    </aside>
  );
}
