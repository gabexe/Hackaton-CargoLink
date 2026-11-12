import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { SimulationProvider, useSimulation } from './context/SimulationContext';
import type { ThemeMode } from './types/logistics';
import { Navbar } from './components/Navbar';
import { CircuitBar } from './components/CircuitBar';
import { FleetStrip } from './components/FleetStrip';
import { TrailerCutaway } from './components/TrailerCutaway';
import { ShipperPanel } from './components/ShipperPanel';
import { CarrierPanel } from './components/CarrierPanel';
import { ReceiverPanel } from './components/ReceiverPanel';
import { CorridorVisibility } from './components/CorridorVisibility';
import { Footer } from './components/Footer';

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

function RolePanelStage() {
  const { activeRole } = useSimulation();
  const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={activeRole}
        initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={shouldReduceMotion ? undefined : { opacity: 0, y: -6 }}
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.16, ease: 'easeOut' }}
      >
        {activeRole === 'shipper' && <ShipperPanel />}
        {activeRole === 'carrier' && <CarrierPanel />}
        {activeRole === 'receiver' && <ReceiverPanel />}
      </motion.div>
    </AnimatePresence>
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
      <div className="min-h-dvh bg-[var(--bg-canvas)] text-[var(--text-primary)] antialiased transition-colors duration-200 flex flex-col">
        <Navbar theme={theme} onToggleTheme={handleToggleTheme} />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-6">
          <CircuitBar />
          <FleetStrip />
          <section
            id="circuito"
            aria-label="Mesa operativa de unidad y rol"
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start scroll-mt-20"
          >
            <div className="lg:col-span-7 xl:col-span-8">
              <TrailerCutaway />
            </div>
            <div className="lg:col-span-5 xl:col-span-4">
              <RolePanelStage />
            </div>
          </section>
          <CorridorVisibility />
        </main>
        <Footer />
      </div>
    </SimulationProvider>
  );
}

export default App;
