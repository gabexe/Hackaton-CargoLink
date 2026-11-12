import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle,
  Clock,
  FileText,
  Leaf,
  LockSimple,
  MapPin,
  Minus,
  Package,
  Plus,
  ShieldCheck,
  Truck,
  Warning,
} from '@phosphor-icons/react';
import { useSimulation } from '../context/SimulationContext';
import type { PalletSlot, TripStatus } from '../types/logistics';

const CARGO_OPTIONS = [
  'Envases PET',
  'Autopartes',
  'Metalúrgica',
  'Alimentos secos',
] as const;

const WEIGHT_OPTIONS = [450, 650, 850] as const;

interface ConfirmedReceipt {
  code: string;
  routeId: string;
  routeCode: string;
  slotIds: string[];
  count: number;
  cargoLabel: string;
  weightKg: number;
  totalArs: number;
  protectedCargo: boolean;
  co2SavedKg: number;
}

function formatArs(amount: number): string {
  return `$ ${Math.round(amount).toLocaleString('es-AR')}`;
}

function formatKg(kg: number): string {
  return `${Math.round(kg).toLocaleString('es-AR')} kg`;
}

function formatDecimalEs(value: number, decimals = 1): string {
  return value.toFixed(decimals).replace('.', ',');
}

function getClosedReasonLabel(status: TripStatus, destination: string, plantName: string): string {
  switch (status) {
    case 'in_transit':
      return `Unidad en tránsito hacia ${destination}`;
    case 'near_dock':
      return `Unidad en aproximación (<10 km) hacia ${plantName}`;
    case 'incident':
      return `Unidad detenida por novedad vial rumbo a ${destination}`;
    case 'arrived':
      return `Unidad en dársena destino de ${plantName}`;
    case 'delivered':
      return `Viaje entregado en ${plantName}`;
    default:
      return 'Reserva cerrada en esta unidad';
  }
}

interface GroupedBooking {
  code: string;
  slotIds: string[];
  cargoLabel: string;
  totalKg: number;
  protectedCargo: boolean;
}

function groupUserBookings(slots: PalletSlot[]): GroupedBooking[] {
  const byCode = new Map<string, GroupedBooking>();
  for (const slot of slots) {
    if (slot.status !== 'user_booked') {
      continue;
    }
    const code = slot.bookingCode ?? 'TRM-LOCAL';
    const existing = byCode.get(code);
    if (existing) {
      existing.slotIds.push(slot.id);
      existing.totalKg += slot.weightKg;
      existing.protectedCargo = existing.protectedCargo || Boolean(slot.protectedCargo);
    } else {
      byCode.set(code, {
        code,
        slotIds: [slot.id],
        cargoLabel: slot.cargoLabel ?? 'Carga paletizada',
        totalKg: slot.weightKg,
        protectedCargo: Boolean(slot.protectedCargo),
      });
    }
  }
  return Array.from(byCode.values());
}

