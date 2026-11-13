import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  CheckCircle,
  Drop,
  Leaf,
  Minus,
  Plus,
  ShieldCheck,
  Warning,
} from '@phosphor-icons/react';
import { useSimulation } from '../context/SimulationContext';
import { estimateCarbonSavings } from '../utils/carbon';
import type { PackagingFormat } from '../types/logistics';
import { ActionButton } from './ActionButton';
import { CarbonFootprintCard } from './CarbonFootprintCard';

const COMPATIBLE_CARGO_CATEGORIES = [
  'Autopartes y metalúrgica',
  'Plásticos, envases y packaging',
  'Agroinsumos y semillas (secos)',
  'Alimentos secos y bebidas',
  'Construcción, herrajes y electricidad',
  'Textil, calzado y e-commerce',
  'Otro rubro seco (personalizado)',
] as const;

const PACKAGING_FORMATS: Array<{ id: PackagingFormat; label: string; hint: string }> = [
  { id: 'pallet', label: 'Pallet', hint: '1,2×1,0 m filmado (1 mód.)' },
  { id: 'boxes', label: 'Cajas', hint: '10 cajas apiladas (1 mód.)' },
  { id: 'bigbag', label: 'Big Bag', hint: 'Bolsón 1 m³ con eslingas' },
  { id: 'drums', label: 'Tambores', hint: '4 tambores de 200 L' },
];

const WEIGHT_PRESETS = [350, 650, 950] as const;

function formatArs(amount: number): string {
  return `$ ${Math.round(amount).toLocaleString('es-AR')}`;
}

