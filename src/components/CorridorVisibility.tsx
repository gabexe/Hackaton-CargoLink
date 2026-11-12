import { useState } from 'react';
import {
  Broadcast,
  Camera,
  Check,
  LockKey,
  MapPin,
  ShieldCheck,
  TrendUp,
  Warning,
} from '@phosphor-icons/react';
import { motion, useReducedMotion } from 'motion/react';
import { useSimulation } from '../context/SimulationContext';
import type { CorridorRoute, TripStatus, UserRole } from '../types/logistics';

type EvidenceKey = 'corridor' | 'unit' | 'seal' | 'incident';

interface EvidenceItem {
  key: EvidenceKey;
  label: string;
  src: string;
  width: number;
  height: number;
  alt: string;
}

const EVIDENCE_ITEMS: EvidenceItem[] = [
  {
    key: 'corridor',
    label: 'Corredor RN 9',
    src: '/images/corridor-route-minimal.png',
    width: 1376,
    height: 768,
    alt: 'Vista aérea del corredor vial recto de Ruta Nacional 9 en llanura pampeana',
  },
  {
    key: 'unit',
    label: 'Unidad habilitada',
    src: '/images/hero-freight-studio.png',
    width: 1200,
    height: 896,
    alt: 'Semirremolque habilitado para transporte consolidado por pallet en el corredor RN 9',
  },
  {
    key: 'seal',
    label: 'Precinto en dársena',
    src: '/images/cargo-pallet-seal.jpg',
    width: 1200,
    height: 669,
    alt: 'Estiba de pallets con film y precinto de seguridad verificado en dársena de carga',
  },
  {
    key: 'incident',
    label: 'Evidencia vial',
    src: '/images/incident-road-block.jpg',
    width: 1200,
    height: 669,
    alt: 'Registro fotográfico en ruta de restricción y demora operativa sobre calzada',
  },
];

const ROLE_LABELS: Record<UserRole, string> = {
  shipper: 'Dador PyME',
  carrier: 'Transportista',
  receiver: 'Planta Receptora',
};

function getSuggestedEvidenceKey(route: CorridorRoute): EvidenceKey {
  if (route.incident || route.tripStatus === 'incident') {
    return 'incident';
  }
  if (route.tripStatus === 'arrived' || route.tripStatus === 'delivered') {
    return 'seal';
  }
  if (route.tripStatus === 'in_transit' || route.tripStatus === 'near_dock') {
    return 'corridor';
  }
  return 'unit';
}

function getCheckpointLabel(
  status: 'passed' | 'current' | 'upcoming',
  tripStatus: TripStatus,
  etaLabel: string
): string {
  if (status === 'passed') {
    return 'Completado';
  }
  if (status === 'upcoming') {
    return etaLabel;
  }
  switch (tripStatus) {
    case 'near_dock':
      return 'Próximo (<10 km a dársena)';
    case 'incident':
      return 'Detenido por novedad vial';
    case 'arrived':
      return 'En dársena destino';
    case 'delivered':
      return 'Entrega conformada';
    case 'in_transit':
      return 'En tránsito';
    default:
      return etaLabel;
  }
}

function getEvidenceCaption(key: EvidenceKey, route: CorridorRoute): string {
  if (key === 'incident') {
    if (route.incident) {
      return `${route.incident.title} en ${route.incident.kmLocation} (${route.incident.reportedAtLabel}).`;
    }
    return `Protocolo fotográfico en calzada para ${route.code} ante cortes o desvíos.`;
  }
  if (key === 'seal') {
    if (route.sealPhotoVerified) {
      const target = route.assignedDock ?? route.receiverPlantName;
      return `Precinto y estiba verificados en ${route.code} (${target}).`;
    }
    return `Control visual de film y precinto en dársena antes de la partida de ${route.code}.`;
  }
  if (key === 'unit') {
    return `${route.vehicleLabel} operado por ${route.carrierName}.`;
  }
  return `Corredor troncal RN 9 (${route.origin} - ${route.destination}).`;
}

