// Shopping list rules: what an item costs in each store and the cheapest ways to buy the whole list

/** One store's option for an item */
export interface Choice {
  store: string;
  product_id: string;
  name: string;
  price: number;
  unit_price: number | null;
}

/**
 * Something to buy, with one option per store as seen when it was added.
 * - per 'unit': a product type ("Leche entera"), quantity in its unit (L, kg, ud).
 * - per 'pack': a product picked from a store's list, quantity in packs; other stores offer its type's equivalent.
 */
export interface BasketItem {
  /** Type name or picked product id */
  key: string;
  label: string;
  unit: string | null;
  per: 'unit' | 'pack';
  quantity: number;
  offers: Choice[];
  postalCode: string;
  addedAt: string;
}

/** A way to buy the list using only [stores], each item where it is cheapest among them */
export interface Plan {
  stores: string[];
  total: number;
  /** Items none of [stores] offers */
  missing: number;
  picks: { key: string; store: string; cost: number }[];
}

/** What [item] costs at [offer]; equivalents of a picked product are priced by unit, so pack sizes do not matter */
export function cost(item: BasketItem, offer: Choice): number | null {
  if (item.per === 'unit') return offer.unit_price === null ? null : offer.unit_price * item.quantity;
  if (offer.product_id === item.key) return offer.price * item.quantity;
  const picked = item.offers.find((o) => o.product_id === item.key);
  if (!picked?.unit_price || offer.unit_price === null) return null;
  return ((item.quantity * picked.price) / picked.unit_price) * offer.unit_price;
}

/** Every combination of stores (each alone, in pairs, all…): complete plans first, then cheapest, then fewer stores */
export function plans(items: BasketItem[]): Plan[] {
  const stores = [...new Set(items.flatMap((i) => i.offers.map((o) => o.store)))];
  const result: Plan[] = [];
  for (let mask = 1; mask < 1 << stores.length; mask++) {
    const subset = stores.filter((_, i) => mask & (1 << i));
    const plan: Plan = { stores: subset, total: 0, missing: 0, picks: [] };
    for (const item of items) {
      let best: { store: string; cost: number } | undefined;
      for (const offer of item.offers) {
        const c = subset.includes(offer.store) ? cost(item, offer) : null;
        if (c !== null && (!best || c < best.cost)) best = { store: offer.store, cost: c };
      }
      if (best) {
        plan.total += best.cost;
        plan.picks.push({ key: item.key, ...best });
      } else plan.missing++;
    }
    result.push(plan);
  }
  return result.sort((a, b) => a.missing - b.missing || a.total - b.total || a.stores.length - b.stores.length);
}

/** Totals within half a cent are the same price */
export const same = (a: number, b: number) => Math.abs(a - b) < 0.005;

/** Stores where [item] costs least; several on a tie */
export function cheapestStores(item: BasketItem): Set<string> {
  const costs = item.offers.map((o) => ({ store: o.store, cost: cost(item, o) })).filter((c) => c.cost !== null);
  const min = Math.min(...costs.map((c) => c.cost!));
  return new Set(costs.filter((c) => same(c.cost!, min)).map((c) => c.store));
}

/** Plans (already best first) without the ones that cost the same as a better one: more stores for nothing */
export function distinctPlans(plans: Plan[]): Plan[] {
  return plans.filter((p, i) => !plans.slice(0, i).some((q) => q.missing === p.missing && same(q.total, p.total)));
}
