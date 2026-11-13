import { useState } from 'react';
import { ArrowRight, Plus } from '@phosphor-icons/react';
import { useSimulation } from '../context/SimulationContext';
import type { TripStatus } from '../types/logistics';
import { RouteBuilderModal } from './RouteBuilderModal';

function getShortStatus(status: TripStatus, freeCount: number): { label: string; highlight: boolean } {
  switch (status) {
    case 'docked':
      return { label: `${freeCount} libres`, highlight: false };
    case 'near_dock':
      return { label: '<10 km', highlight: true };
    case 'in_transit':
      return { label: 'En ruta', highlight: false };
    case 'incident':
      return { label: 'Alerta', highlight: true };
    case 'arrived':
      return { label: 'En dársena', highlight: true };
    case 'delivered':
      return { label: 'Entregado', highlight: false };
  }
}

function shortCity(full: string): string {
  return full.split(',')[0].replace('Polo 52', 'Cba').replace('CABA / Zona Norte', 'BsAs').replace('Rosario', 'Ros').replace('Jesús María', 'J.María');
}

export function FleetStrip() {
  const { routes, selectedRouteId, selectRoute, createCustomRoute } = useSimulation();
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

  return (
    <>
      <div
        role="radiogroup"
        aria-label="Corredores activos"
        className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5"
      >
        {routes.map((route) => {
          const isActive = route.id === selectedRouteId;
          const freeCount = route.slots.filter((s) => s.status === 'available').length;
          const status = getShortStatus(route.tripStatus, freeCount);

          return (
            <button
              key={route.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => selectRoute(route.id)}
              className={`inline-flex min-h-[34px] shrink-0 cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#276EF1] ${
                isActive
                  ? 'border-[#141414] bg-[#141414] text-[#F6F6F6] dark:border-[#F5F5F7] dark:bg-[#F5F5F7] dark:text-[#111112]'
                  : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[#A1A1AA]'
              }`}
            >
              <span className="font-mono font-semibold">{route.code}</span>
              <span className="hidden items-center gap-1 whitespace-nowrap font-medium sm:inline-flex">
                <span>{shortCity(route.origin)}</span>
                <ArrowRight size={10} weight="regular" className="opacity-65" aria-hidden="true" />
                <span>{shortCity(route.destination)}</span>
              </span>
              <span
                className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] tabular-nums ${
                  status.highlight
                    ? 'bg-[#276EF1] text-[#FEFEFE]'
                    : isActive
                      ? 'bg-[#F6F6F6]/15 text-current dark:bg-[#111112]/15'
                      : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                }`}
              >
                {status.label}
              </span>
            </button>
          );
        })}

        {/* Subtle "+ Nueva ruta real" button */}
        <button
          type="button"
          onClick={() => setIsBuilderOpen(true)}
          className="inline-flex min-h-[34px] shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[#276EF1]"
        >
          <Plus size={13} weight="bold" />
          <span>Nueva ruta real</span>
        </button>
      </div>

      <RouteBuilderModal
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        onSubmit={async (data) => {
          await createCustomRoute(data);
        }}
      />
    </>
  );
}
