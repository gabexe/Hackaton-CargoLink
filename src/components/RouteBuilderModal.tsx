import { useState } from 'react';
import {
  Compass,
  MapPin,
  MagnifyingGlass,
  Plus,
  Truck,
  X,
} from '@phosphor-icons/react';
import {
  AR_INDUSTRIAL_HUBS,
  searchRealLocations,
  type LocationSearchResult,
} from '../utils/routing';
import { ActionButton } from './ActionButton';

interface RouteBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    originName: string;
    originLat: number;
    originLng: number;
    destinationName: string;
    destinationLat: number;
    destinationLng: number;
    carrierName: string;
    pricePerPalletArs: number;
  }) => Promise<void>;
}

export function RouteBuilderModal({ isOpen, onClose, onSubmit }: RouteBuilderModalProps) {
  const [originSearch, setOriginSearch] = useState('Polo 52 Parque Industrial, Córdoba');
  const [selectedOrigin, setSelectedOrigin] = useState<LocationSearchResult>(AR_INDUSTRIAL_HUBS[0]);
  const [originResults, setOriginResults] = useState<LocationSearchResult[]>([]);

  const [destSearch, setDestSearch] = useState('Rosario Puerto y Zona Sur, Santa Fe');
  const [selectedDest, setSelectedDest] = useState<LocationSearchResult>(AR_INDUSTRIAL_HUBS[6]);
  const [destResults, setDestResults] = useState<LocationSearchResult[]>([]);

  const [carrierName, setCarrierName] = useState('Transporte Federal SRL');
  const [pricePerPallet, setPricePerPallet] = useState(48500);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSearchOrigin = async (query: string) => {
    setOriginSearch(query);
    const results = await searchRealLocations(query);
    setOriginResults(results);
  };

  const handleSearchDest = async (query: string) => {
    setDestSearch(query);
    const results = await searchRealLocations(query);
    setDestResults(results);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrigin || !selectedDest) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        originName: selectedOrigin.name,
        originLat: selectedOrigin.lat,
        originLng: selectedOrigin.lng,
        destinationName: selectedDest.name,
        destinationLat: selectedDest.lat,
        destinationLng: selectedDest.lng,
        carrierName,
        pricePerPalletArs: pricePerPallet,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="route-builder-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#141414]/60 p-0 sm:p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass size={20} weight="regular" className="text-[#276EF1]" aria-hidden="true" />
            <h2 id="route-builder-title" className="text-base font-semibold text-[var(--text-primary)]">
              Configurar Corredor Real en Argentina
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
          >
            <X size={16} weight="regular" aria-hidden="true" />
          </button>
        </div>

        <p className="text-xs text-[var(--text-secondary)]">
          Geocodificación con OpenStreetMap / Nominatim y cálculo de carretera real con OSRM.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Origin Picker */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
              <MapPin size={14} weight="regular" className="text-[#276EF1]" aria-hidden="true" />
              <span>Origen (Planta o Parque Industrial)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={originSearch}
                onChange={(e) => handleSearchOrigin(e.target.value)}
                placeholder="Buscar parque industrial o ciudad..."
                className="h-10 w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] pl-9 pr-3 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#276EF1]"
              />
              <MagnifyingGlass
                size={14}
                weight="regular"
                className="absolute left-3 top-3 text-[var(--text-secondary)]"
                aria-hidden="true"
              />
            </div>

            {originResults.length > 0 && (
              <div className="max-h-36 overflow-y-auto rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-1 text-xs">
                {originResults.map((r) => (
                  <button
                    key={`${r.lat}-${r.lng}-${r.name}`}
                    type="button"
                    onClick={() => {
                      setSelectedOrigin(r);
                      setOriginSearch(r.name);
                      setOriginResults([]);
                    }}
                    className="flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-left hover:bg-[var(--bg-subtle)]"
                  >
                    <span className="truncate font-medium text-[var(--text-primary)]">{r.name}</span>
                    <span className="ml-2 shrink-0 font-mono text-[10px] text-[var(--text-secondary)]">
                      {r.category ?? 'OSM'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Destination Picker */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
              <MapPin size={14} weight="regular" className="text-[#276EF1]" aria-hidden="true" />
              <span>Destino (Recepción o Puerto)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={destSearch}
                onChange={(e) => handleSearchDest(e.target.value)}
                placeholder="Buscar destino..."
                className="h-10 w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] pl-9 pr-3 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#276EF1]"
              />
              <MagnifyingGlass
                size={14}
                weight="regular"
                className="absolute left-3 top-3 text-[var(--text-secondary)]"
                aria-hidden="true"
              />
            </div>

            {destResults.length > 0 && (
              <div className="max-h-36 overflow-y-auto rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-1 text-xs">
                {destResults.map((r) => (
                  <button
                    key={`${r.lat}-${r.lng}-${r.name}`}
                    type="button"
                    onClick={() => {
                      setSelectedDest(r);
                      setDestSearch(r.name);
                      setDestResults([]);
                    }}
                    className="flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-left hover:bg-[var(--bg-subtle)]"
                  >
                    <span className="truncate font-medium text-[var(--text-primary)]">{r.name}</span>
                    <span className="ml-2 shrink-0 font-mono text-[10px] text-[var(--text-secondary)]">
                      {r.category ?? 'OSM'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Carrier & Pricing */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[var(--text-secondary)]">
                Empresa transportista
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={carrierName}
                  onChange={(e) => setCarrierName(e.target.value)}
                  className="h-9 w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] pl-7 pr-2 text-xs text-[var(--text-primary)]"
                />
                <Truck
                  size={13}
                  weight="regular"
                  className="absolute left-2.5 top-2.5 text-[var(--text-secondary)]"
                  aria-hidden="true"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[var(--text-secondary)]">
                Tarifa / módulo ARS
              </label>
              <input
                type="number"
                step="1000"
                value={pricePerPallet}
                onChange={(e) => setPricePerPallet(Number(e.target.value))}
                className="h-9 w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-2.5 font-mono text-xs text-[var(--text-primary)]"
              />
            </div>
          </div>

          <div className="pt-2">
            <ActionButton
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              confirmedLabel="Ruta real generada"
              className="min-h-[46px]"
            >
              <Plus size={16} weight="bold" aria-hidden="true" />
              <span>{isSubmitting ? 'Trazando ruta con OSRM...' : 'Crear y simular corredor real'}</span>
            </ActionButton>
          </div>
        </form>
      </div>
    </div>
  );
}
