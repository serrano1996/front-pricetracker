import { SearchProduct } from '../../core/api/models';

/**
 * Approximate pack size from price ÷ unit price (both rounded to cents by the stores), rounded to what packs carry:
 * half litres/kilos from 2, 0.05 steps from 1, 5 ml/g below, whole units: the cents error grows with the pack.
 * Null when it cannot be worked out.
 */
export function packSize(p: Pick<SearchProduct, 'price' | 'unit_price' | 'unit_price_unit'>): { amount: number; unit: string } | null {
  if (!p.unit_price || !p.unit_price_unit) return null;
  const amount = p.price / p.unit_price;
  if (p.unit_price_unit === 'ud') return Math.round(amount) > 0 ? { amount: Math.round(amount), unit: 'ud' } : null;
  if (p.unit_price_unit !== 'L' && p.unit_price_unit !== 'kg') return null;
  if (amount >= 2) return { amount: Math.round(amount * 2) / 2, unit: p.unit_price_unit };
  if (amount >= 1) return { amount: Math.round(amount * 20) / 20, unit: p.unit_price_unit };
  return { amount: Math.round((amount * 1000) / 5) * 5, unit: p.unit_price_unit === 'L' ? 'ml' : 'g' };
}
