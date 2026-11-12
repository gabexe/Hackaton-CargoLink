import { Drop, Leaf } from '@phosphor-icons/react';
import type { CarbonEstimate } from '../types/logistics';

export interface CarbonFootprintCardProps {
  estimate: CarbonEstimate;
  title?: string;
  compact?: boolean;
}

/**
 * Displays CO2e savings, avoided diesel liters, and exclusive vs. shared comparison.
 */
export function CarbonFootprintCard({
  estimate,
  title = 'Huella de carbono evitada',
  compact = false,
}: CarbonFootprintCardProps) {
  const hasLoad = estimate.palletsCount > 0;
  const sharedWidthPct =
    estimate.exclusiveCo2Kg > 0
      ? Math.max(14, Math.min(100, Math.round((estimate.sharedCo2Kg / estimate.exclusiveCo2Kg) * 100)))
      : 28;

  return (
    <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-primary)]">
          <Leaf size={15} weight="regular" className="text-[#276EF1] shrink-0" aria-hidden="true" />
          <span>{title}</span>
        </span>
        <span className="rounded-full bg-[#276EF1]/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-[#276EF1] tabular-nums">
          -{estimate.reductionPct}% CO2e
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-[var(--bg-surface)] px-2.5 py-2 border border-[var(--border-hairline)]">
          <span className="block text-[11px] text-[var(--text-secondary)]">Ahorro estimado</span>
          <span className="font-mono text-sm font-semibold tabular-nums text-[var(--text-primary)]">
            {hasLoad ? `${estimate.co2SavedKg.toLocaleString('es-AR')} kg` : '0 kg'}
          </span>
        </div>
        <div className="rounded-lg bg-[var(--bg-surface)] px-2.5 py-2 border border-[var(--border-hairline)]">
          <span className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)]">
            <Drop size={11} weight="regular" className="text-[#276EF1]" aria-hidden="true" />
            <span>Diésel evitado</span>
          </span>
          <span className="font-mono text-sm font-semibold tabular-nums text-[var(--text-primary)]">
            {hasLoad ? `${estimate.dieselSavedLiters.toLocaleString('es-AR')} L` : '0 L'}
          </span>
        </div>
      </div>

      {!compact && (
        <div className="space-y-1.5 pt-0.5 text-[11px]">
          <div className="flex items-center justify-between text-[var(--text-secondary)]">
            <span>Flete exclusivo ({estimate.distanceKm} km)</span>
            <span className="font-mono tabular-nums">
              {hasLoad ? `${estimate.exclusiveCo2Kg.toLocaleString('es-AR')} kg` : '--'}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
            <div className="h-full w-full rounded-full bg-[var(--text-secondary)]/35" />
          </div>

          <div className="flex items-center justify-between text-[var(--text-primary)] font-medium">
            <span>Consolidado en Tramo</span>
            <span className="font-mono tabular-nums text-[#276EF1]">
              {hasLoad ? `${estimate.sharedCo2Kg.toLocaleString('es-AR')} kg` : '--'}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
            <div
              className="h-full rounded-full bg-[#276EF1] transition-all duration-300"
              style={{ width: `${hasLoad ? sharedWidthPct : 28}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
