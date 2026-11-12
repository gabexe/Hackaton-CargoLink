import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Check } from '@phosphor-icons/react';

export interface ActionButtonProps {
  onClick: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'dark' | 'secondary';
  confirmedLabel?: string;
  confirmBeatMs?: number;
  className?: string;
  children: ReactNode;
}

/**
 * Interactive button with tactile press and animated confirmation microinteraction.
 */
export function ActionButton({
  onClick,
  disabled = false,
  type = 'button',
  variant = 'primary',
  confirmedLabel,
  confirmBeatMs = 0,
  className = '',
  children,
}: ActionButtonProps) {
  const shouldReduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<'idle' | 'confirming'>('idle');
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      for (const timerId of timersRef.current) {
        window.clearTimeout(timerId);
      }
    };
  }, []);

  const clearTimers = () => {
    for (const timerId of timersRef.current) {
      window.clearTimeout(timerId);
    }
    timersRef.current = [];
  };

  const handlePress = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || phase === 'confirming') {
      if (type === 'submit') {
        event.preventDefault();
      }
      return;
    }

    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(12);
    }

    clearTimers();
    setPhase('confirming');

    if (type === 'submit') {
      if (confirmBeatMs > 0 && !shouldReduceMotion) {
        event.preventDefault();
        const form = event.currentTarget.form;
        const beatTimer = window.setTimeout(() => {
          onClick();
          form?.requestSubmit();
        }, confirmBeatMs);
        const resetTimer = window.setTimeout(() => {
          setPhase('idle');
        }, confirmBeatMs + 650);
        timersRef.current.push(beatTimer, resetTimer);
        return;
      }
      const resetTimer = window.setTimeout(() => setPhase('idle'), 750);
      timersRef.current.push(resetTimer);
      onClick();
      return;
    }

    if (confirmBeatMs > 0 && !shouldReduceMotion) {
      const beatTimer = window.setTimeout(() => {
        onClick();
      }, confirmBeatMs);
      const resetTimer = window.setTimeout(() => {
        setPhase('idle');
      }, confirmBeatMs + 750);
      timersRef.current.push(beatTimer, resetTimer);
    } else {
      onClick();
      const resetTimer = window.setTimeout(() => {
        setPhase('idle');
      }, 750);
      timersRef.current.push(resetTimer);
    }
  };

  const baseVariantClasses =
    variant === 'primary'
      ? 'bg-[#276EF1] text-[#FEFEFE] hover:bg-[#1E5BD6]'
      : variant === 'dark'
        ? 'bg-[#141414] text-[#F6F6F6] hover:opacity-90 dark:bg-[#F5F5F7] dark:text-[#111112]'
        : 'border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]';

  const isConfirming = phase === 'confirming';

  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={handlePress}
      whileTap={disabled || shouldReduceMotion ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 520, damping: 32 }}
      className={`relative overflow-hidden flex min-h-[46px] w-full cursor-pointer items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#276EF1] disabled:cursor-not-allowed disabled:opacity-40 ${baseVariantClasses} ${className}`}
    >
      {isConfirming && !shouldReduceMotion && (
        <motion.span
          aria-hidden="true"
          initial={{ scale: 0.2, opacity: 0.45 }}
          animate={{ scale: 1.8, opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="pointer-events-none absolute inset-0 rounded-full bg-current"
        />
      )}

      <AnimatePresence mode="wait" initial={false}>
        {isConfirming ? (
          <motion.span
            key="confirming"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ type: 'spring', stiffness: 450, damping: 28 }}
            className="inline-flex items-center gap-1.5"
          >
            <Check size={16} weight="bold" aria-hidden="true" />
            <span>{confirmedLabel ?? 'Confirmado'}</span>
          </motion.span>
        ) : (
          <motion.span
            key="idle"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            className="inline-flex items-center justify-center gap-2"
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
