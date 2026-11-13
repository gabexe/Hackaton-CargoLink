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

  // Vista 2C: Seguimiento por hitos (en tránsito)
  if (activeRoute.tripStatus !== 'docked') {
    const currentCp =
      activeRoute.checkpoints.find((c) => c.status === 'current') ??
      activeRoute.checkpoints[activeRoute.checkpoints.length - 1];

    return (
      <aside aria-label="Seguimiento Dador" className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <p className="text-[11px] font-medium text-[var(--text-secondary)]">
              Dador · Plásticos Polo 52 SA
            </p>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              {activeRoute.tripStatus === 'delivered' ? 'Carga entregada' : `Pasando por ${currentCp?.city.split(',')[0]}`}
            </h2>
          </div>
          {userBookedSlots.length > 0 && (
            <span className="rounded-full bg-[var(--bg-subtle)] px-2.5 py-0.5 font-mono text-[11px] font-medium text-[var(--text-primary)]">
              {userBookedSlots[0].bookingCode}
            </span>
          )}
        </div>

        <CarbonFootprintCard
          estimate={bookedCarbonEstimate}
          title="Huella evitada"
          compact
        />

        {activeRoute.tripStatus === 'incident' && activeRoute.incident && (
          <figure className="flex items-center gap-3 rounded-xl border border-[var(--border-hairline)] p-2.5">
            <img
              src={activeRoute.incident.photoUrl}
              alt="Evidencia vial reportada en ruta"
              className="h-14 w-20 shrink-0 rounded-lg object-cover"
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

        <div className="space-y-2">
          <ActionButton
            onClick={() => setActiveRole('carrier')}
            confirmedLabel="Abriendo Chofer"
            confirmBeatMs={180}
          >
            <span>Simular viaje como Chofer</span>
            <ArrowRight size={14} weight="regular" aria-hidden="true" />
          </ActionButton>

          {openAlternativeRoute && (
            <button
              type="button"
              onClick={() => selectRoute(openAlternativeRoute.id)}
              className="flex min-h-[38px] w-full cursor-pointer items-center justify-center rounded-full border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-4 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
            >
              Reservar en {openAlternativeRoute.code}
            </button>
          )}
        </div>
      </aside>
    );
  }

  // Vista 2B: Remito Digital Confirmado
  if (lastBookingCode) {
    return (
      <aside aria-label="Reserva confirmada" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[#276EF1]">
            <CheckCircle size={20} weight="bold" aria-hidden="true" />
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Reserva confirmada
            </h2>
          </div>
          <span className="rounded-full bg-[var(--bg-subtle)] px-2.5 py-0.5 font-mono text-xs font-semibold text-[var(--text-primary)]">
            {lastBookingCode}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-hairline)] px-3.5 py-2.5 text-xs">
          <span className="text-[var(--text-secondary)]">Espacios asignados (LIFO)</span>
          <span className="font-mono font-semibold text-[var(--text-primary)]">
            {userBookedSlots.map((s) => s.id).join(', ')}
          </span>
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
        >
          <span>Despachar como Chofer</span>
          <ArrowRight size={14} weight="regular" aria-hidden="true" />
        </ActionButton>

        {availableCount > 0 && (
          <button
            type="button"
            onClick={() => setLastBookingCode(null)}
            className="w-full cursor-pointer text-center text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Agregar otra reserva
          </button>
        )}
      </aside>
    );
  }

  // Vista 2A: Cotizador rápido por módulo estándar (Pallet / Cajas / Big Bag)
  return (
    <aside aria-label="Reservar pallets" className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <p className="text-[11px] text-[var(--text-secondary)]">
            Dador · {activeRoute.origin.split(',')[0]} a {activeRoute.destination.split(',')[0]}
          </p>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            ¿Cuánto espacio cargás?
          </h2>
        </div>
        <span className="font-mono text-xs font-medium text-[var(--text-secondary)]">
          {formatArs(activeRoute.pricePerPalletArs)} / mód.
        </span>
      </div>

      {/* Packaging Format -> Standardized Fixed Modules */}
      <div className="space-y-1.5">
        <div className="grid grid-cols-4 gap-1.5">
          {PACKAGING_FORMATS.map((fmt) => {
            const active = draftPackagingFormat === fmt.id;
            return (
              <button
                key={fmt.id}
                type="button"
                onClick={() => setDraftPackagingFormat(fmt.id)}
                className={`cursor-pointer rounded-xl border px-1.5 py-1.5 text-center text-xs font-medium transition-colors ${
                  active
                    ? 'border-[#141414] bg-[#141414] text-[#F6F6F6] dark:border-[#F5F5F7] dark:bg-[#F5F5F7] dark:text-[#111112]'
                    : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-primary)] hover:border-[#A1A1AA]'
                }`}
              >
                {fmt.label}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-[var(--text-secondary)]">
          3D en vivo: {activeFormatObj.hint}
        </p>
      </div>

      {/* Quick Presets + Fine Stepper */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          {[1, 2, 4].map((qty) => {
            const disabled = qty > availableCount;
            const active = selectedCount === qty;
            return (
              <button
                key={qty}
                type="button"
                disabled={disabled}
                onClick={() => applyPalletQuantityPreset(qty)}
                className={`h-10 min-w-[42px] cursor-pointer rounded-xl border px-2.5 font-mono text-xs font-semibold transition-colors disabled:opacity-35 ${
                  active
                    ? 'border-[#276EF1] bg-[#276EF1] text-[#FEFEFE]'
                    : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-primary)] hover:border-[#276EF1]'
                }`}
              >
                {qty}
              </button>
            );
          })}
        </div>

        <div className="flex h-10 flex-1 items-center justify-between rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-1.5">
          <motion.button
            type="button"
            whileTap={shouldReduceMotion || selectedCount <= 0 ? undefined : { scale: 0.88 }}
            onClick={() => applyPalletQuantityPreset(Math.max(0, selectedCount - 1))}
            disabled={selectedCount <= 0}
            aria-label="Restar módulo"
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] disabled:opacity-35"
          >
            <Minus size={14} weight="regular" aria-hidden="true" />
          </motion.button>
          <span className="font-mono text-xs font-semibold tabular-nums text-[var(--text-primary)]">
            {selectedCount} {selectedCount === 1 ? 'mód.' : 'mód.'}
          </span>
          <motion.button
            type="button"
            whileTap={
              shouldReduceMotion || selectedCount >= availableCount ? undefined : { scale: 0.88 }
            }
            onClick={() => applyPalletQuantityPreset(Math.min(availableCount, selectedCount + 1))}
            disabled={selectedCount >= availableCount}
            aria-label="Sumar módulo"
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] disabled:opacity-35"
          >
            <Plus size={14} weight="regular" aria-hidden="true" />
          </motion.button>
        </div>
      </div>

      {/* Collapsible Spec Chip (Weight, Rubro, Insurance) */}
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={() => setShowDetailSettings(!showDetailSettings)}
          className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 py-2 text-xs transition-colors hover:border-[#276EF1]"
        >
          <span className="truncate text-[var(--text-secondary)]">
            <strong className="text-[var(--text-primary)]">{draftPalletWeightKg} kg/mód.</strong> · {draftCargoLabel.split(' ')[0]} {hasCargoProtection ? '· Con seguro' : ''}
          </span>
          <span className="font-semibold text-[#276EF1] text-[11px] shrink-0 ml-2">
            {showDetailSettings ? 'Listo' : 'Editar rubro'}
          </span>
        </button>

        {showDetailSettings && (
          <div className="p-3 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] space-y-2.5">
            <div className="flex items-center gap-2">
              <select
                aria-label="Rubro de carga seca"
                value={isCustomCategory ? 'Otro rubro seco (personalizado)' : draftCargoLabel}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="h-9 min-w-0 flex-1 cursor-pointer rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-2.5 text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#276EF1]"
              >
                {COMPATIBLE_CARGO_CATEGORIES.map((opt) => (
                  <option key={opt} value={opt} className="bg-[var(--bg-surface)]">
                    {opt}
                  </option>
                ))}
              </select>

              <button
                type="button"
                role="switch"
                aria-checked={hasCargoProtection}
                onClick={() => setHasCargoProtection(!hasCargoProtection)}
                className={`inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-colors ${
                  hasCargoProtection
                    ? 'border-[#276EF1] bg-[#276EF1]/10 text-[#276EF1]'
                    : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                }`}
              >
                <ShieldCheck size={14} weight="regular" aria-hidden="true" />
                <span>Seguro +2,5%</span>
              </button>
            </div>

            {isCustomCategory && (
              <input
                type="text"
                placeholder="Especificá tipo de mercadería seca..."
                value={customCargoText}
                onChange={(e) => handleCustomTextChange(e.target.value)}
                className="h-9 w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#276EF1]"
              />
            )}

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-[11px] text-[var(--text-secondary)]">Peso por módulo:</span>
              <div className="flex items-center gap-1">
                {WEIGHT_PRESETS.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setDraftCargo(draftCargoLabel, w)}
                    className={`rounded-lg px-2.5 py-1 font-mono text-xs font-semibold cursor-pointer transition-colors ${
                      draftPalletWeightKg === w
                        ? 'bg-[#276EF1] text-[#FEFEFE]'
                        : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
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

      {/* Compact Carbon Impact Pill (expandable) */}
      <button
        type="button"
        onClick={() => setShowCarbonDetail((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 py-2 text-left text-xs transition-colors hover:border-[#276EF1]"
      >
        <span className="inline-flex items-center gap-1.5 font-medium text-[var(--text-primary)]">
          <Leaf size={14} weight="regular" className="text-[#276EF1] shrink-0" aria-hidden="true" />
          <span>
            {selectedCount > 0
              ? `-${draftCarbonEstimate.co2SavedKg.toLocaleString('es-AR')} kg CO2e`
              : 'Huella de carbono'}
          </span>
        </span>
        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#276EF1]">
          <Drop size={12} weight="regular" aria-hidden="true" />
          <span>
            {selectedCount > 0
              ? `${draftCarbonEstimate.dieselSavedLiters.toLocaleString('es-AR')} L diésel (-72%)`
              : 'Ver cálculo'}
          </span>
        </span>
      </button>

      {showCarbonDetail && (
        <CarbonFootprintCard estimate={draftCarbonEstimate} />
      )}

      {/* Total & Primary CTA */}
      <div className="flex items-center gap-3 pt-1">
        <div className="min-w-0">
          <span className="block font-mono text-lg sm:text-xl font-semibold tabular-nums text-[var(--text-primary)] leading-tight">
            {formatArs(totalPriceArs)}
          </span>
          <span className="font-mono text-[11px] text-[#276EF1]">
            {selectedCount > 0 ? `-${savingsPct}% vs. exclusivo` : `${availableCount} libres`}
          </span>
        </div>

        <ActionButton
          onClick={handleConfirm}
          disabled={selectedCount === 0}
          confirmedLabel="Reserva registrada"
          confirmBeatMs={220}
          className="flex-1 min-h-[48px]"
        >
          <span>Confirmar reserva</span>
        </ActionButton>
      </div>
    </aside>
  );
}
