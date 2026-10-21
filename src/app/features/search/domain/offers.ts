import { Offer, SearchProduct } from '../../../core/api/models';

export type SortBy = 'unit_price' | 'price' | 'relevance';

/** Relevance is the store's own order; products without a unit price go last */
export function sortProducts(products: SearchProduct[], by: SortBy): SearchProduct[] {
  if (by === 'relevance') return products;
  const key = (p: SearchProduct) => (by === 'price' ? p.price : (p.unit_price ?? Infinity));
  return [...products].sort((a, b) => key(a) - key(b));
}

/** Ids of the lowest unit price for each unit: €/kg and €/L cannot be compared with each other */
export function cheapestPerUnit(products: SearchProduct[]): Set<string> {
  const best = new Map<string, SearchProduct>();
  for (const p of products) {
    if (p.unit_price === null || !p.unit_price_unit) continue;
    const current = best.get(p.unit_price_unit);
    if (!current || p.unit_price < current.unit_price!) best.set(p.unit_price_unit, p);
  }
  return new Set([...best.values()].map((p) => p.id));
}

export interface ComparedOffer {
  offer: Offer;
  /** How much dearer than the cheapest, per unit and as a fraction */
  diff: number;
  pct: number;
  best: boolean;
  /** Unit price as a percentage of the dearest offer */
  bar: number;
}

/** Each offer against the cheapest: offers within half a cent of it all count as cheapest, and then it is a tie */
export function compareOffers(offers: Offer[]): { rows: ComparedOffer[]; tie: boolean } {
  const prices = offers.map((o) => o.unit_price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const rows = offers.map((offer) => {
    const diff = offer.unit_price - min;
    return { offer, diff, pct: min ? diff / min : 0, best: diff < 0.005, bar: max ? (offer.unit_price / max) * 100 : 100 };
  });
  return { rows, tie: rows.filter((r) => r.best).length > 1 };
}
