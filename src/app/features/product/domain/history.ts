import { PricePoint } from '../../../core/api/models';

const DAY = 86_400_000;

/** Summary of a price history; the history only gets a row per price change, so changes are rows - 1 */
export function historyStats(points: PricePoint[], now: number) {
  const prices = points.map((p) => p.price);
  const last = points.length > 1 ? Date.parse(points[points.length - 1].recorded_at) : null;
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
    avg: prices.reduce((a, b) => a + b, 0) / prices.length,
    changes: Math.max(points.length - 1, 0),
    /** Whole days since the last change, null when the price never changed */
    daysSinceChange: last === null ? null : Math.floor((now - last) / DAY),
  };
}

/** "HUEVOS, Leche Y Mantequilla" → "Huevos, leche y mantequilla" */
export const sentenceCase = (text: string) => text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
