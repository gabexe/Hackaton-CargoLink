import { motion, useReducedMotion } from 'motion/react';
import {
  CheckCircle,
  LockSimple,
  Package,
  Plus,
  ShieldCheck,
  Truck,
  X,
} from '@phosphor-icons/react';
import { useSimulation } from '../context/SimulationContext';
import type { PalletSlot } from '../types/logistics';

function formatKg(kg: number): string {
  return `${Math.round(kg).toLocaleString('es-AR')} kg`;
}

export function TrailerCutaway() {
  const shouldReduceMotion = useReducedMotion();
  const {
    activeRoute,
    activeRole,
    selectedSlotIds,
    toggleDraftSlot,
    applyPalletQuantityPreset,
    inspectedSlotId,
    setInspectedSlotId,
  } = useSimulation();

  const orderedSlots: PalletSlot[] = [...activeRoute.slots].sort(
    (a, b) => a.col - b.col || a.row - b.row
  );

  const filledSlots = activeRoute.slots.filter(
    (slot) => slot.status === 'occupied' || slot.status === 'user_booked'
  );
  const totalLoadedKg = filledSlots.reduce((acc, slot) => acc + slot.weightKg, 0);
  const occupancyPct = Math.round((filledSlots.length / activeRoute.slots.length) * 100);
  const hasUserBookedSlots = activeRoute.slots.some((slot) => slot.status === 'user_booked');
  const inspectedSlot =
    inspectedSlotId !== null
      ? activeRoute.slots.find((slot) => slot.id === inspectedSlotId) ?? null
      : null;

  const isDockedForShipper = activeRole === 'shipper' && activeRoute.tripStatus === 'docked';

  return (
    <section
      aria-label="Plano interactivo del semirremolque"
      className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 sm:p-6"
    >
      <div className="flex flex-col justify-between gap-3 border-b border-[var(--border-hairline)] pb-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-subtle)] text-[var(--text-primary)]">
            <Truck size={20} weight="regular" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-sm font-semibold text-[var(--text-primary)]">
                {activeRoute.vehicleLabel}
              </h2>
              {activeRoute.assignedDock && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#276EF1]/40 bg-[#276EF1]/[0.08] px-2 py-0.5 text-[11px] font-medium text-[var(--text-primary)] dark:bg-[#276EF1]/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#276EF1]" aria-hidden="true" />
                  {activeRoute.assignedDock}
                </span>
              )}
            </div>
            <p className="truncate text-xs text-[var(--text-secondary)]">
              {activeRoute.carrierName} - {activeRoute.code}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 py-1 font-mono text-xs font-medium tabular-nums text-[var(--text-primary)]">
            {formatKg(totalLoadedKg)} / 12.000 kg
          </span>
          <span className="rounded-full border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 py-1 font-mono text-xs tabular-nums text-[var(--text-secondary)]">
            {occupancyPct}% ocupado
          </span>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-stretch">
          <div className="flex items-center justify-between rounded-t-xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)] px-3.5 py-2 md:hidden">
            <span className="text-xs font-medium text-[var(--text-primary)]">
              Cabina - Frente de carga
            </span>
            <span className="font-mono text-[11px] tabular-nums text-[var(--text-secondary)]">
              2 x 6 posiciones
            </span>
          </div>

          <div
            aria-hidden="true"
            className="hidden w-14 shrink-0 flex-col items-center justify-between rounded-l-2xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)] py-4 md:flex"
          >
            <span className="h-12 w-2.5 rounded-full bg-[var(--text-primary)]/15" />
            <span className="font-mono text-[10px] font-medium text-[var(--text-secondary)]">
              Frente
            </span>
            <span className="h-4 w-4 rounded-full border-2 border-[var(--text-secondary)]/50 bg-[var(--bg-surface)]" />
          </div>

          <div className="flex-1 rounded-xl border-2 border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-3 sm:p-4 md:rounded-l-lg md:rounded-r-xl">
            <div
              role="group"
              aria-label="Bahías de pallets del semirremolque"
              className="grid grid-cols-2 gap-2.5 md:grid-flow-col md:grid-cols-6 md:grid-rows-2"
            >
              {orderedSlots.map((slot) => {
                const isInspected = inspectedSlotId === slot.id;
                const isSelectedDraft = isDockedForShipper && selectedSlotIds.includes(slot.id);

                if (activeRole === 'shipper') {
                  if (slot.status === 'user_booked') {
                    return (
                      <motion.button
                        key={slot.id}
                        type="button"
                        onClick={() => setInspectedSlotId(isInspected ? null : slot.id)}
                        aria-pressed={isInspected}
                        aria-label={`${slot.id} tu carga reservada, ${slot.cargoLabel ?? 'Pallet'}, ${slot.weightKg} kg`}
                        whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                        transition={{ duration: 0.12 }}
                        className={`flex min-h-[84px] min-w-0 cursor-pointer flex-col justify-between overflow-hidden rounded-lg border p-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#276EF1] md:min-h-[98px] md:p-2 ${
                          isInspected
                            ? 'border-[#276EF1] bg-[#276EF1] text-[#FEFEFE]'
                            : 'border-[#276EF1] bg-[#141414] text-[#F6F6F6] ring-1 ring-[#276EF1] dark:bg-[#F5F5F7] dark:text-[#111112]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono text-[11px] font-medium opacity-85">
                            {slot.id}
                          </span>
                          {slot.protectedCargo ? (
                            <ShieldCheck
                              size={14}
                              weight="regular"
                              className="shrink-0"
                              aria-hidden="true"
                            />
                          ) : (
                            <CheckCircle
                              size={14}
                              weight="regular"
                              className="shrink-0"
                              aria-hidden="true"
                            />
                          )}
                        </div>

                        <div className="mt-2 min-w-0">
                          <p className="truncate text-[11px] font-semibold leading-tight">
                            Tu carga
                          </p>
                          <p className="mt-0.5 truncate font-mono text-[10px] tabular-nums opacity-85">
                            {slot.cargoLabel ?? 'Pallet'} - {slot.weightKg} kg
                          </p>
                        </div>
                      </motion.button>
                    );
                  }

                  if (slot.status === 'occupied') {
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        disabled
                        aria-disabled="true"
                        aria-label={`${slot.id} ocupado, ${slot.cargoLabel ?? 'Consolidado'}, ${slot.weightKg} kg`}
                        className="flex min-h-[84px] min-w-0 cursor-not-allowed flex-col justify-between overflow-hidden rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-2.5 text-left opacity-85 md:min-h-[98px] md:p-2"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono text-[11px] font-medium text-[var(--text-secondary)]">
                            {slot.id}
                          </span>
                          <LockSimple
                            size={14}
                            weight="regular"
                            className="shrink-0 text-[var(--text-secondary)]"
                            aria-hidden="true"
                          />
                        </div>

                        <div className="mt-2 min-w-0">
                          <div className="flex items-center gap-1 text-[var(--text-primary)]">
                            <Package
                              size={13}
                              weight="regular"
                              className="shrink-0 text-[var(--text-secondary)]"
                              aria-hidden="true"
                            />
                            <span className="truncate text-[11px] font-medium">
                              {slot.cargoLabel ?? 'Consolidado'}
                            </span>
                          </div>
                          <p className="mt-0.5 font-mono text-[11px] tabular-nums text-[var(--text-secondary)]">
                            {slot.weightKg} kg
                          </p>
                        </div>
                      </button>
                    );
                  }

                  if (activeRoute.tripStatus !== 'docked') {
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        disabled
                        aria-disabled="true"
                        aria-label={`${slot.id} cerrado porque la unidad ya despachó`}
                        className="flex min-h-[84px] min-w-0 cursor-not-allowed flex-col justify-between overflow-hidden rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-subtle)]/65 p-2.5 text-left opacity-70 md:min-h-[98px] md:p-2"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono text-[11px] font-medium text-[var(--text-secondary)]">
                            {slot.id}
                          </span>
                          <LockSimple
                            size={14}
                            weight="regular"
                            className="shrink-0 text-[var(--text-secondary)]"
                            aria-hidden="true"
                          />
                        </div>
                        <div className="mt-2 min-w-0">
                          <p className="truncate text-[11px] font-medium text-[var(--text-secondary)]">
                            Cerrado
                          </p>
                          <p className="mt-0.5 truncate font-mono text-[10px] text-[var(--text-secondary)]">
                            Sin carga
                          </p>
                        </div>
                      </button>
                    );
                  }

                  return (
                    <motion.button
                      key={slot.id}
                      type="button"
                      onClick={() => {
                        setInspectedSlotId(null);
                        toggleDraftSlot(slot.id);
                      }}
                      aria-pressed={isSelectedDraft}
                      aria-label={
                        isSelectedDraft
                          ? `${slot.id} seleccionado, tocar para liberar`
                          : `${slot.id} libre, tocar para reservar`
                      }
                      whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                      transition={{ duration: 0.12 }}
                      className={`flex min-h-[84px] min-w-0 cursor-pointer flex-col justify-between overflow-hidden rounded-lg border p-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#276EF1] md:min-h-[98px] md:p-2 ${
                        isSelectedDraft
                          ? 'border-[#276EF1] bg-[#276EF1] text-[#FEFEFE] shadow-xs'
                          : 'border-dashed border-[#A1A1AA]/75 bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[#276EF1] hover:bg-[#276EF1]/[0.05] dark:border-[#545454]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`font-mono text-[11px] font-medium ${
                            isSelectedDraft ? 'text-[#FEFEFE]/90' : 'text-[var(--text-secondary)]'
                          }`}
                        >
                          {slot.id}
                        </span>
                        {isSelectedDraft ? (
                          <CheckCircle
                            size={16}
                            weight="regular"
                            className="shrink-0 text-[#FEFEFE]"
                            aria-hidden="true"
                          />
                        ) : (
                          <Plus
                            size={14}
                            weight="regular"
                            className="shrink-0 text-[#276EF1]"
                            aria-hidden="true"
                          />
                        )}
                      </div>

                      <div className="mt-2 min-w-0">
                        <p
                          className={`truncate text-[11px] font-semibold leading-tight tracking-tight ${
                            isSelectedDraft ? 'text-[#FEFEFE]' : 'text-[var(--text-primary)]'
                          }`}
                        >
                          {isSelectedDraft ? 'Seleccionado' : '+ Libre'}
                        </p>
                        <p
                          className={`mt-0.5 truncate font-mono text-[10px] tabular-nums ${
                            isSelectedDraft ? 'text-[#FEFEFE]/85' : 'text-[var(--text-secondary)]'
                          }`}
                        >
                          {isSelectedDraft ? '1 pallet' : '1.000 kg max'}
                        </p>
                      </div>
                    </motion.button>
                  );
                }

                if (activeRole === 'carrier') {
                  if (slot.status === 'available') {
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        disabled
                        aria-disabled="true"
                        aria-label={`${slot.id} libre`}
                        className="flex min-h-[84px] min-w-0 cursor-default flex-col justify-between overflow-hidden rounded-lg border border-dashed border-[var(--border-hairline)] bg-[var(--bg-surface)]/70 p-2.5 text-left opacity-75 md:min-h-[98px] md:p-2"
                      >
                        <span className="font-mono text-[11px] font-medium text-[var(--text-secondary)]">
                          {slot.id}
                        </span>
                        <div className="mt-2 min-w-0">
                          <p className="truncate text-[11px] font-medium text-[var(--text-secondary)]">
                            Libre
                          </p>
                          <p className="mt-0.5 truncate font-mono text-[10px] text-[var(--text-secondary)]">
                            Sin asignar
                          </p>
                        </div>
                      </button>
                    );
                  }

                  const isUserBooked = slot.status === 'user_booked';

                  return (
                    <motion.button
                      key={slot.id}
                      type="button"
                      onClick={() => setInspectedSlotId(isInspected ? null : slot.id)}
                      aria-pressed={isInspected}
                      aria-label={`${slot.id} ${slot.shipperName ?? 'Consolidado'}, ${slot.cargoLabel ?? 'Carga'}, ${slot.weightKg} kg`}
                      whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                      transition={{ duration: 0.12 }}
                      className={`flex min-h-[84px] min-w-0 cursor-pointer flex-col justify-between overflow-hidden rounded-lg border p-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#276EF1] md:min-h-[98px] md:p-2 ${
                        isInspected
                          ? 'border-[#276EF1] bg-[#276EF1] text-[#FEFEFE]'
                          : isUserBooked
                            ? 'border-[#276EF1] bg-[#141414] text-[#F6F6F6] ring-1 ring-[#276EF1] dark:bg-[#F5F5F7] dark:text-[#111112]'
                            : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[#276EF1]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-[11px] font-medium opacity-80">
                          {slot.id}
                        </span>
                        {slot.protectedCargo ? (
                          <ShieldCheck
                            size={14}
                            weight="regular"
                            className="shrink-0"
                            aria-hidden="true"
                          />
                        ) : (
                          <Package
                            size={13}
                            weight="regular"
                            className="shrink-0 opacity-75"
                            aria-hidden="true"
                          />
                        )}
                      </div>

                      <div className="mt-2 min-w-0">
                        <p className="truncate text-[11px] font-semibold leading-tight">
                          {slot.shipperName ?? 'Consolidado'}
                        </p>
                        <p className="mt-0.5 truncate font-mono text-[10px] tabular-nums opacity-80">
                          {slot.cargoLabel ?? 'Carga'} - {slot.weightKg} kg
                        </p>
                      </div>
                    </motion.button>
                  );
                }

                // Receiver role
                if (slot.status === 'available') {
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      disabled
                      aria-disabled="true"
                      aria-label={`${slot.id} vacío`}
                      className="flex min-h-[84px] min-w-0 cursor-default flex-col justify-between overflow-hidden rounded-lg border border-dashed border-[var(--border-hairline)] bg-[var(--bg-surface)]/70 p-2.5 text-left opacity-70 md:min-h-[98px] md:p-2"
                    >
                      <span className="font-mono text-[11px] font-medium text-[var(--text-secondary)]">
                        {slot.id}
                      </span>
                      <div className="mt-2 min-w-0">
                        <p className="truncate text-[11px] font-medium text-[var(--text-secondary)]">
                          Vacío
                        </p>
                        <p className="mt-0.5 truncate font-mono text-[10px] text-[var(--text-secondary)]">
                          Sin bulto
                        </p>
                      </div>
                    </button>
                  );
                }

                const isIncomingPyme = slot.status === 'user_booked';

                return (
                  <motion.button
                    key={slot.id}
                    type="button"
                    onClick={() => setInspectedSlotId(isInspected ? null : slot.id)}
                    aria-pressed={isInspected}
                    aria-label={`${slot.id} ${slot.shipperName ?? 'Estiba'}, ${slot.cargoLabel ?? 'Carga'}, ${slot.weightKg} kg`}
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                    transition={{ duration: 0.12 }}
                    className={`flex min-h-[84px] min-w-0 cursor-pointer flex-col justify-between overflow-hidden rounded-lg border p-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#276EF1] md:min-h-[98px] md:p-2 ${
                      isInspected
                        ? 'border-[#276EF1] bg-[#276EF1] text-[#FEFEFE]'
                        : isIncomingPyme
                          ? 'border-[#276EF1] bg-[#276EF1]/[0.10] text-[var(--text-primary)] ring-1 ring-[#276EF1] dark:bg-[#276EF1]/20'
                          : 'border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[var(--text-primary)] hover:border-[#A1A1AA]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[11px] font-medium opacity-80">
                        {slot.id}
                      </span>
                      {slot.protectedCargo ? (
                        <ShieldCheck
                          size={14}
                          weight="regular"
                          className="shrink-0"
                          aria-hidden="true"
                        />
                      ) : (
                        <Package
                          size={13}
                          weight="regular"
                          className="shrink-0 opacity-75"
                          aria-hidden="true"
                        />
                      )}
                    </div>

                    <div className="mt-2 min-w-0">
                      <p className="truncate text-[11px] font-semibold leading-tight">
                        {isIncomingPyme
                          ? slot.shipperName ?? 'Plásticos Polo 52 SA'
                          : slot.cargoLabel ?? 'Estiba'}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-[10px] tabular-nums opacity-80">
                        {isIncomingPyme
                          ? `${slot.cargoLabel ?? 'Pallet'} - ${slot.weightKg} kg`
                          : `${slot.weightKg} kg`}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-b-xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)] px-3.5 py-2 md:hidden">
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              Portón trasero - Dársena
            </span>
            <span className="font-mono text-[11px] text-[var(--text-secondary)]">
              Acceso descarga
            </span>
          </div>

          <div
            aria-hidden="true"
            className="hidden w-5 shrink-0 flex-col items-center justify-between rounded-r-xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)] py-5 md:flex"
          >
            <span className="h-5 w-1 rounded-full bg-[var(--text-secondary)]/50" />
            <span className="h-5 w-1 rounded-full bg-[var(--text-secondary)]/50" />
          </div>
        </div>

        <div
          aria-hidden="true"
          className="mt-2 hidden items-center justify-between px-16 md:flex"
        >
          <span className="text-[11px] text-[var(--text-secondary)]">Cabina tractora</span>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-[var(--text-secondary)]">
              Eje trasero - Portón de dársena
            </span>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-5 rounded-full bg-[var(--text-primary)]/25" />
              <span className="h-2.5 w-5 rounded-full bg-[var(--text-primary)]/25" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-[var(--border-hairline)] pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {activeRole === 'shipper' && (
            <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-secondary)]">
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="h-3 w-3 rounded-[3px] border border-[var(--border-hairline)] bg-[var(--bg-subtle)]"
                />
                Ocupado
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="h-3 w-3 rounded-[3px] border border-dashed border-[#A1A1AA] bg-[var(--bg-surface)]"
                />
                Disponible
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="h-3 w-3 rounded-[3px] bg-[#276EF1]" />
                Seleccionado
              </span>
              {hasUserBookedSlots && (
                <span className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="h-3 w-3 rounded-[3px] border border-[#276EF1] bg-[#141414] dark:bg-[#F5F5F7]"
                  />
                  Tu carga
                </span>
              )}
            </div>
          )}

          {activeRole === 'carrier' && (
            <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-secondary)]">
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="h-3 w-3 rounded-[3px] border border-[var(--border-hairline)] bg-[var(--bg-surface)]"
                />
                Consolidado
              </span>
              {hasUserBookedSlots && (
                <span className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="h-3 w-3 rounded-[3px] border border-[#276EF1] bg-[#141414] dark:bg-[#F5F5F7]"
                  />
                  Reserva PyME
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="h-3 w-3 rounded-[3px] border border-dashed border-[#A1A1AA] bg-[var(--bg-surface)]"
                />
                Libre
              </span>
            </div>
          )}

          {activeRole === 'receiver' && (
            <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-secondary)]">
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="h-3 w-3 rounded-[3px] border border-[var(--border-hairline)] bg-[var(--bg-subtle)]"
                />
                Carga general
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="h-3 w-3 rounded-[3px] border border-[#276EF1] bg-[#276EF1]/20"
                />
                Pallet entrante PyME
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="h-3 w-3 rounded-[3px] border border-dashed border-[#A1A1AA] bg-[var(--bg-surface)]"
                />
                Vacío
              </span>
            </div>
          )}

          {activeRole === 'shipper' && selectedSlotIds.length > 0 && !inspectedSlot && (
            <button
              type="button"
              onClick={() => applyPalletQuantityPreset(0)}
              className="cursor-pointer text-xs font-medium text-[var(--text-secondary)] underline-offset-4 hover:text-[var(--text-primary)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#276EF1]"
            >
              Limpiar selección
            </button>
          )}
        </div>

        {inspectedSlot && (
          <div
            role="region"
            aria-label="Detalle de bahía seleccionada"
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-xs"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="rounded-md bg-[var(--bg-subtle)] px-2 py-0.5 font-mono font-semibold text-[var(--text-primary)]">
                {inspectedSlot.id}
              </span>
              <span className="font-semibold text-[var(--text-primary)]">
                {inspectedSlot.shipperName ?? 'Dador consolidado'}
              </span>
              {inspectedSlot.bookingCode && (
                <span className="font-mono text-[var(--text-secondary)]">
                  {inspectedSlot.bookingCode}
                </span>
              )}
              <span className="text-[var(--text-secondary)]">
                {inspectedSlot.cargoLabel ?? 'Carga general'}
              </span>
              <span className="font-mono tabular-nums text-[var(--text-primary)]">
                {formatKg(inspectedSlot.weightKg)}
              </span>
              <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]">
                {inspectedSlot.protectedCargo && (
                  <ShieldCheck size={14} weight="regular" aria-hidden="true" />
                )}
                <span>
                  {inspectedSlot.protectedCargo ? 'Protección +2,5%' : 'Estiba estándar'}
                </span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => setInspectedSlotId(null)}
              aria-label="Cerrar detalle de bahía"
              className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#276EF1]"
            >
              <X size={14} weight="regular" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
