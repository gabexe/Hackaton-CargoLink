import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  Bell,
  CheckCircle,
  MapPin,
  Warning,
  X,
} from '@phosphor-icons/react';
import { useSimulation } from '../context/SimulationContext';

export function PushNotificationToast() {
  const { activePushNotification, dismissPushNotification, setActiveRole } = useSimulation();

  if (!activePushNotification) return null;

  const isAlert =
    activePushNotification.title.toLowerCase().includes('corte') ||
    activePushNotification.title.toLowerCase().includes('alerta');
  const isNearDock = activePushNotification.badgeLabel?.includes('<10 km');

  const handleAction = () => {
    setActiveRole(activePushNotification.targetRole);
    dismissPushNotification();
  };

  return (
    <AnimatePresence>
      <motion.div
        role="alert"
        aria-live="assertive"
        initial={{ opacity: 0, y: -24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.96 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="fixed top-3 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-50 pointer-events-auto"
      >
        <div className="flex items-start gap-3 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 shadow-2xl backdrop-blur-md">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#FEFEFE] ${
              isAlert
                ? 'bg-[#D97706]'
                : isNearDock
                  ? 'bg-[#276EF1]'
                  : 'bg-[#276EF1]'
            }`}
          >
            {isAlert ? (
              <Warning size={18} weight="bold" aria-hidden="true" />
            ) : isNearDock ? (
              <MapPin size={18} weight="bold" aria-hidden="true" />
            ) : (
              <Bell size={18} weight="bold" aria-hidden="true" />
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center justify-between gap-1.5">
              <span className="truncate text-xs font-bold text-[var(--text-primary)]">
                {activePushNotification.title}
              </span>
              <span className="shrink-0 font-mono text-[10px] text-[var(--text-secondary)]">
                {activePushNotification.timeLabel}
              </span>
            </div>

            <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
              {activePushNotification.body}
            </p>

            <div className="flex items-center justify-between pt-1">
              {activePushNotification.badgeLabel && (
                <span className="inline-flex items-center gap-1 rounded-md bg-[var(--bg-subtle)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--text-primary)]">
                  {isNearDock && <CheckCircle size={10} weight="bold" className="text-[#276EF1]" />}
                  <span>{activePushNotification.badgeLabel}</span>
                </span>
              )}

              {activePushNotification.actionLabel && (
                <button
                  type="button"
                  onClick={handleAction}
                  className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-[#276EF1] hover:underline"
                >
                  <span>{activePushNotification.actionLabel}</span>
                  <ArrowRight size={12} weight="bold" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={dismissPushNotification}
            aria-label="Cerrar notificación"
            className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
          >
            <X size={13} weight="regular" aria-hidden="true" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
