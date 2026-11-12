import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  CheckCircle,
  MapPin,
} from '@phosphor-icons/react';
import { useSimulation } from '../context/SimulationContext';
import { estimateCarbonSavings } from '../utils/carbon';
import { ActionButton } from './ActionButton';
import { CarbonFootprintCard } from './CarbonFootprintCard';

const DOCK_OPTIONS = ['Dársena 1', 'Dársena 2', 'Rampa Este'] as const;

export function ReceiverPanel() {
  const shouldReduceMotion = useReducedMotion();
  const {
    activeRoute,
    setActiveRole,
    assignReceivingDock,
    confirmDeliveryUnload,
  } = useSimulation();

  const occupiedSlots = activeRoute.slots.filter((s) => s.status !== 'available');
  const carbonEstimate = estimateCarbonSavings(activeRoute, occupiedSlots.length);
  const canUnload =
    activeRoute.tripStatus === 'near_dock' || activeRoute.tripStatus === 'arrived';

  // Vista 3B: Auditoría final y certificado ambiental
  if (activeRoute.tripStatus === 'delivered') {
    return (
      <aside aria-label="Recepción completada" className="space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[#276EF1]">
            <CheckCircle size={20} weight="bold" aria-hidden="true" />
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Descarga confirmada
            </h2>
          </div>
          <span className="rounded-full bg-[var(--bg-subtle)] px-2.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">
            {activeRoute.assignedDock ?? 'Dársena 1'}
          </span>
        </div>

        <CarbonFootprintCard
          estimate={carbonEstimate}
          title="Certificado ambiental del tramo"
          compact
        />
      </aside>
    );
  }

  // Vista 3A: Radar de geocerca <10 km y asignación de rampa en 1 toque
  return (
    <aside aria-label="Recepción en destino" className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] text-[var(--text-secondary)]">
            Receptora · {activeRoute.receiverPlantName}
          </p>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Asignar rampa y descargar
          </h2>
        </div>
        {activeRoute.tripStatus === 'near_dock' && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#276EF1] px-2.5 py-1 font-mono text-[10px] font-semibold text-[#FEFEFE]">
            <MapPin size={11} weight="bold" aria-hidden="true" />
            <span>&lt;10 km</span>
          </span>
        )}
      </div>

      {/* 1-Tap Dock Selector */}
      <div className="grid grid-cols-3 gap-1.5">
        {DOCK_OPTIONS.map((dock) => {
          const isAssigned = activeRoute.assignedDock === dock;
          return (
            <motion.button
              key={dock}
              type="button"
              whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
              onClick={() => assignReceivingDock(activeRoute.id, dock)}
              aria-pressed={isAssigned}
              className={`min-h-[40px] cursor-pointer rounded-xl border px-2 py-1.5 text-xs font-medium transition-colors ${
                isAssigned
                  ? 'border-[#141414] bg-[#141414] text-[#F6F6F6] dark:border-[#F5F5F7] dark:bg-[#F5F5F7] dark:text-[#111112]'
                  : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              {dock}
            </motion.button>
          );
        })}
      </div>

      {/* Unload Verification when near or arrived */}
      {canUnload ? (
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center gap-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-2">
            <img
              src="/images/cargo-pallet-seal.jpg"
              alt="Control de precinto y estiba en dársena"
              className="h-12 w-18 shrink-0 rounded-lg object-cover"
            />
            <div className="min-w-0 text-xs">
              <p className="font-semibold text-[var(--text-primary)]">Precinto verificado</p>
              <p className="text-[11px] text-[var(--text-secondary)]">
                {occupiedSlots.length} módulos listos para descarga
              </p>
            </div>
          </div>

          <ActionButton
            onClick={() => confirmDeliveryUnload(activeRoute.id)}
            confirmedLabel="Descarga registrada"
            confirmBeatMs={220}
            className="min-h-[48px]"
          >
            <CheckCircle size={16} weight="bold" aria-hidden="true" />
            <span>Confirmar descarga</span>
          </ActionButton>
        </div>
      ) : (
        <div className="space-y-2 pt-1">
          <p className="text-[11px] text-[var(--text-secondary)]">
            Habilitado al entrar al radio de 10 km de planta.
          </p>
          <ActionButton
            variant="secondary"
            onClick={() => setActiveRole('carrier')}
            confirmedLabel="Abriendo Chofer"
            confirmBeatMs={180}
          >
            <span>Simular avance como Chofer</span>
            <ArrowRight size={13} weight="regular" aria-hidden="true" />
          </ActionButton>
        </div>
      )}
    </aside>
  );
}
