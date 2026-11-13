import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { SimulationProvider, useSimulation } from './context/SimulationContext';
import type { ThemeMode } from './types/logistics';
import { Navbar } from './components/Navbar';
import { FleetStrip } from './components/FleetStrip';
import { TrailerCutaway } from './components/TrailerCutaway';
import { ShipperPanel } from './components/ShipperPanel';
import { ReceiverPanel } from './components/ReceiverPanel';
import { CarrierPhoneView } from './components/CarrierPhoneView';
import { CheckpointTimelineCard } from './components/CheckpointTimelineCard';
import { PushNotificationToast } from './components/PushNotificationToast';

const THEME_STORAGE_KEY = 'tramo-theme';

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'light';
  }
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
  } catch {
    // Ignore storage restrictions
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function MainWorkstage({ theme }: { theme: ThemeMode }) {
  const { activeRole, activeRoute } = useSimulation();
  const shouldReduceMotion = useReducedMotion();

  // Role 2: Carrier (Chofer) -> Full Viewport Responsive Navigation Console
  if (activeRole === 'carrier') {
    return (
      <div className="w-full">
        <CarrierPhoneView theme={theme} />
      </div>
    );
  }

  // Role 3: Receiver (Planta Receptora) -> Dedicated Intake & Dock Dashboard
  if (activeRole === 'receiver') {
    return (
      <div className="w-full">
        <ReceiverPanel theme={theme} />
      </div>
    );
  }

  // Role 1: Shipper (Dador PyME)
  const isShipperInTransit = activeRoute.tripStatus !== 'docked';

  return (
    <section
      id="circuito"
      aria-label="Mesa operativa"
      className="grid grid-cols-1 lg:grid-cols-12 lg:gap-5 items-start"
    >
      <div className="lg:col-span-8">
        {isShipperInTransit ? (
          <CheckpointTimelineCard theme={theme} />
        ) : (
          <TrailerCutaway theme={theme} />
        )}
      </div>

      <div className="lg:col-span-4 lg:sticky lg:top-18">
        <div className="relative -mt-4 z-20 rounded-t-3xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-4 pt-2.5 pb-5 shadow-[0_-8px_24px_rgba(20,20,20,0.06)] dark:shadow-none lg:mt-0 lg:rounded-2xl lg:p-5">
          {/* Mobile Bottom Sheet Grab Handle */}
          <div
            aria-hidden="true"
            className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--border-hairline)] lg:hidden"
          />
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeRole}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0, y: -4 }}
              transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.14, ease: 'easeOut' }}
            >
              <ShipperPanel />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

export function App() {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = (event: MediaQueryListEvent) => {
      try {
        const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
        if (stored === 'light' || stored === 'dark') {
          return;
        }
      } catch {
        // Ignore storage restrictions
      }
      setTheme(event.matches ? 'dark' : 'light');
    };

    media.addEventListener('change', handleMediaChange);
    return () => media.removeEventListener('change', handleMediaChange);
  }, []);

  const handleToggleTheme = () => {
    setTheme((prev) => {
      const next: ThemeMode = prev === 'light' ? 'dark' : 'light';
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // Ignore storage restrictions
      }
      return next;
    });
  };

  return (
    <SimulationProvider>
      <div className="min-h-dvh bg-[var(--bg-canvas)] text-[var(--text-primary)] antialiased transition-colors duration-200 flex flex-col relative">
        <PushNotificationToast />
        <Navbar theme={theme} onToggleTheme={handleToggleTheme} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-2.5 sm:px-6 pt-2.5 pb-4 sm:py-5 space-y-2.5 sm:space-y-4">
          <FleetStrip />
          <MainWorkstage theme={theme} />
        </main>
      </div>
    </SimulationProvider>
  );
}

export default App;
