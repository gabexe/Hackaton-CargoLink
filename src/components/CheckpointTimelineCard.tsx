import { useState } from 'react';
import {
  CheckCircle,
  Eye,
  EyeSlash,
  LockSimple,
  Warning,
} from '@phosphor-icons/react';
import { useSimulation } from '../context/SimulationContext';
import type { ThemeMode } from '../types/logistics';
import { CorridorMap } from './CorridorMap';

export function CheckpointTimelineCard({ theme }: { theme: ThemeMode }) {
  const { activeRoute } = useSimulation();
  const [showManagerGps, setShowManagerGps] = useState(false);

  const checkpoints = activeRoute.checkpoints;

  return (
    <div className="space-y-3">
      {/* Privacy Notice Banner */}
      <div className="flex items-center justify-between rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3.5 py-2.5 shadow-xs">
        <div className="flex items-center gap-2">
          <LockSimple size={15} weight="bold" className="text-[#276EF1] shrink-0" />
          <div>
            <p className="text-xs font-semibold text-[var(--text-primary)]">
              Ubicación protegida por hitos de ciudad
            </p>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Para evitar piratería del asfalto, no se expone el GPS continuo a terceros.
            </p>
          </div>
        </div>

        {/* Gerencia override button */}
        <button
          type="button"
          onClick={() => setShowManagerGps(!showManagerGps)}
          className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-2.5 py-1 text-[10px] font-semibold text-[var(--text-primary)] hover:border-[#276EF1]"
        >
          {showManagerGps ? (
            <>
              <EyeSlash size={12} weight="bold" />
              <span>Ocultar GPS</span>
            </>
          ) : (
            <>
              <Eye size={12} weight="bold" />
              <span>Auditoría GPS</span>
            </>
          )}
        </button>
      </div>

      {/* Conditionally rendered real map ONLY when Manager explicitly inspects */}
      {showManagerGps && (
        <div className="overflow-hidden rounded-2xl border border-[var(--border-hairline)]">
          <CorridorMap theme={theme} />
        </div>
      )}

      {/* Checkpoints Stepper (Safe, clean and reliable) */}
      <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[var(--text-primary)]">
            Progreso del viaje por RN 9
          </h3>
          <span className="font-mono text-[11px] text-[#276EF1] font-semibold">
            {activeRoute.code} · {activeRoute.carrierName}
          </span>
        </div>

        <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--border-hairline)]">
          {checkpoints.map((cp, idx) => {
            const isPassed = cp.status === 'passed';
            const isCurrent = cp.status === 'current';
            const isDest = idx === checkpoints.length - 1;

            return (
              <div key={cp.city} className="relative flex items-start justify-between gap-3 text-xs">
                {/* Node dot */}
                <div
                  className={`absolute -left-6 top-1 h-3 w-3 rounded-full border-2 ${
                    isPassed
                      ? 'border-[#276EF1] bg-[#276EF1]'
                      : isCurrent
                        ? 'border-[#276EF1] bg-[var(--bg-surface)] ring-4 ring-[#276EF1]/20'
                        : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)]'
                  }`}
                />

                <div className="min-w-0 flex-1">
                  <p
                    className={`font-semibold ${
                      isCurrent
                        ? 'text-[#276EF1]'
                        : isPassed
                          ? 'text-[var(--text-primary)]'
                          : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {cp.city}
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)] font-mono">
                    {cp.etaLabel}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  {isPassed && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#276EF1]">
                      <CheckCircle size={11} weight="bold" />
                      <span>Completado</span>
                    </span>
                  )}
                  {isCurrent && (
                    <span className="rounded-full bg-[#276EF1] px-2 py-0.5 font-mono text-[10px] font-bold text-[#FEFEFE]">
                      En curso
                    </span>
                  )}
                  {activeRoute.tripStatus === 'near_dock' && isDest && (
                    <span className="rounded-full bg-[#276EF1] px-2 py-0.5 font-mono text-[10px] font-bold text-[#FEFEFE] animate-pulse">
                      &lt;10 km
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Road Incident Evidence if active */}
        {activeRoute.tripStatus === 'incident' && activeRoute.incident && (
          <div className="flex items-center gap-3 rounded-xl border border-[#D97706]/40 bg-[#D97706]/10 p-3 text-xs">
            <img
              src={activeRoute.incident.photoUrl}
              alt="Foto del corte"
              className="h-12 w-16 rounded-lg object-cover"
            />
            <div>
              <p className="flex items-center gap-1 font-bold text-[var(--text-primary)]">
                <Warning size={14} weight="bold" className="text-[#D97706]" />
                <span>{activeRoute.incident.kmLocation}</span>
              </p>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Demora estimada: +{activeRoute.incident.delayMinutes} min con evidencia fotográfica enviada por el chofer.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
