import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Camera,
  CheckCircle,
  Clock,
  Leaf,
  LockSimple,
  MapPin,
  Package,
  ShieldCheck,
  Warehouse,
  Warning,
} from '@phosphor-icons/react';
import { useSimulation } from '../context/SimulationContext';

const DOCK_OPTIONS = ['Dársena 1', 'Dársena 2', 'Rampa Este'] as const;

function formatKg(kg: number): string {
  return `${Math.round(kg).toLocaleString('es-AR')} kg`;
}

function formatDecimalEs(value: number, decimals = 1): string {
  return value.toFixed(decimals).replace('.', ',');
}

export function ReceiverPanel() {
  const {
    routes,
    activeRoute,
    selectRoute,
    assignReceivingDock,
    confirmDeliveryUnload,
  } = useSimulation();

  const [selectedDock, setSelectedDock] = useState<string>(
    activeRoute.assignedDock ?? DOCK_OPTIONS[0]
  );

  useEffect(() => {
    setSelectedDock(activeRoute.assignedDock ?? DOCK_OPTIONS[0]);
  }, [activeRoute.id, activeRoute.assignedDock]);

  const occupiedSlots = activeRoute.slots.filter((slot) => slot.status !== 'available');
  const occupiedCount = occupiedSlots.length;
  const totalWeightKg = occupiedSlots.reduce((sum, slot) => sum + slot.weightKg, 0);
  const pymeSlots = occupiedSlots.filter((slot) => slot.status === 'user_booked');
  const co2TotalKg = occupiedCount * activeRoute.co2SavedPerPalletKg;

  const lastCheckpoint = activeRoute.checkpoints[activeRoute.checkpoints.length - 1];
  const currentCheckpoint =
    activeRoute.checkpoints.find((cp) => cp.status === 'current') ??
    activeRoute.checkpoints[0];
  const totalKm = lastCheckpoint?.kmFromOrigin ?? 0;
  const currentKm = currentCheckpoint?.kmFromOrigin ?? 0;
  const remainingKm = Math.max(0, totalKm - currentKm);

  const canConfirmUnload =
    activeRoute.tripStatus === 'arrived' || activeRoute.tripStatus === 'near_dock';

  const inboundShortcutRoute = routes.find(
    (route) =>
      route.id !== activeRoute.id &&
      (route.tripStatus === 'near_dock' ||
        route.tripStatus === 'in_transit' ||
        route.tripStatus === 'arrived')
  );

  return (
    <aside
      aria-label="Panel Planta Receptora"
      className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-2xl p-5 sm:p-6 space-y-5"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium text-[var(--text-secondary)] truncate">
            Planta Receptora - {activeRoute.receiverPlantName}
          </p>
          <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)] truncate">
            Recepción y dársenas
          </h2>
          <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5 flex-wrap">
            <span>{activeRoute.carrierName}</span>
            <ArrowRight size={13} weight="regular" aria-hidden="true" />
            <span>{activeRoute.destination}</span>
          </p>
        </div>
        <span className="shrink-0 px-2.5 py-1 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-xs font-mono font-medium tabular-nums text-[var(--text-primary)]">
          {activeRoute.code}
        </span>
      </div>

      {/* Safe 2-Layer Privacy Rule Notice */}
      <div className="rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-hairline)] px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
          <LockSimple size={15} weight="regular" aria-hidden="true" />
          <span>Checkpoints urbanos - GPS privado protegido</span>
        </span>
      </div>

      {/* Geofence & Status Highlights */}
      {activeRoute.tripStatus === 'near_dock' && (
        <div className="rounded-xl bg-[#276EF1] text-[#FEFEFE] p-4 space-y-1.5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <MapPin size={17} weight="regular" aria-hidden="true" />
            <span>Próximo (&lt;10 km por geolocalización)</span>
          </div>
          <p className="text-xs text-[#FEFEFE]/90">
            Unidad ingresando al radio final. Preparar dársena de recepción.
          </p>
        </div>
      )}

      {activeRoute.tripStatus === 'incident' && activeRoute.incident && (
        <div className="rounded-xl border border-[var(--text-primary)]/25 bg-[var(--bg-subtle)] p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <Warning size={17} weight="regular" aria-hidden="true" />
              <span>Demora reportada en ruta</span>
            </div>
            <span className="font-mono text-xs tabular-nums px-2 py-0.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-primary)]">
              +{activeRoute.incident.delayMinutes} min
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            {activeRoute.incident.title} - {activeRoute.incident.kmLocation} ({activeRoute.incident.reportedAtLabel})
          </p>
          {activeRoute.incident.relayRequested && (
            <p className="text-xs font-medium text-[#1E5BD6] dark:text-[#7AA7FF]">
              {activeRoute.incident.relayCarrierName ?? 'Transportista de relevo en camino'}
            </p>
          )}
          <figure className="space-y-1.5">
            <div className="rounded-lg overflow-hidden border border-[var(--border-hairline)]">
              <img
                src={activeRoute.incident.photoUrl}
                alt={`Evidencia fotográfica de demora en ${activeRoute.incident.kmLocation}`}
                className="w-full h-36 object-cover block"
              />
            </div>
            <figcaption className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
              <Camera size={13} weight="regular" aria-hidden="true" />
              <span>Evidencia verificada por chofer (+{activeRoute.incident.delayMinutes} min)</span>
            </figcaption>
          </figure>
        </div>
      )}

      {(activeRoute.tripStatus === 'docked' || activeRoute.tripStatus === 'in_transit') && (
        <div className="rounded-xl border border-[var(--border-hairline)] p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-[var(--text-secondary)] flex items-center gap-1.5">
              <Clock size={14} weight="regular" aria-hidden="true" />
              {activeRoute.tripStatus === 'docked' ? 'Estado en origen' : 'Checkpoint actual'}
            </span>
            <span className="font-medium text-[var(--text-primary)]">
              {currentCheckpoint?.city ?? activeRoute.origin}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-[var(--text-secondary)]">Distancia restante a planta</span>
            <span className="font-mono font-semibold tabular-nums text-[var(--text-primary)]">
              {remainingKm} km
            </span>
          </div>

          {currentCheckpoint && (
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-[var(--text-secondary)]">Referencia horaria</span>
              <span className="font-mono tabular-nums text-[var(--text-secondary)]">
                {currentCheckpoint.etaLabel}
              </span>
            </div>
          )}

          {activeRoute.tripStatus === 'docked' && inboundShortcutRoute && (
            <button
              type="button"
              onClick={() => selectRoute(inboundShortcutRoute.id)}
              className="min-h-[44px] w-full rounded-full border border-[var(--border-hairline)] bg-[var(--bg-subtle)] hover:border-[var(--text-secondary)] text-[var(--text-primary)] px-4 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Ver unidad en ruta ({inboundShortcutRoute.code})</span>
              <ArrowRight size={14} weight="regular" aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {activeRoute.tripStatus === 'arrived' && (
        <div className="rounded-xl border border-[#276EF1]/35 bg-[#276EF1]/10 p-4 space-y-1.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#1E5BD6] dark:text-[#7AA7FF]">
            <Warehouse size={17} weight="regular" aria-hidden="true" />
            <span>Unidad arribada a planta</span>
          </div>
          <p className="text-xs text-[var(--text-primary)]">
            {activeRoute.assignedDock
              ? `Posicionada en ${activeRoute.assignedDock}. Lista para inspección de precinto y descarga.`
              : 'Asigná una dársena y confirmá la conformidad de descarga.'}
          </p>
        </div>
      )}

      {/* Interactive Dock Workflow or Final Delivery Receipt */}
      {activeRoute.tripStatus !== 'delivered' ? (
        <div className="space-y-4">
          {/* Step A: Preparar y asignar dársena */}
          <div className="rounded-xl border border-[var(--border-hairline)] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <Warehouse size={15} weight="regular" aria-hidden="true" />
                <span>Preparar y asignar dársena</span>
              </p>
              {activeRoute.assignedDock && (
                <span className="text-[11px] font-mono font-medium text-[#1E5BD6] dark:text-[#7AA7FF]">
                  {activeRoute.assignedDock} lista
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {DOCK_OPTIONS.map((dock) => {
                const isSelected = selectedDock === dock;
                return (
                  <button
                    key={dock}
                    type="button"
                    onClick={() => setSelectedDock(dock)}
                    aria-pressed={isSelected}
                    className={`min-h-[44px] rounded-xl px-2 py-2 text-xs font-medium border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--text-primary)] border-[var(--text-primary)] text-[var(--bg-surface)]'
                        : 'bg-[var(--bg-subtle)] border-[var(--border-hairline)] text-[var(--text-primary)] hover:border-[var(--text-secondary)]'
                    }`}
                  >
                    {dock}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => assignReceivingDock(activeRoute.id, selectedDock)}
              className="min-h-[44px] w-full rounded-full border border-[var(--border-hairline)] bg-[var(--bg-subtle)] hover:border-[var(--text-secondary)] text-[var(--text-primary)] px-4 py-2.5 text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle size={15} weight="regular" aria-hidden="true" />
              <span>Confirmar dársena</span>
            </button>
          </div>

          {/* Step B: Confirmar descarga y conformidad */}
          <div className="rounded-xl border border-[var(--border-hairline)] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <Package size={15} weight="regular" aria-hidden="true" />
                <span>Confirmar descarga y conformidad</span>
              </p>
              <span className="font-mono text-[11px] tabular-nums text-[var(--text-secondary)]">
                {occupiedCount} pallets ({formatKg(totalWeightKg)})
              </span>
            </div>

            {pymeSlots.length > 0 && (
              <div className="rounded-lg bg-[#276EF1]/10 border border-[#276EF1]/30 px-3 py-2 text-xs text-[var(--text-primary)]">
                Incluye {pymeSlots.length}{' '}
                {pymeSlots.length === 1 ? 'pallet' : 'pallets'} de Plásticos Polo 52 SA (
                <span className="font-mono tabular-nums">
                  {pymeSlots.map((s) => s.id).join(', ')}
                </span>
                )
              </div>
            )}

            <figure className="space-y-1.5">
              <div className="rounded-lg overflow-hidden border border-[var(--border-hairline)]">
                <img
                  src="/images/cargo-pallet-seal.jpg"
                  alt="Foto de precinto de estiba en dársena de origen para inspección de descarga"
                  className="w-full h-36 object-cover block"
                />
              </div>
              <figcaption className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
                <ShieldCheck size={14} weight="regular" aria-hidden="true" />
                <span>
                  {activeRoute.sealPhotoVerified
                    ? 'Precinto de origen verificado - listo para cotejo en dársena'
                    : 'Foto referencial de precintado en origen'}
                </span>
              </figcaption>
            </figure>

            {!canConfirmUnload && (
              <p className="text-[11px] text-[var(--text-secondary)]">
                Se habilita cuando la unidad ingresa al radio &lt;10 km o arriba a dársena.
              </p>
            )}

            <button
              type="button"
              disabled={!canConfirmUnload}
              onClick={() => confirmDeliveryUnload(activeRoute.id)}
              className="min-h-[44px] w-full rounded-full bg-[#276EF1] hover:bg-[#1E5BD6] disabled:opacity-45 disabled:hover:bg-[#276EF1] disabled:cursor-not-allowed text-[#FEFEFE] px-5 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle size={16} weight="regular" aria-hidden="true" />
              <span>Confirmar descarga</span>
            </button>
          </div>
        </div>
      ) : (
        /* Digital Delivery Receipt Summary when delivered */
        <div className="rounded-xl border border-[#276EF1]/35 bg-[#276EF1]/10 p-4 space-y-3.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#1E5BD6] dark:text-[#7AA7FF]">
            <CheckCircle size={18} weight="regular" aria-hidden="true" />
            <span>Conformidad registrada</span>
          </div>

          <div className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] p-3 space-y-1.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[var(--text-secondary)]">Planta receptora</span>
              <span className="font-medium text-[var(--text-primary)]">
                {activeRoute.receiverPlantName}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[var(--text-secondary)]">Dársena de descarga</span>
              <span className="font-mono tabular-nums text-[var(--text-primary)]">
                {activeRoute.assignedDock ?? 'Dársena 1'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[var(--text-secondary)]">Pallets recibidos</span>
              <span className="font-mono tabular-nums text-[var(--text-primary)]">
                {occupiedCount} ({formatKg(totalWeightKg)})
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[var(--text-secondary)] flex items-center gap-1">
                <Leaf size={13} weight="regular" aria-hidden="true" />
                CO2 certificado
              </span>
              <span className="font-mono font-medium tabular-nums text-[#1E5BD6] dark:text-[#7AA7FF]">
                {formatDecimalEs(co2TotalKg)} kg
              </span>
            </div>
          </div>

          <figure className="space-y-1.5">
            <div className="rounded-lg overflow-hidden border border-[var(--border-hairline)]">
              <img
                src="/images/cargo-pallet-seal.jpg"
                alt="Conformidad de precinto verificado en descarga"
                className="w-full h-32 object-cover block"
              />
            </div>
            <figcaption className="text-xs text-[var(--text-secondary)]">
              Precinto íntegro cotejado en {activeRoute.assignedDock ?? 'Dársena 1'}
            </figcaption>
          </figure>

          {inboundShortcutRoute && (
            <button
              type="button"
              onClick={() => selectRoute(inboundShortcutRoute.id)}
              className="min-h-[44px] w-full rounded-full bg-[var(--bg-surface)] border border-[var(--border-hairline)] hover:border-[var(--text-secondary)] text-[var(--text-primary)] px-4 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Inspeccionar otra unidad ({inboundShortcutRoute.code})</span>
              <ArrowRight size={14} weight="regular" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
