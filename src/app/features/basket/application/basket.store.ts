import { computed, effect, Injectable, signal } from '@angular/core';
import { Comparison, SearchProduct } from '../../../core/api/models';
import { load, save } from '../../../core/storage/storage';
import { BasketItem, Choice, plans } from '../domain/basket';

const KEY = 'pt.basket';

/** Lists saved before products could be added held only product types */
function upgrade(item: BasketItem | { type: string; unit: string; quantity: number; offers: Choice[]; postalCode: string; addedAt: string }): BasketItem {
  if ('key' in item) return item;
  return { key: item.type, label: item.type, unit: item.unit, per: 'unit', quantity: item.quantity, offers: item.offers, postalCode: item.postalCode, addedAt: item.addedAt };
}

/** Shopping list kept in this browser; the list page refreshes its prices from the backend when opened */
@Injectable({ providedIn: 'root' })
export class Basket {
  readonly items = signal<BasketItem[]>((load<BasketItem[]>(KEY) ?? []).map(upgrade));
  readonly plans = computed(() => plans(this.items()));
  readonly stores = computed(() => [...new Set(this.items().flatMap((i) => i.offers.map((o) => o.store)))]);

  constructor() {
    effect(() => save(KEY, this.items()));
  }

  has(key: string): boolean {
    return this.items().some((i) => i.key === key);
  }

  /** A product type from the comparison, priced by unit */
  addType(comparison: Comparison, postalCode: string): void {
    this.put({ key: comparison.type, label: comparison.type, unit: comparison.unit, per: 'unit', offers: comparison.offers, postalCode });
  }

  /** A product from [store]'s list; other stores offer the cheapest of its type, when it has one */
  addProduct(product: SearchProduct, store: string, comparisons: Comparison[], postalCode: string): void {
    const equivalents = comparisons.find((c) => c.type === product.type)?.offers.filter((o) => o.store !== store) ?? [];
    const picked: Choice = { store, product_id: product.id, name: product.name, price: product.price, unit_price: product.unit_price };
    this.put({ key: product.id, label: product.name, unit: product.unit_price_unit, per: 'pack', offers: [picked, ...equivalents], postalCode });
  }

  setQuantity(key: string, quantity: number): void {
    if (!(quantity > 0)) return this.remove(key);
    this.items.update((items) => items.map((i) => (i.key === key ? { ...i, quantity } : i)));
  }

  /** Every product the list prices, so their current prices can be fetched */
  productIds(): string[] {
    return [...new Set(this.items().flatMap((i) => i.offers.map((o) => o.product_id)))];
  }

  /**
   * Replaces saved prices with current ones, dated by the oldest check among the item's products.
   * Items with a product missing from [prices] keep their prices and date.
   */
  updatePrices(prices: Map<string, { price: number; unit_price: number | null; checkedAt: string }>): void {
    this.items.update((items) =>
      items.map((item) => {
        if (!item.offers.every((o) => prices.has(o.product_id))) return item;
        const current = item.offers.map((o) => prices.get(o.product_id)!);
        const offers = item.offers.map((o, i) => ({ ...o, price: current[i].price, unit_price: current[i].unit_price }));
        return { ...item, offers, addedAt: current.map((c) => c.checkedAt).sort()[0] };
      }),
    );
  }

  clear(): void {
    this.items.set([]);
  }

  remove(key: string): void {
    this.items.update((items) => items.filter((i) => i.key !== key));
  }

  /** Adds one, or replaces an item already in the list keeping its quantity */
  private put(item: Omit<BasketItem, 'quantity' | 'addedAt'>): void {
    const quantity = this.items().find((i) => i.key === item.key)?.quantity ?? 1;
    const added = { ...item, quantity, addedAt: new Date().toISOString() };
    this.items.update((items) => [...items.filter((i) => i.key !== item.key), added]);
  }
}
