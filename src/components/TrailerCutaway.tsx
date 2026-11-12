import { Suspense, lazy } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Cube, MapTrifold } from '@phosphor-icons/react';
import { useSimulation } from '../context/SimulationContext';
import type { ThemeMode } from '../types/logistics';
import { CorridorMap } from './CorridorMap';

const TruckScene3D = lazy(() =>
  import('./TruckScene3D').then((module) => ({ default: module.TruckScene3D }))
);

export function TrailerCutaway({ theme }: { theme: ThemeMode }) {
  const shouldReduceMotion = useReducedMotion();
  const { canvasView, setCanvasView } = useSimulation();

  return (
    <section
      aria-label="Visor 3D del camión y mapa de ruta"
      className="relative"
    >
      {/* Floating Uber/Waze View Mode Switcher inside top-left of viewport */}
      <div
        role="tablist"
        aria-label="Modo de visualización"
        className="absolute left-2.5 top-2.5 z-20 inline-flex items-center rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)]/92 p-0.5 shadow-sm backdrop-blur-md"
      >
        <button
          type="button"
          role="tab"
          aria-selected={canvasView === '3d'}
          onClick={() => setCanvasView('3d')}
          className={`inline-flex min-h-[28px] cursor-pointer items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
            canvasView === '3d'
              ? 'bg-[#141414] text-[#F6F6F6] dark:bg-[#F5F5F7] dark:text-[#111112]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Cube size={13} weight="regular" aria-hidden="true" />
          <span>Camión 3D</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={canvasView === 'map'}
          onClick={() => setCanvasView('map')}
          className={`inline-flex min-h-[28px] cursor-pointer items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
            canvasView === 'map'
              ? 'bg-[#276EF1] text-[#FEFEFE]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <MapTrifold size={13} weight="regular" aria-hidden="true" />
          <span>Mapa</span>
        </button>
      </div>

      {/* Stage Viewport */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={canvasView}
          initial={shouldReduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={shouldReduceMotion ? undefined : { opacity: 0 }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.14 }}
        >
          {canvasView === '3d' ? (
            <Suspense
              fallback={
                <div className="flex h-[280px] sm:h-[340px] lg:h-[420px] items-center justify-center rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-xs text-[var(--text-secondary)]">
                  Cargando camión 3D...
                </div>
              }
            >
              <TruckScene3D theme={theme} />
            </Suspense>
          ) : (
            <CorridorMap theme={theme} />
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