export function CorridorVisibility() {
  const { activeRoute, activeRole, events, pilotStats } = useSimulation();
  const shouldReduceMotion = useReducedMotion();

  const stateSignature = `${activeRoute.id}|${activeRoute.tripStatus}|${Boolean(
    activeRoute.incident
  )}|${activeRoute.sealPhotoVerified}`;

  const [manualSelection, setManualSelection] = useState<{
    key: EvidenceKey;
    signature: string;
  } | null>(null);

  const suggestedKey = getSuggestedEvidenceKey(activeRoute);
  const activeEvidenceKey: EvidenceKey =
    manualSelection && manualSelection.signature === stateSignature
      ? manualSelection.key
      : suggestedKey;

  const activeEvidence =
    EVIDENCE_ITEMS.find((item) => item.key === activeEvidenceKey) ?? EVIDENCE_ITEMS[0];

  const recentEvents = events.slice(0, 4);
  const isCarrier = activeRole === 'carrier';
  const hasActiveIncident = Boolean(activeRoute.incident) || activeRoute.tripStatus === 'incident';
  const hasSealReady =
    activeRoute.sealPhotoVerified ||
    activeRoute.tripStatus === 'arrived' ||
    activeRoute.tripStatus === 'delivered';

  return (
    <section
      id="visibilidad"
      aria-labelledby="visibilidad-heading"
      className="pt-2 scroll-mt-20"
    >
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h2
            id="visibilidad-heading"
            className="text-lg sm:text-xl font-semibold tracking-tight text-[var(--text-primary)]"
          >
            Trazabilidad por capas y registro del piloto
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Hitos protegidos en corredor RN 9, evidencia visual operativa y balance en vivo de la sesión.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-6 space-y-5">
          <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2.5 pb-4 border-b border-[var(--border-hairline)]">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="font-mono text-xs font-medium px-2.5 py-1 rounded-full bg-[var(--bg-subtle)] text-[var(--text-primary)] shrink-0">
                  {activeRoute.code}
                </span>
                <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {activeRoute.origin} - {activeRoute.destination}
                </span>
              </div>

              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[var(--text-primary)] shrink-0">
                {isCarrier ? (
                  <Broadcast
                    size={14}
                    weight="regular"
                    className="text-[#276EF1] shrink-0"
                    aria-hidden="true"
                  />
                ) : (
                  <LockKey
                    size={14}
                    weight="regular"
                    className="text-[#276EF1] shrink-0"
                    aria-hidden="true"
                  />
                )}
                <span>
                  {isCarrier
                    ? 'Telemetría privada de flota activa'
                    : 'Hitos urbanos activos (GPS exacto protegido)'}
                </span>
              </span>
            </div>

            {isCarrier ? (
              <div className="mt-4 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-hairline)] p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-[var(--text-secondary)]">Coordenadas</p>
                  <p className="mt-0.5 font-mono text-xs font-medium tabular-nums text-[var(--text-primary)] truncate">
                    {activeRoute.privateTelemetry.lat}, {activeRoute.privateTelemetry.lng}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-secondary)]">Velocidad</p>
                  <p className="mt-0.5 font-mono text-xs font-medium tabular-nums text-[var(--text-primary)] whitespace-nowrap">
                    {activeRoute.privateTelemetry.speedKmh} km/h
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-[var(--text-secondary)]">Chofer habilitado</p>
                  <p className="mt-0.5 text-xs font-medium text-[var(--text-primary)] truncate">
                    {activeRoute.privateTelemetry.driverName}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-[var(--text-secondary)]">Encuadre laboral</p>
                  <p className="mt-0.5 text-xs font-medium text-[var(--text-primary)] truncate">
                    {activeRoute.privateTelemetry.unionAgreement}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-hairline)] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="inline-flex items-center gap-2 text-[var(--text-secondary)]">
                  <ShieldCheck
                    size={16}
                    weight="regular"
                    className="text-[#276EF1] shrink-0"
                    aria-hidden="true"
                  />
                  <span>
                    GPS exacto resguardado en centro operativo de {activeRoute.carrierName}.
                  </span>
                </span>
                <span className="font-medium text-[var(--text-primary)]">
                  {activeRoute.privateTelemetry.unionAgreement}
                </span>
              </div>
            )}

            <ol className="mt-5 space-y-4" aria-label="Hitos de seguimiento del corredor">
              {activeRoute.checkpoints.map((checkpoint, index) => {
                const isLast = index === activeRoute.checkpoints.length - 1;
                const isPassed = checkpoint.status === 'passed';
                const isCurrent = checkpoint.status === 'current';
                const statusLabel = getCheckpointLabel(
                  checkpoint.status,
                  activeRoute.tripStatus,
                  checkpoint.etaLabel
                );

                return (
                  <li
                    key={`${activeRoute.id}-${checkpoint.city}`}
                    className="relative flex gap-3.5"
                  >
                    {!isLast && (
                      <span
                        aria-hidden="true"
                        className={`absolute left-3.5 top-7 -bottom-4 w-px transition-colors duration-200 ${
                          isPassed ? 'bg-[#141414]/45 dark:bg-[#F5F5F7]/45' : 'bg-[var(--border-hairline)]'
                        }`}
                      />
                    )}

                    <div
                      className={`relative z-10 h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-colors duration-200 ${
                        isCurrent
                          ? 'bg-[#276EF1] text-[#FEFEFE]'
                          : isPassed
                            ? 'bg-[#141414] text-[#F5F5F7] dark:bg-[#F5F5F7] dark:text-[#111112]'
                            : 'bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {isPassed ? (
                        <Check size={14} weight="regular" aria-hidden="true" />
                      ) : (
                        <MapPin size={14} weight="regular" aria-hidden="true" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                      <div className="min-w-0">
                        <p
                          className={`text-sm leading-snug ${
                            checkpoint.status === 'upcoming'
                              ? 'font-medium text-[var(--text-secondary)]'
                              : 'font-semibold text-[var(--text-primary)]'
                          }`}
                        >
                          {checkpoint.city}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                          {statusLabel}
                        </p>
                      </div>
                      <span className="font-mono text-xs tabular-nums text-[var(--text-secondary)] shrink-0">
                        km {checkpoint.kmFromOrigin}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>

            {activeRoute.incident && (
              <div className="mt-5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-hairline)] p-3.5 flex items-start gap-3">
                <Warning
                  size={18}
                  weight="regular"
                  className="text-[#276EF1] shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-[var(--text-primary)]">
                    Novedad vial activa: {activeRoute.incident.title}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                    {activeRoute.incident.kmLocation} - Demora estimada +{activeRoute.incident.delayMinutes} min ({activeRoute.incident.reportedAtLabel})
                  </p>
                  {activeRoute.incident.relayCarrierName && (
                    <p className="mt-1 text-xs font-medium text-[var(--text-primary)]">
                      Relevo coordinado: {activeRoute.incident.relayCarrierName}
                    </p>
                  )}
                </div>
              </div>
            )}

            {(activeRoute.sealPhotoVerified || activeRoute.assignedDock) && (
              <div className="mt-4 pt-4 border-t border-[var(--border-hairline)] flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--text-secondary)]">
                {activeRoute.sealPhotoVerified && (
                  <span className="inline-flex items-center gap-1.5 text-[var(--text-primary)] font-medium">
                    <Camera size={15} weight="regular" className="text-[#276EF1]" aria-hidden="true" />
                    Precinto de estiba verificado
                  </span>
                )}
                {activeRoute.assignedDock && (
                  <span className="inline-flex items-center gap-1.5 text-[var(--text-primary)] font-medium">
                    <MapPin size={15} weight="regular" className="text-[#276EF1]" aria-hidden="true" />
                    Recepción asignada: {activeRoute.assignedDock}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[var(--border-hairline)]">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Bitácora operativa reciente
              </h3>
              <span className="font-mono text-xs tabular-nums text-[var(--text-secondary)]">
                Últimos {recentEvents.length} eventos
              </span>
            </div>

            <ul className="divide-y divide-[var(--border-hairline)]" aria-label="Bitácora operativa reciente">
              {recentEvents.map((evt) => (
                <motion.li
                  key={evt.id}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.18 }}
                  className="py-3 first:pt-3.5 last:pb-0 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <span className="font-medium text-[var(--text-primary)]">
                        {ROLE_LABELS[evt.actor]}
                      </span>
                      <span aria-hidden="true">-</span>
                      <span className="font-mono text-xs text-[var(--text-secondary)]">
                        {evt.routeCode}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--text-primary)] leading-snug">
                      {evt.summary}
                    </p>
                  </div>
                  <span className="font-mono text-xs tabular-nums text-[var(--text-secondary)] shrink-0 pt-0.5">
                    {evt.timeLabel}
                  </span>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>

        <div className="lg:col-span-6 space-y-5">
          <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] p-4 sm:p-5">
            <figure>
              <div className="aspect-[16/10] w-full rounded-lg overflow-hidden bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
                <img
                  src={activeEvidence.src}
                  alt={activeEvidence.alt}
                  width={activeEvidence.width}
                  height={activeEvidence.height}
                  className="h-full w-full object-cover"
                />
              </div>

              <figcaption className="mt-3 text-xs sm:text-sm text-[var(--text-secondary)] leading-snug">
                {getEvidenceCaption(activeEvidence.key, activeRoute)}
              </figcaption>
            </figure>

            <div
              role="group"
              aria-label="Selector de evidencia visual"
              className="mt-3 pt-3 border-t border-[var(--border-hairline)] flex flex-wrap gap-2"
            >
              {EVIDENCE_ITEMS.map((item) => {
                const isSelected = item.key === activeEvidence.key;
                const hasSignalDot =
                  (item.key === 'incident' && hasActiveIncident) ||
                  (item.key === 'seal' && hasSealReady);

                return (
                  <button
                    key={item.key}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() =>
                      setManualSelection({
                        key: item.key,
                        signature: stateSignature,
                      })
                    }
                    className={`inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-full text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#276EF1] ${
                      isSelected
                        ? 'bg-[#141414] text-[#F5F5F7] dark:bg-[#F5F5F7] dark:text-[#111112]'
                        : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border border-[var(--border-hairline)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {hasSignalDot && (
                      <span
                        aria-hidden="true"
                        className="h-1.5 w-1.5 rounded-full bg-[#276EF1] shrink-0"
                      />
                    )}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[var(--border-hairline)]">
              <div className="flex items-center gap-2">
                <TrendUp
                  size={18}
                  weight="regular"
                  className="text-[#276EF1] shrink-0"
                  aria-hidden="true"
                />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Piloto Polo 52 - RN 9
                </h3>
              </div>
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                Métricas acumuladas en sesión
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
              <div className="rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-hairline)] p-3.5">
                <p className="text-xs text-[var(--text-secondary)]">Ahorro pyme acumulado</p>
                <p className="mt-1.5 font-mono text-lg sm:text-xl font-semibold tracking-tight tabular-nums text-[var(--text-primary)] whitespace-nowrap">
                  $ {pilotStats.totalSavingsArs.toLocaleString('es-AR')}
                </p>
              </div>

              <div className="rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-hairline)] p-3.5">
                <p className="text-xs text-[var(--text-secondary)]">CO2 evitado certificado</p>
                <p className="mt-1.5 font-mono text-lg sm:text-xl font-semibold tracking-tight tabular-nums text-[var(--text-primary)] whitespace-nowrap">
                  {pilotStats.totalCo2SavedKg.toLocaleString('es-AR', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}{' '}
                  kg
                </p>
              </div>

              <div className="rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-hairline)] p-3.5">
                <p className="text-xs text-[var(--text-secondary)]">Pallets consolidados</p>
                <p className="mt-1.5 font-mono text-lg sm:text-xl font-semibold tracking-tight tabular-nums text-[var(--text-primary)] whitespace-nowrap">
                  {pilotStats.totalBookedPallets}
                </p>
              </div>

              <div className="rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-hairline)] p-3.5">
                <p className="text-xs text-[var(--text-secondary)]">Ocupación media de flota</p>
                <p className="mt-1.5 font-mono text-lg sm:text-xl font-semibold tracking-tight tabular-nums text-[var(--text-primary)] whitespace-nowrap">
                  {pilotStats.avgOccupancyPct}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
