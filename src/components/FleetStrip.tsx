import { ArrowRight, CheckCircle, WarningCircle } from '@phosphor-icons/react';
import { useSimulation } from '../context/SimulationContext';
import type { TripStatus } from '../types/logistics';

function formatArs(amount: number): string {
  return `$ ${Math.round(amount).toLocaleString('es-AR')}`;
}

function getStatusBadge(status: TripStatus): {
  label: string;
  className: string;
  showWarningIcon?: boolean;
  showCheckIcon?: boolean;
} {
  switch (status) {
    case 'near_dock':
      return {
        label: 'Próximo (<10 km)',
        className: 'bg-[#276EF1] text-[#FEFEFE] border-[#276EF1]',
      };
    case 'in_transit':
      return {
        label: 'En ruta',
        className:
          'border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[var(--text-primary)]',
      };
    case 'incident':
      return {
        label: 'Novedad vial',
        className:
          'border-[#141414] bg-[#141414] text-[#F6F6F6] dark:border-[#F5F5F7] dark:bg-[#F5F5F7] dark:text-[#111112]',
        showWarningIcon: true,
      };
    case 'arrived':
      return {
        label: 'En destino',
        className:
          'border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[var(--text-primary)]',
      };
    case 'delivered':
      return {
        label: 'Entregado',
        className:
          'border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]',
        showCheckIcon: true,
      };
    case 'docked':
    default:
      return {
        label: 'En dársena',
        className:
          'border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]',
      };
  }
}

export function FleetStrip() {
  const { routes, selectedRouteId, selectRoute } = useSimulation();
  const desktopColsClass = routes.length >= 4 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3';

  return (
    <section aria-label="Flota activa en el corredor">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h1 className="text-sm font-semibold text-[var(--text-primary)]">
          Flota disponible en Corredor RN 9
        </h1>
        <span className="font-mono text-xs tabular-nums text-[var(--text-secondary)]">
          {routes.length} unidades
        </span>
      </div>

      <div
        role="radiogroup"
        aria-label="Seleccionar unidad del corredor"
        className={`flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1.5 md:grid md:overflow-visible md:pb-0 ${desktopColsClass}`}
      >
        {routes.map((route) => {
          const isActive = route.id === selectedRouteId;
          const totalSlots = route.slots.length;
          const occupiedCount = route.slots.filter(
            (slot) => slot.status === 'occupied' || slot.status === 'user_booked'
          ).length;
          const freeCount = totalSlots - occupiedCount;
          const badge = getStatusBadge(route.tripStatus);

          return (
            <button
              key={route.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => selectRoute(route.id)}
              className={`flex min-w-[276px] max-w-[300px] shrink-0 snap-start cursor-pointer flex-col justify-between gap-2.5 rounded-xl border p-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#276EF1] md:min-w-0 md:max-w-none md:shrink ${
                isActive
                  ? 'border-[#276EF1] bg-[var(--bg-surface)] ring-1 ring-[#276EF1]'
                  : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:border-[#A1A1AA]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate rounded-full bg-[var(--bg-subtle)] px-2.5 py-0.5 font-mono text-xs font-medium text-[var(--text-primary)]">
                    {route.code}
                  </span>
                  {route.isBackhaul && (
                    <span className="shrink-0 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-primary)]">
                      Retorno
                    </span>
                  )}
                </div>

                <span
                  className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${badge.className}`}
                >
                  {badge.showWarningIcon && (
                    <WarningCircle size={12} weight="regular" aria-hidden="true" />
                  )}
                  {badge.showCheckIcon && (
                    <CheckCircle size={12} weight="regular" aria-hidden="true" />
                  )}
                  <span>{badge.label}</span>
                </span>
              </div>

              <div className="flex min-w-0 items-center gap-1.5 text-sm font-semibold leading-snug text-[var(--text-primary)]">
                <span className="truncate">{route.origin}</span>
                <ArrowRight
                  size={14}
                  weight="regular"
                  className="shrink-0 text-[var(--text-secondary)]"
                  aria-hidden="true"
                />
                <span className="truncate">{route.destination}</span>
              </div>

              <div className="flex items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
                <span className="font-mono tabular-nums">
                  {occupiedCount}/{totalSlots} pallets
                  {route.tripStatus === 'docked' ? ` (${freeCount} libres)` : ''}
                </span>
                <span className="shrink-0">{route.departureLabel}</span>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-[var(--border-hairline)] pt-2 text-xs">
                <span className="truncate text-[var(--text-secondary)]">
                  {route.carrierName}
                </span>
                <span className="shrink-0 font-mono font-semibold tabular-nums text-[var(--text-primary)]">
                  {formatArs(route.pricePerPalletArs)} / pallet
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