export function ShipperPanel() {
  const {
    routes,
    activeRoute,
    selectedSlotIds,
    applyPalletQuantityPreset,
    draftCargoLabel,
    draftPalletWeightKg,
    setDraftCargo,
    hasCargoProtection,
    setHasCargoProtection,
    confirmShipperBooking,
    setActiveRole,
    selectRoute,
    setInspectedSlotId,
  } = useSimulation();

  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmedReceipt, setConfirmedReceipt] = useState<ConfirmedReceipt | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Reset confirmation view if route switches, simulation resets, or user selects new slots
  useEffect(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsConfirming(false);
    setConfirmedReceipt(null);
  }, [activeRoute.id]);

  useEffect(() => {
    if (selectedSlotIds.length > 0 && confirmedReceipt !== null) {
      setConfirmedReceipt(null);
    }
  }, [selectedSlotIds.length, confirmedReceipt]);

  useEffect(() => {
    if (
      confirmedReceipt !== null &&
      !activeRoute.slots.some((slot) => slot.bookingCode === confirmedReceipt.code)
    ) {
      setConfirmedReceipt(null);
    }
  }, [activeRoute.slots, confirmedReceipt]);

  const availableSlots = activeRoute.slots.filter((slot) => slot.status === 'available');
  const availableCount = availableSlots.length;
  const userBookings = groupUserBookings(activeRoute.slots);

  const selectedCount = selectedSlotIds.length;
  const totalWeightKg = selectedCount * draftPalletWeightKg;
  const baseSubtotalArs = selectedCount * activeRoute.pricePerPalletArs;
  const protectionFeeArs = hasCargoProtection ? Math.round(baseSubtotalArs * 0.025) : 0;
  const totalPriceArs = baseSubtotalArs + protectionFeeArs;
  const savingsArs =
    selectedCount > 0 ? Math.max(0, activeRoute.dedicatedTruckPriceArs - totalPriceArs) : 0;
  const savingsPct =
    selectedCount > 0 && activeRoute.dedicatedTruckPriceArs > 0
      ? Math.max(
          0,
          Math.round(
            ((activeRoute.dedicatedTruckPriceArs - totalPriceArs) /
              activeRoute.dedicatedTruckPriceArs) *
              100
          )
        )
      : Math.round(
          ((activeRoute.dedicatedTruckPriceArs - activeRoute.pricePerPalletArs) /
            activeRoute.dedicatedTruckPriceArs) *
            100
        );
  const co2SavedKg = selectedCount * activeRoute.co2SavedPerPalletKg;

  const openRoute = routes.find(
    (route) =>
      route.id !== activeRoute.id &&
      route.tripStatus === 'docked' &&
      route.slots.some((slot) => slot.status === 'available')
  );

  const handleConfirmBooking = () => {
    if (selectedCount === 0 || isConfirming || activeRoute.tripStatus !== 'docked') {
      return;
    }

    const slotSnapshot = [...selectedSlotIds];
    const totalSnapshot = totalPriceArs;
    const cargoSnapshot = draftCargoLabel;
    const weightSnapshot = draftPalletWeightKg;
    const protectionSnapshot = hasCargoProtection;
    const co2Snapshot = co2SavedKg;
    const routeIdSnapshot = activeRoute.id;
    const routeCodeSnapshot = activeRoute.code;

    const code = confirmShipperBooking();
    if (!code) {
      return;
    }

    setIsConfirming(true);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setIsConfirming(false);
      setConfirmedReceipt({
        code,
        routeId: routeIdSnapshot,
        routeCode: routeCodeSnapshot,
        slotIds: slotSnapshot,
        count: slotSnapshot.length,
        cargoLabel: cargoSnapshot,
        weightKg: weightSnapshot,
        totalArs: totalSnapshot,
        protectedCargo: protectionSnapshot,
        co2SavedKg: co2Snapshot,
      });
    }, 300);
  };

  return (
    <aside
      aria-label="Panel Dador PyME"
      className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-2xl p-5 sm:p-6 space-y-5"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium text-[var(--text-secondary)]">
            Dador PyME - Plásticos Polo 52 SA
          </p>
          <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)] truncate">
            {activeRoute.tripStatus === 'docked' ? 'Reservar espacio modular' : 'Seguimiento de carga'}
          </h2>
          <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5 flex-wrap">
            <span>{activeRoute.origin}</span>
            <ArrowRight size={13} weight="regular" aria-hidden="true" />
            <span>{activeRoute.destination}</span>
          </p>
        </div>
        <span className="shrink-0 px-2.5 py-1 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-xs font-mono font-medium tabular-nums text-[var(--text-primary)]">
          {activeRoute.code}
        </span>
      </div>

      {/* State A: Unit is no longer docked / booking closed */}
      {activeRoute.tripStatus !== 'docked' ? (
        <div className="space-y-4">
          <div className="rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-hairline)] p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
              <LockSimple size={16} weight="regular" aria-hidden="true" />
              <span>Reserva cerrada en esta unidad</span>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              {getClosedReasonLabel(
                activeRoute.tripStatus,
                activeRoute.destination,
                activeRoute.receiverPlantName
              )}
              .
            </p>
          </div>

          {/* Road incident alert banner for shipper */}
          {activeRoute.tripStatus === 'incident' && activeRoute.incident && (
            <div className="rounded-xl border border-[var(--text-primary)]/25 bg-[var(--bg-subtle)] p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                  <Warning size={17} weight="regular" aria-hidden="true" />
                  <span>Alerta vial reportada en ruta</span>
                </div>
                <span className="shrink-0 font-mono text-xs tabular-nums px-2 py-0.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-primary)]">
                  +{activeRoute.incident.delayMinutes} min
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                {activeRoute.incident.title} - {activeRoute.incident.kmLocation} ({activeRoute.incident.reportedAtLabel})
              </p>
              {activeRoute.incident.relayRequested && (
                <p className="text-xs font-medium text-[#1E5BD6] dark:text-[#7AA7FF]">
                  {activeRoute.incident.relayCarrierName ?? 'Unidad de relevo solicitada'}
                </p>
              )}
              <figure className="space-y-1.5">
                <div className="rounded-lg overflow-hidden border border-[var(--border-hairline)]">
                  <img
                    src={activeRoute.incident.photoUrl}
                    alt={`Evidencia vial en ${activeRoute.incident.kmLocation}`}
                    className="w-full h-32 object-cover block"
                  />
                </div>
                <figcaption className="text-xs text-[var(--text-secondary)]">
                  Evidencia fotográfica verificada por chofer ({activeRoute.incident.kmLocation})
                </figcaption>
              </figure>
            </div>
          )}

          {/* Owned bookings by Plásticos Polo 52 SA */}
          {userBookings.length > 0 ? (
            <div className="space-y-2.5">
              <p className="text-xs font-medium text-[var(--text-secondary)]">
                Tus reservas confirmadas en {activeRoute.code}
              </p>
              {userBookings.map((booking) => (
                <div
                  key={booking.code}
                  className="rounded-xl border border-[#276EF1]/35 bg-[#276EF1]/10 p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-medium tabular-nums text-[var(--text-primary)]">
                      {booking.code}
                    </span>
                    <span className="text-xs font-medium text-[#1E5BD6] dark:text-[#7AA7FF]">
                      {booking.protectedCargo ? 'Protección +2,5% activa' : 'Cobertura básica'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
                    <span>
                      {booking.slotIds.length} {booking.slotIds.length === 1 ? 'pallet' : 'pallets'} ({booking.slotIds.join(', ')}) - {booking.cargoLabel}
                    </span>
                    <span className="font-mono tabular-nums text-[var(--text-primary)]">
                      {formatKg(booking.totalKg)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--border-hairline)] p-3.5 text-xs text-[var(--text-secondary)]">
              Plásticos Polo 52 SA no tiene pallets reservados en esta unidad.
            </div>
          )}

          {/* Urban checkpoints progress */}
          <div className="rounded-xl border border-[var(--border-hairline)] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                <MapPin size={15} weight="regular" aria-hidden="true" />
                Hitos urbanos del corredor
              </span>
              <span className="text-[11px] text-[var(--text-secondary)]">GPS privado protegido</span>
            </div>
            <ul className="space-y-2">
              {activeRoute.checkpoints.map((cp) => (
                <li
                  key={cp.city}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        cp.status === 'current'
                          ? 'bg-[#276EF1]'
                          : cp.status === 'passed'
                            ? 'bg-[var(--text-primary)]'
                            : 'bg-[var(--border-hairline)]'
                      }`}
                    />
                    <span
                      className={`truncate ${
                        cp.status === 'upcoming'
                          ? 'text-[var(--text-secondary)]'
                          : 'font-medium text-[var(--text-primary)]'
                      }`}
                    >
                      {cp.city}
                    </span>
                  </span>
                  <span className="font-mono tabular-nums text-[11px] text-[var(--text-secondary)] shrink-0">
                    {cp.etaLabel}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick switches */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {openRoute && (
              <button
                type="button"
                onClick={() => selectRoute(openRoute.id)}
                className="min-h-[44px] w-full rounded-full bg-[#276EF1] hover:bg-[#1E5BD6] text-[#FEFEFE] px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Ir a unidad abierta</span>
                <ArrowRight size={15} weight="regular" aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveRole('carrier')}
              className={`min-h-[44px] w-full rounded-full border border-[var(--border-hairline)] bg-[var(--bg-subtle)] hover:border-[var(--text-secondary)] text-[var(--text-primary)] px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                openRoute ? '' : 'sm:col-span-2'
              }`}
            >
              <Truck size={16} weight="regular" aria-hidden="true" />
              <span>Transportista</span>
            </button>
          </div>
        </div>
      ) : (
        /* State B: Unit is docked and open for modular bookings */
        <div className="space-y-4">
          {/* Existing confirmed bookings summary on this docked unit */}
          {userBookings.length > 0 && confirmedReceipt === null && (
            <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-3.5 space-y-2">
              <p className="text-xs font-medium text-[var(--text-primary)]">
                Carga ya reservada en esta unidad
              </p>
              {userBookings.map((booking) => (
                <div
                  key={booking.code}
                  className="flex items-center justify-between gap-2 text-xs text-[var(--text-secondary)]"
                >
                  <span className="font-mono tabular-nums text-[var(--text-primary)]">
                    {booking.code}
                  </span>
                  <span className="truncate">
                    {booking.slotIds.length}p ({booking.slotIds.join(', ')}) - {booking.cargoLabel}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* 300ms skeletal loading state */}
          {isConfirming ? (
            <div
              aria-live="polite"
              aria-label="Generando remito digital"
              className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-4 space-y-3 animate-pulse"
            >
              <div className="h-4 w-36 rounded bg-[var(--border-hairline)]" />
              <div className="h-6 w-28 rounded bg-[var(--border-hairline)]" />
              <div className="h-3 w-full rounded bg-[var(--border-hairline)]" />
              <div className="h-10 w-full rounded-full bg-[var(--border-hairline)]" />
            </div>
          ) : confirmedReceipt !== null ? (
            /* Confirmed Remito Digital Card */
            <div
              aria-live="polite"
              className="rounded-xl border border-[#276EF1]/35 bg-[#276EF1]/10 p-4 space-y-3.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-[#1E5BD6] dark:text-[#7AA7FF]">
                    <CheckCircle size={16} weight="regular" aria-hidden="true" />
                    <span>Remito Digital emitido</span>
                  </div>
                  <p className="text-lg font-mono font-semibold tabular-nums text-[var(--text-primary)]">
                    {confirmedReceipt.code}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-xs font-mono tabular-nums text-[var(--text-primary)]">
                  {confirmedReceipt.routeCode}
                </span>
              </div>

              <div className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] p-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[var(--text-secondary)]">Titular</span>
                  <span className="font-medium text-[var(--text-primary)]">
                    Plásticos Polo 52 SA
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[var(--text-secondary)]">Estiba reservada</span>
                  <span className="font-mono tabular-nums text-[var(--text-primary)]">
                    {confirmedReceipt.count}{' '}
                    {confirmedReceipt.count === 1 ? 'pallet' : 'pallets'} ({confirmedReceipt.slotIds.join(', ')})
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[var(--text-secondary)]">Mercadería</span>
                  <span className="text-[var(--text-primary)]">
                    {confirmedReceipt.cargoLabel} -{' '}
                    <span className="font-mono tabular-nums">
                      {formatKg(confirmedReceipt.count * confirmedReceipt.weightKg)}
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[var(--text-secondary)]">Total modular</span>
                  <span className="font-mono font-semibold tabular-nums text-[var(--text-primary)]">
                    {formatArs(confirmedReceipt.totalArs)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[var(--text-secondary)]">Protección</span>
                  <span className="text-[var(--text-primary)]">
                    {confirmedReceipt.protectedCargo ? 'Microseguro +2,5% activo' : 'Cobertura básica'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setActiveRole('carrier')}
                  className="min-h-[44px] w-full rounded-full bg-[#276EF1] hover:bg-[#1E5BD6] text-[#FEFEFE] px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Truck size={16} weight="regular" aria-hidden="true" />
                  <span>Simular despacho como Transportista</span>
                </button>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const firstId = confirmedReceipt.slotIds[0];
                      if (firstId) {
                        setInspectedSlotId(firstId);
                      }
                      const section = document.getElementById('circuito');
                      section?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }}
                    className="min-h-[44px] w-full rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:border-[var(--text-secondary)] text-[var(--text-primary)] px-3 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FileText size={15} weight="regular" aria-hidden="true" />
                    <span>Ver mi carga en unidad</span>
                  </button>
                  {availableCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmedReceipt(null);
                        applyPalletQuantityPreset(1);
                      }}
                      className="min-h-[44px] w-full rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:border-[var(--text-secondary)] text-[var(--text-primary)] px-3 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus size={15} weight="regular" aria-hidden="true" />
                      <span>Nueva reserva</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : availableCount === 0 ? (
            /* Docked but 0 available slots left */
            <div className="space-y-3">
              <div className="rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-hairline)] p-4 space-y-1.5">
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Unidad completa (12/12 pallets asignados)
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Ya podés simular la salida y precintado desde el panel Transportista.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveRole('carrier')}
                className="min-h-[44px] w-full rounded-full bg-[#276EF1] hover:bg-[#1E5BD6] text-[#FEFEFE] px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Truck size={16} weight="regular" aria-hidden="true" />
                <span>Simular despacho como Transportista</span>
              </button>
            </div>
          ) : (
            /* Interactive modular pallet booking form */
            <>
              {/* Pallet count stepper */}
              <div className="rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-hairline)] p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-[var(--text-primary)]">
                      Cantidad de pallets
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] font-mono tabular-nums">
                      {availableCount} {availableCount === 1 ? 'bahía libre' : 'bahías libres'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Restar pallet"
                      disabled={selectedCount <= 0}
                      onClick={() => applyPalletQuantityPreset(selectedCount - 1)}
                      className="min-h-[44px] min-w-[44px] rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-primary)] disabled:opacity-40 disabled:cursor-not-allowed hover:border-[var(--text-secondary)] transition-colors flex items-center justify-center cursor-pointer"
                    >
                      <Minus size={16} weight="regular" aria-hidden="true" />
                    </button>
                    <span className="w-8 text-center font-mono text-base font-semibold tabular-nums text-[var(--text-primary)]">
                      {selectedCount}
                    </span>
                    <button
                      type="button"
                      aria-label="Sumar pallet"
                      disabled={selectedCount >= availableCount}
                      onClick={() => applyPalletQuantityPreset(selectedCount + 1)}
                      className="min-h-[44px] min-w-[44px] rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-primary)] disabled:opacity-40 disabled:cursor-not-allowed hover:border-[var(--text-secondary)] transition-colors flex items-center justify-center cursor-pointer"
                    >
                      <Plus size={16} weight="regular" aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  {selectedCount > 0 ? (
                    <>
                      Bahías seleccionadas:{' '}
                      <span className="font-mono tabular-nums text-[var(--text-primary)]">
                        {selectedSlotIds.join(', ')}
                      </span>
                    </>
                  ) : (
                    'Tocá bahías libres en el plano del camión o usá el selector +.'
                  )}
                </p>
              </div>

              {/* Cargo type chips */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                  <Package size={15} weight="regular" aria-hidden="true" />
                  Tipo de mercadería
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {CARGO_OPTIONS.map((cargo) => {
                    const isSelected = draftCargoLabel === cargo;
                    return (
                      <button
                        key={cargo}
                        type="button"
                        onClick={() => setDraftCargo(cargo, draftPalletWeightKg)}
                        aria-pressed={isSelected}
                        className={`min-h-[44px] rounded-xl px-3 py-2 text-xs font-medium border transition-colors text-left cursor-pointer ${
                          isSelected
                            ? 'bg-[#276EF1] border-[#276EF1] text-[#FEFEFE]'
                            : 'bg-[var(--bg-subtle)] border-[var(--border-hairline)] text-[var(--text-primary)] hover:border-[var(--text-secondary)]'
                        }`}
                      >
                        {cargo}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Weight per pallet selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-[var(--text-primary)]">
                    Peso estimado por pallet
                  </p>
                  <span className="text-xs font-mono tabular-nums text-[var(--text-secondary)]">
                    Total: {formatKg(totalWeightKg)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {WEIGHT_OPTIONS.map((weight) => {
                    const isSelected = draftPalletWeightKg === weight;
                    return (
                      <button
                        key={weight}
                        type="button"
                        onClick={() => setDraftCargo(draftCargoLabel, weight)}
                        aria-pressed={isSelected}
                        className={`min-h-[44px] rounded-xl px-2.5 py-2 text-xs font-mono tabular-nums font-medium border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[var(--text-primary)] border-[var(--text-primary)] text-[var(--bg-surface)]'
                            : 'bg-[var(--bg-subtle)] border-[var(--border-hairline)] text-[var(--text-primary)] hover:border-[var(--text-secondary)]'
                        }`}
                      >
                        {weight} kg
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Optional Cargo Protection toggle (+2,5%) */}
              <button
                type="button"
                role="switch"
                aria-checked={hasCargoProtection}
                onClick={() => setHasCargoProtection(!hasCargoProtection)}
                className={`min-h-[44px] w-full rounded-xl border p-3.5 text-left transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                  hasCargoProtection
                    ? 'border-[#276EF1] bg-[#276EF1]/10'
                    : 'border-[var(--border-hairline)] bg-[var(--bg-subtle)] hover:border-[var(--text-secondary)]'
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <ShieldCheck
                    size={18}
                    weight="regular"
                    className={`shrink-0 mt-0.5 ${
                      hasCargoProtection
                        ? 'text-[#1E5BD6] dark:text-[#7AA7FF]'
                        : 'text-[var(--text-secondary)]'
                    }`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[var(--text-primary)]">
                      Protección de carga (+2,5%)
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Microseguro transaccional ante siniestro
                    </p>
                  </div>
                </div>
                <span className="shrink-0 font-mono text-xs font-medium tabular-nums text-[var(--text-primary)]">
                  {selectedCount > 0 ? `+ ${formatArs(protectionFeeArs || Math.round(activeRoute.pricePerPalletArs * selectedCount * 0.025))}` : '+2,5%'}
                </span>
              </button>

              {/* Numerical Breakdown */}
              <div className="rounded-xl border border-[var(--border-hairline)] p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[var(--text-secondary)]">
                    Tarifa modular ({selectedCount} x {formatArs(activeRoute.pricePerPalletArs)})
                  </span>
                  <span className="font-mono tabular-nums text-[var(--text-primary)]">
                    {formatArs(baseSubtotalArs)}
                  </span>
                </div>
                {hasCargoProtection && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[var(--text-secondary)]">Microseguro (+2,5%)</span>
                    <span className="font-mono tabular-nums text-[var(--text-primary)]">
                      {formatArs(protectionFeeArs)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-[var(--border-hairline)]">
                  <span className="font-medium text-[var(--text-primary)]">Total estimado</span>
                  <span className="font-mono text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                    {formatArs(totalPriceArs)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 text-[#1E5BD6] dark:text-[#7AA7FF]">
                  <span>Ahorro vs. camión dedicado</span>
                  <span className="font-mono font-medium tabular-nums">
                    -{savingsPct}%{selectedCount > 0 ? ` (${formatArs(savingsArs)})` : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 text-[var(--text-secondary)]">
                  <span className="flex items-center gap-1">
                    <Leaf size={13} weight="regular" aria-hidden="true" />
                    CO2 evitado
                  </span>
                  <span className="font-mono tabular-nums text-[var(--text-primary)]">
                    {formatDecimalEs(co2SavedKg)} kg
                  </span>
                </div>
              </div>

              {/* Primary CTA */}
              <button
                type="button"
                disabled={selectedCount === 0}
                onClick={handleConfirmBooking}
                className="min-h-[44px] w-full rounded-full bg-[#276EF1] hover:bg-[#1E5BD6] disabled:opacity-45 disabled:hover:bg-[#276EF1] disabled:cursor-not-allowed text-[#FEFEFE] px-5 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Confirmar reserva</span>
                <ArrowRight size={16} weight="regular" aria-hidden="true" />
              </button>

              <p className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5">
                <Clock size={13} weight="regular" aria-hidden="true" />
                <span>Salida prevista: {activeRoute.departureLabel}</span>
              </p>
            </>
          )}
        </div>
      )}
    </aside>
  );
}