export function ShipperPanel() {
  const shouldReduceMotion = useReducedMotion();
  const {
    routes,
    activeRoute,
    selectedSlotIds,
    applyPalletQuantityPreset,
    draftPackagingFormat,
    setDraftPackagingFormat,
    draftCargoLabel,
    draftPalletWeightKg,
    setDraftCargo,
    hasCargoProtection,
    setHasCargoProtection,
    confirmShipperBooking,
    setActiveRole,
    selectRoute,
  } = useSimulation();

  const [showDetailSettings, setShowDetailSettings] = useState(false);
  const [lastBookingCode, setLastBookingCode] = useState<string | null>(null);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCargoText, setCustomCargoText] = useState('');
  const [showCarbonDetail, setShowCarbonDetail] = useState(false);

  useEffect(() => {
    setLastBookingCode(null);
  }, [activeRoute.id]);

  useEffect(() => {
    if (selectedSlotIds.length > 0 && lastBookingCode) {
      setLastBookingCode(null);
    }
  }, [selectedSlotIds.length, lastBookingCode]);

  const availableCount = activeRoute.slots.filter((s) => s.status === 'available').length;
  const userBookedSlots = activeRoute.slots.filter((s) => s.status === 'user_booked');
  const selectedCount = selectedSlotIds.length;

  const baseSubtotalArs = selectedCount * activeRoute.pricePerPalletArs;
  const protectionFeeArs = hasCargoProtection ? Math.round(baseSubtotalArs * 0.025) : 0;
  const totalPriceArs = baseSubtotalArs + protectionFeeArs;
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
      : 35;

  const draftCarbonEstimate = estimateCarbonSavings(activeRoute, selectedCount);
  const bookedCarbonEstimate = estimateCarbonSavings(
    activeRoute,
    userBookedSlots.length > 0 ? userBookedSlots.length : 1
  );
  const activeFormatObj =
    PACKAGING_FORMATS.find((f) => f.id === draftPackagingFormat) ?? PACKAGING_FORMATS[0];

  const openAlternativeRoute = routes.find(
    (r) => r.id !== activeRoute.id && r.tripStatus === 'docked'
  );

  const handleConfirm = () => {
    const code = confirmShipperBooking();
    if (code) {
      setLastBookingCode(code);
    }
  };

  const handleCategoryChange = (val: string) => {
    if (val === 'Otro rubro seco (personalizado)') {
      setIsCustomCategory(true);
      setDraftCargo(customCargoText || 'Carga seca general', draftPalletWeightKg);
    } else {
      setIsCustomCategory(false);
      setDraftCargo(val, draftPalletWeightKg);
    }
  };

  const handleCustomTextChange = (text: string) => {
    setCustomCargoText(text);
    setDraftCargo(text.trim() || 'Carga seca general', draftPalletWeightKg);
  };

  // Vista Seguimiento por hitos (en tránsito)
  if (activeRoute.tripStatus !== 'docked') {
    const currentCp =
      activeRoute.checkpoints.find((c) => c.status === 'current') ??
      activeRoute.checkpoints[activeRoute.checkpoints.length - 1];

    return (
      <aside aria-label="Seguimiento Dador" className="space-y-4">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <p className="text-xs font-medium text-[var(--text-secondary)]">
              Dador · Plásticos Polo 52 SA
            </p>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              {activeRoute.tripStatus === 'delivered' ? 'Carga entregada en destino' : `Pasando por ${currentCp?.city.split(',')[0]}`}
            </h2>
          </div>
          {userBookedSlots.length > 0 && (
            <span className="rounded-full bg-[var(--bg-subtle)] px-3 py-1 font-mono text-xs font-semibold text-[var(--text-primary)]">
              {userBookedSlots[0].bookingCode}
            </span>
          )}
        </div>

        <CarbonFootprintCard
          estimate={bookedCarbonEstimate}
          title="Huella de carbono evitada"
          compact
        />

        {activeRoute.tripStatus === 'incident' && activeRoute.incident && (
          <figure className="flex items-center gap-3 rounded-2xl border border-[var(--border-hairline)] p-3">
            <img
              src={activeRoute.incident.photoUrl}
              alt="Evidencia vial reportada en ruta"
              className="h-14 w-20 shrink-0 rounded-xl object-cover"
            />
            <div className="min-w-0 text-xs">
              <p className="flex items-center gap-1 font-semibold text-[var(--text-primary)]">
                <Warning size={14} weight="bold" className="shrink-0 text-[#D97706]" aria-hidden="true" />
                <span className="truncate">{activeRoute.incident.kmLocation}</span>
              </p>
              <p className="text-[11px] text-[var(--text-secondary)]">
                +{activeRoute.incident.delayMinutes} min · Foto verificada
              </p>
            </div>
          </figure>
        )}

        <div className="space-y-2 pt-2">
          <ActionButton
            onClick={() => setActiveRole('carrier')}
            confirmedLabel="Abriendo Chofer"
            confirmBeatMs={180}
            className="w-full min-h-[48px]"
          >
            <span>Ver recorrido en vivo como Chofer</span>
            <ArrowRight size={14} weight="regular" aria-hidden="true" />
          </ActionButton>

          {openAlternativeRoute && (
            <button
              type="button"
              onClick={() => selectRoute(openAlternativeRoute.id)}
              className="flex min-h-[40px] w-full cursor-pointer items-center justify-center rounded-full border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-4 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:border-[#276EF1]"
            >
              Reservar en otro camión ({openAlternativeRoute.code})
            </button>
          )}
        </div>
      </aside>
    );
  }

  // Vista Remito Digital Confirmado
  if (lastBookingCode) {
    return (
      <aside aria-label="Reserva confirmada" className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[#276EF1]">
            <CheckCircle size={22} weight="bold" aria-hidden="true" />
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              Reserva confirmada
            </h2>
          </div>
          <span className="rounded-full bg-[var(--bg-subtle)] px-3 py-1 font-mono text-xs font-bold text-[var(--text-primary)]">
            {lastBookingCode}
          </span>
        </div>

        <div className="rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-hairline)] p-4 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)]">Módulos reservados:</span>
            <span className="font-mono font-bold text-[var(--text-primary)]">{userBookedSlots.length} de 12</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)]">Ubicación acoplado:</span>
            <span className="font-mono font-bold text-[var(--text-primary)]">
              {userBookedSlots.map((s) => s.id).join(', ')}
            </span>
          </div>
        </div>

        <CarbonFootprintCard
          estimate={bookedCarbonEstimate}
          title="Impacto ambiental confirmado"
          compact
        />

        <ActionButton
          onClick={() => setActiveRole('carrier')}
          confirmedLabel="Abriendo Chofer"
          confirmBeatMs={200}
          className="w-full min-h-[48px]"
        >
          <span>Despachar como Chofer</span>
          <ArrowRight size={14} weight="regular" aria-hidden="true" />
        </ActionButton>

        {availableCount > 0 && (
          <button
            type="button"
            onClick={() => setLastBookingCode(null)}
            className="w-full cursor-pointer text-center text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            + Agregar otra carga
          </button>
        )}
      </aside>
    );
  }

  // Vista Principal de Reserva: Diseño limpio y respirable
  return (
    <aside aria-label="Reservar pallets" className="space-y-5">
      {/* Header */}
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-[var(--text-secondary)]">
            Dador PyME · {activeRoute.origin.split(',')[0]} a {activeRoute.destination.split(',')[0]}
          </p>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            ¿Cuánto espacio cargás?
          </h2>
        </div>
        <div className="text-right">
          <span className="font-mono text-sm font-bold text-[var(--text-primary)]">
            {formatArs(activeRoute.pricePerPalletArs)}
          </span>
          <span className="block text-[10px] text-[var(--text-secondary)]">por módulo</span>
        </div>
      </div>

      {/* Packaging Format: 4 equal cards */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-[var(--text-secondary)]">
          Tipo de formato
        </label>
        <div className="grid grid-cols-4 gap-2">
          {PACKAGING_FORMATS.map((fmt) => {
            const active = draftPackagingFormat === fmt.id;
            return (
              <button
                key={fmt.id}
                type="button"
                onClick={() => setDraftPackagingFormat(fmt.id)}
                className={`cursor-pointer rounded-xl border p-2 text-center text-xs font-medium transition-all ${
                  active
                    ? 'border-[#141414] bg-[#141414] text-[#F6F6F6] dark:border-[#F5F5F7] dark:bg-[#F5F5F7] dark:text-[#111112] shadow-sm'
                    : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-primary)] hover:border-[#A1A1AA]'
                }`}
              >
                {fmt.label}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-[var(--text-secondary)] pt-0.5">
          {activeFormatObj.hint}
        </p>
      </div>

      {/* Quantity Selector: Unified and spacious */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-[var(--text-secondary)]">
            Cantidad de módulos
          </label>
          <span className="text-[11px] font-mono text-[var(--text-secondary)]">
            {availableCount} módulos libres en bodega
          </span>
        </div>

        <div className="flex h-12 items-center justify-between rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3">
          <motion.button
            type="button"
            whileTap={shouldReduceMotion || selectedCount <= 0 ? undefined : { scale: 0.9 }}
            onClick={() => applyPalletQuantityPreset(Math.max(0, selectedCount - 1))}
            disabled={selectedCount <= 0}
            aria-label="Restar módulo"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-hairline)] hover:border-[#276EF1] disabled:opacity-30"
          >
            <Minus size={16} weight="bold" aria-hidden="true" />
          </motion.button>

          <div className="text-center">
            <span className="font-mono text-base font-bold tabular-nums text-[var(--text-primary)]">
              {selectedCount} {selectedCount === 1 ? 'módulo' : 'módulos'}
            </span>
            <span className="block text-[10px] text-[var(--text-secondary)]">
              {(selectedCount * 1.6).toFixed(1)} m³ aprox.
            </span>
          </div>

          <motion.button
            type="button"
            whileTap={
              shouldReduceMotion || selectedCount >= availableCount ? undefined : { scale: 0.9 }
            }
            onClick={() => applyPalletQuantityPreset(Math.min(availableCount, selectedCount + 1))}
            disabled={selectedCount >= availableCount}
            aria-label="Sumar módulo"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-hairline)] hover:border-[#276EF1] disabled:opacity-30"
          >
            <Plus size={16} weight="bold" aria-hidden="true" />
          </motion.button>
        </div>
      </div>

      {/* Cargo Spec and Rubro */}
      <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-3.5 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--text-secondary)]">Rubro de mercadería:</span>
          <button
            type="button"
            onClick={() => setShowDetailSettings(!showDetailSettings)}
            className="font-semibold text-[#276EF1] hover:underline cursor-pointer"
          >
            {showDetailSettings ? 'Guardar' : 'Modificar'}
          </button>
        </div>

        <div className="text-xs font-medium text-[var(--text-primary)] flex items-center justify-between">
          <span>{draftCargoLabel}</span>
          <span className="font-mono text-[var(--text-secondary)]">{draftPalletWeightKg} kg/mód.</span>
        </div>

        {showDetailSettings && (
          <div className="pt-2 border-t border-[var(--border-hairline)] space-y-2.5">
            <div className="flex items-center gap-2">
              <select
                aria-label="Rubro de carga seca"
                value={isCustomCategory ? 'Otro rubro seco (personalizado)' : draftCargoLabel}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="h-10 min-w-0 flex-1 cursor-pointer rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-primary)]"
              >
                {COMPATIBLE_CARGO_CATEGORIES.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>

              <button
                type="button"
                role="switch"
                aria-checked={hasCargoProtection}
                onClick={() => setHasCargoProtection(!hasCargoProtection)}
                className={`inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-colors ${
                  hasCargoProtection
                    ? 'border-[#276EF1] bg-[#276EF1]/10 text-[#276EF1]'
                    : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                }`}
              >
                <ShieldCheck size={15} weight="regular" aria-hidden="true" />
                <span>Seguro (+2,5%)</span>
              </button>
            </div>

            {isCustomCategory && (
              <input
                type="text"
                placeholder="Especificá tipo de mercadería seca..."
                value={customCargoText}
                onChange={(e) => handleCustomTextChange(e.target.value)}
                className="h-10 w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3 text-xs text-[var(--text-primary)]"
              />
            )}

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-[var(--text-secondary)]">Peso estándar:</span>
              <div className="flex items-center gap-1.5">
                {WEIGHT_PRESETS.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setDraftCargo(draftCargoLabel, w)}
                    className={`rounded-lg px-2.5 py-1 font-mono text-xs font-semibold cursor-pointer ${
                      draftPalletWeightKg === w
                        ? 'bg-[#276EF1] text-[#FEFEFE]'
                        : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {w} kg
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Carbon Impact Pill */}
      <button
        type="button"
        onClick={() => setShowCarbonDetail((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3.5 py-3 text-xs transition-colors hover:border-[#276EF1]"
      >
        <span className="inline-flex items-center gap-2 font-medium text-[var(--text-primary)]">
          <Leaf size={16} weight="regular" className="text-[#276EF1] shrink-0" aria-hidden="true" />
          <span>
            {selectedCount > 0
              ? `-${draftCarbonEstimate.co2SavedKg} kg CO2e evitado`
              : 'Huella de carbono evitada'}
          </span>
        </span>
        <span className="inline-flex items-center gap-1 font-mono text-xs text-[#276EF1] font-semibold">
          <Drop size={13} weight="regular" aria-hidden="true" />
          <span>{selectedCount > 0 ? `${draftCarbonEstimate.dieselSavedLiters} L diésel` : 'Ver cálculo'}</span>
        </span>
      </button>

      {showCarbonDetail && (
        <CarbonFootprintCard estimate={draftCarbonEstimate} />
      )}

      {/* Total & Action Button */}
      <div className="flex items-center gap-4 pt-2">
        <div className="min-w-0">
          <span className="block font-mono text-xl sm:text-2xl font-bold tabular-nums text-[var(--text-primary)] leading-none">
            {formatArs(totalPriceArs)}
          </span>
          <span className="font-mono text-xs text-[#276EF1] font-semibold">
            {selectedCount > 0 ? `-${savingsPct}% vs camión completo` : `${availableCount} módulos libres`}
          </span>
        </div>

        <ActionButton
          onClick={handleConfirm}
          disabled={selectedCount === 0}
          confirmedLabel="Reserva registrada"
          confirmBeatMs={220}
          className="flex-1 min-h-[50px]"
        >
          <span>Confirmar reserva</span>
        </ActionButton>
      </div>
    </aside>
  );
}
