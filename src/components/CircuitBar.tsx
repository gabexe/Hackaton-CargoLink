import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, CheckCircle, WarningCircle, X } from '@phosphor-icons/react';
import { useSimulation } from '../context/SimulationContext';

type PhaseState = 'done' | 'active' | 'incident' | 'upcoming';

export function CircuitBar() {
  const shouldReduceMotion = useReducedMotion();
  const {
    activeRole,
    activeRoute,
    handoffHint,
    setActiveRole,
    selectRoute,
    dismissHandoffHint,
  } = useSimulation();

  const identityLine =
    activeRole === 'shipper'
      ? 'Vista: Plásticos Polo 52 SA (Dador PyME)'
      : activeRole === 'carrier'
        ? `Vista: ${activeRoute.carrierName} (Flota y Chofer)`
        : `Vista: ${activeRoute.receiverPlantName} (Dársena destino)`;

  const hasUserBooking = activeRoute.slots.some((slot) => slot.status === 'user_booked');
  const status = activeRoute.tripStatus;

  const phases: Array<{ id: string; label: string; state: PhaseState }> = [
    {
      id: 'offer',
      label: 'Oferta',
      state: 'done',
    },
    {
      id: 'booking',
      label: 'Reserva',
      state: status === 'docked' ? (hasUserBooking ? 'done' : 'active') : 'done',
    },
    {
      id: 'transit',
      label: 'En ruta',
      state:
        status === 'incident'
          ? 'incident'
          : status === 'in_transit' || status === 'near_dock'
            ? 'active'
            : status === 'arrived' || status === 'delivered'
              ? 'done'
              : 'upcoming',
    },
    {
      id: 'unload',
      label: 'Descarga',
      state: status === 'arrived' ? 'active' : status === 'delivered' ? 'done' : 'upcoming',
    },
  ];

  const handleHandoffClick = () => {
    if (!handoffHint) {
      return;
    }
    setActiveRole(handoffHint.targetRole);
    selectRoute(handoffHint.routeId);
    dismissHandoffHint();
  };

  return (
    <section aria-label="Estado del circuito operativo" className="space-y-2.5">
      <div className="flex flex-col gap-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            {identityLine}
          </span>
          <span className="shrink-0 rounded-full bg-[var(--bg-subtle)] px-2.5 py-0.5 font-mono text-xs font-medium text-[var(--text-secondary)]">
            {activeRoute.code}
          </span>
        </div>

        <ol
          aria-label="Fases de operación de la unidad"
          className="grid grid-cols-4 gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-2"
        >
          {phases.map((phase) => {
            const pillClass =
              phase.state === 'active'
                ? 'border-[#276EF1] bg-[#276EF1] text-[#FEFEFE]'
                : phase.state === 'incident'
                  ? 'border-[#141414] bg-[#141414] text-[#F6F6F6] dark:border-[#F5F5F7] dark:bg-[#F5F5F7] dark:text-[#111112]'
                  : phase.state === 'done'
                    ? 'border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[var(--text-primary)]'
                    : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]';

            return (
              <li
                key={phase.id}
                className={`inline-flex min-h-[28px] items-center justify-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium transition-colors sm:px-3 sm:text-xs ${pillClass}`}
              >
                {phase.state === 'done' && (
                  <CheckCircle
                    size={13}
                    weight="regular"
                    className="hidden shrink-0 sm:inline"
                    aria-hidden="true"
                  />
                )}
                {phase.state === 'incident' && (
                  <WarningCircle
                    size={13}
                    weight="regular"
                    className="hidden shrink-0 sm:inline"
                    aria-hidden="true"
                  />
                )}
                <span className="truncate">{phase.label}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <AnimatePresence initial={false}>
        {handoffHint && (
          <motion.div
            key={`${handoffHint.targetRole}-${handoffHint.routeId}-${handoffHint.ctaLabel}`}
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.16, ease: 'easeOut' }}
            role="status"
            aria-live="polite"
            className="flex flex-col gap-2.5 rounded-xl border border-[#276EF1]/35 bg-[#276EF1]/[0.07] px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between dark:bg-[#276EF1]/15"
          >
            <p className="text-xs font-medium leading-snug text-[var(--text-primary)] sm:text-sm">
              {handoffHint.message}
            </p>

            <div className="flex shrink-0 items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleHandoffClick}
                className="inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full bg-[#276EF1] px-3.5 py-1.5 text-xs font-semibold text-[#FEFEFE] transition-colors hover:bg-[#1E5BD6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#276EF1]"
              >
                <span>{handoffHint.ctaLabel}</span>
                <ArrowRight size={13} weight="regular" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={dismissHandoffHint}
                aria-label="Descartar aviso de siguiente paso"
                className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#276EF1]"
              >
                <X size={15} weight="regular" aria-hidden="true" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
