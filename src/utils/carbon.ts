import type { CarbonEstimate, CorridorRoute } from '../types/logistics';

// Average heavy diesel emission factor: 2.68 kg CO2e per liter burned
const KG_CO2_PER_DIESEL_LITER = 2.68;

/**
 * Estimates carbon footprint savings from consolidating pallets onto an
 * existing corridor truck instead of dispatching an exclusive vehicle.
 */
export function estimateCarbonSavings(
  route: CorridorRoute,
  palletsCount: number
): CarbonEstimate {
  const safePallets = Math.max(0, palletsCount);
  const lastCheckpoint = route.checkpoints[route.checkpoints.length - 1];
  const distanceKm = lastCheckpoint?.kmFromOrigin ?? 402;

  const co2SavedKg = Math.round(safePallets * route.co2SavedPerPalletKg * 10) / 10;
  // Shared incremental load generates ~28% of the emissions of an exclusive trip
  const exclusiveCo2Kg =
    safePallets > 0 ? Math.round((co2SavedKg / 0.72) * 10) / 10 : 0;
  const sharedCo2Kg = Math.max(
    0,
    Math.round((exclusiveCo2Kg - co2SavedKg) * 10) / 10
  );
  const dieselSavedLiters =
    Math.round((co2SavedKg / KG_CO2_PER_DIESEL_LITER) * 10) / 10;
  const reductionPct =
    exclusiveCo2Kg > 0 ? Math.round((co2SavedKg / exclusiveCo2Kg) * 100) : 72;

  return {
    palletsCount: safePallets,
    distanceKm,
    co2SavedKg,
    exclusiveCo2Kg,
    sharedCo2Kg,
    dieselSavedLiters,
    reductionPct,
  };
}

/**
 * Converts CO2e mass in kg to avoided diesel fuel volume in liters.
 */
export function co2ToDieselLiters(co2Kg: number): number {
  return Math.round((Math.max(0, co2Kg) / KG_CO2_PER_DIESEL_LITER) * 10) / 10;
}
