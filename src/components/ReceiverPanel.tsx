import {
  ArrowRight,
  CheckCircle,
  Clock,
  Cube,
  MapPin,
  ShieldCheck,
  Truck,
} from '@phosphor-icons/react';
import { useSimulation } from '../context/SimulationContext';
import { estimateCarbonSavings } from '../utils/carbon';
import { ActionButton } from './ActionButton';
import { CarbonFootprintCard } from './CarbonFootprintCard';
import type { ThemeMode } from '../types/logistics';
import { CorridorMap } from './CorridorMap';

const DOCK_OPTIONS = ['Dársena 1', 'Dársena 2', 'Rampa Este'] as const;

export function ReceiverPanel({ theme }: { theme?: ThemeMode }) {
  const {
    activeRoute,
    setActiveRole,
    assignReceivingDock,
    confirmDeliveryUnload,
    triggerNearDockAlert,
  } = useSimulation();

  const occupiedSlots = activeRoute.slots.filter((s) => s.status !== 'available');
  const carbonEstimate = estimateCarbonSavings(activeRoute, occupiedSlots.length);
  const isNearOrArrived =
    activeRoute.tripStatus === 'near_dock' || activeRoute.tripStatus === 'arrived';
  const isDelivered = activeRoute.tripStatus === 'delivered';

  // Group slots by shipper/booking for the manifest
  const manifestGroups = occupiedSlots.reduce((acc, slot) => {
    const key = slot.shipperName ?? 'Dador PyME Consolidado';
    if (!acc[key]) {
      acc[key] = {
        shipper: key,
        cargo: slot.cargoLabel ?? 'Carga seca general',
        format: slot.packagingFormat ?? 'pallet',
        slots: [] as string[],
        totalWeightKg: 0,
        bookingCode: slot.bookingCode ?? 'TRM-8821',
      };
    }
    acc[key].slots.push(slot.id);
    acc[key].totalWeightKg += slot.weightKg;
    return acc;
  }, {} as Record<string, { shipper: string; cargo: string; format: string; slots: string[]; totalWeightKg: number; bookingCode: string }>);

  // Vista Auditoría final y certificado ambiental
  if (isDelivered) {
    return (
      <div className="w-full flex flex-col space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#276EF1] text-[#FEFEFE]">
              <CheckCircle size={22} weight="bold" aria-hidden="true" />
            </div>
            <div>
              <span className="text-xs font-mono font-semibold text-[var(--text-secondary)]">
                {activeRoute.code} · Recepción finalizada
              </span>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Descarga y precinto conformados en {activeRoute.assignedDock ?? 'Dársena 1'}
              </h2>
            </div>
          </div>
          <span className="rounded-full bg-[var(--bg-subtle)] px-3 py-1 font-mono text-xs font-semibold text-[var(--text-primary)] self-start sm:self-auto">
            {activeRoute.receiverPlantName}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 space-y-4">
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Manifiesto de descarga cumplido
            </h3>
            <div className="space-y-3">
              {Object.values(manifestGroups).map((group) => (
                <div
                  key={group.shipper}
                  className="flex items-center justify-between rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-3 text-xs"
                >
                  <div>
                    <p className="font-bold text-[var(--text-primary)]">{group.shipper}</p>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      {group.cargo} · {group.slots.length} módulos ({group.slots.join(', ')})
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-[var(--text-primary)]">{group.totalWeightKg} kg</span>
                    <span className="block text-[10px] text-[var(--text-secondary)]">{group.bookingCode}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 space-y-4">
            <CarbonFootprintCard
              estimate={carbonEstimate}
              title="Certificado ambiental del tramo"
            />
          </div>
        </div>
      </div>
    );
  }

  // Vista Monitor de Recepción y Dársenas (Dedicada para Planta)
  return (
    <div className="w-full flex flex-col space-y-4">
      {/* Header Planta Receptora */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#276EF1] text-[#FEFEFE]">
            <Truck size={20} weight="bold" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#276EF1]" />
              <span className="text-xs font-mono font-semibold text-[var(--text-secondary)]">
                {activeRoute.code} · Transporte {activeRoute.carrierName}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] truncate">
              {activeRoute.receiverPlantName} · Mesa de Recepción
            </h2>
          </div>
        </div>

        {/* Status Radar Pill */}
        <div className="flex items-center gap-2">
          {activeRoute.tripStatus === 'near_dock' ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#276EF1] px-3.5 py-1.5 font-mono text-xs font-bold text-[#FEFEFE] animate-pulse">
              <MapPin size={14} weight="bold" />
              <span>Camión a &lt;10 km (Aproximando)</span>
            </span>
          ) : activeRoute.tripStatus === 'arrived' ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#141414] dark:bg-[#F5F5F7] px-3.5 py-1.5 text-xs font-bold text-[#F6F6F6] dark:text-[#111112]">
              <CheckCircle size={14} weight="bold" />
              <span>En dársena ({activeRoute.assignedDock ?? 'Dársena 1'})</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 py-1 font-mono text-xs text-[var(--text-secondary)]">
              <Clock size={13} weight="regular" />
              <span>En ruta interurbana (GPS protegido)</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Grid: Manifest + Approach Map / Dock Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left Col: Manifest & Checkpoints Monitor */}
        <div className="lg:col-span-8 flex flex-col rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-hairline)] pb-3">
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Manifiesto de carga entrante
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                {occupiedSlots.length} módulos consolidados a bordo del semirremolque
              </p>
            </div>
            <span className="font-mono text-xs font-bold text-[var(--text-primary)] bg-[var(--bg-subtle)] px-2.5 py-1 rounded-lg">
              Precinto SL-8841-AR
            </span>
          </div>

          {/* Grouped Shipper Cargo Manifest */}
          <div className="space-y-2.5 flex-1">
            {Object.keys(manifestGroups).length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)] py-4 text-center">
                Sin módulos consolidados en este tramo.
              </p>
            ) : (
              Object.values(manifestGroups).map((grp) => (
                <div
                  key={grp.shipper}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-subtle)] text-[#276EF1]">
                      <Cube size={16} weight="bold" />
                    </div>
                    <div>
                      <p className="font-bold text-[var(--text-primary)]">{grp.shipper}</p>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        {grp.cargo} ({grp.format}) · {grp.slots.length} módulos
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:text-right">
                    <span className="font-mono font-semibold text-[var(--text-primary)]">
                      {grp.totalWeightKg.toLocaleString('es-AR')} kg
                    </span>
                    <span className="rounded-md bg-[var(--bg-subtle)] px-2 py-0.5 font-mono text-[11px] text-[var(--text-secondary)]">
                      {grp.bookingCode}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Approach Radar Map View */}
          <div className="pt-2">
            <span className="block text-xs font-semibold text-[var(--text-secondary)] mb-2">
              Ubicación de aproximación al predio
            </span>
            <div className="h-[220px] rounded-xl overflow-hidden border border-[var(--border-hairline)]">
              <CorridorMap theme={theme ?? 'light'} className="h-full" hideFloatingControls />
            </div>
          </div>
        </div>

        {/* Right Col: Dock Assignment & Unload Approval */}
        <div className="lg:col-span-4 flex flex-col justify-between rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 shadow-sm space-y-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Asignación de Dársena
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Seleccioná la rampa disponible para habilitar el ingreso al predio.
              </p>
            </div>

            {/* 3 Large Dock Buttons */}
            <div className="grid grid-cols-1 gap-2">
              {DOCK_OPTIONS.map((dock) => {
                const isAssigned = activeRoute.assignedDock === dock;
                return (
                  <button
                    key={dock}
                    type="button"
                    onClick={() => assignReceivingDock(activeRoute.id, dock)}
                    className={`flex items-center justify-between rounded-xl border p-3 text-xs font-semibold cursor-pointer transition-all ${
                      isAssigned
                        ? 'border-[#276EF1] bg-[#276EF1]/10 text-[#276EF1]'
                        : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-primary)] hover:border-[#276EF1]'
                    }`}
                  >
                    <span>{dock}</span>
                    <span className="text-[11px] font-mono opacity-80">
                      {isAssigned ? 'Asignada' : 'Disponible'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quality and Seal Check */}
            <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                <ShieldCheck size={16} weight="bold" className="text-[#276EF1]" />
                <span>Control de precinto y pesaje</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                El precinto se valida contra el registro fotográfico tomado en origen por el chofer antes de abrir cortinas.
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="space-y-2 pt-2">
            {isNearOrArrived ? (
              <ActionButton
                variant="primary"
                onClick={() => confirmDeliveryUnload(activeRoute.id)}
                confirmedLabel="Descarga registrada"
                className="w-full min-h-[50px]"
              >
                <CheckCircle size={18} weight="bold" />
                <span>Conformar precinto y descarga</span>
              </ActionButton>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => triggerNearDockAlert(activeRoute.id)}
                  className="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 text-xs font-semibold text-[#276EF1] hover:border-[#276EF1]"
                >
                  <MapPin size={14} weight="bold" />
                  <span>Simular camión a &lt;10 km</span>
                </button>
                <ActionButton
                  variant="secondary"
                  onClick={() => setActiveRole('carrier')}
                  confirmedLabel="Abriendo Chofer"
                  className="w-full min-h-[44px]"
                >
                  <span>Ver recorrido como Chofer</span>
                  <ArrowRight size={14} weight="regular" />
                </ActionButton>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
