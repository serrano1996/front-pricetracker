import { Offer } from '../../../core/api/models';
import { BasketItem, Choice, cost, plans } from './basket';

const offer = (store: string, unit_price: number, price = unit_price, product_id = `${store}-p`): Offer =>
  ({ store, product_id, name: `${store} product`, unit_price, price });
const typeItem = (key: string, quantity: number, offers: Choice[]): BasketItem =>
  ({ key, label: key, unit: 'L', per: 'unit', quantity, offers, postalCode: '50500', addedAt: '2026-10-20T10:00:00Z' });

describe('cost', () => {
  it('prices a product type by unit', () => {
    expect(cost(typeItem('Leche', 2, []), offer('dia', 0.8))).toBeCloseTo(1.6);
  });

  it('prices a picked product by pack, and its equivalents by the same amount in units', () => {
    // 2 packs of a 6 L pack at 5.40 € (0.90 €/L) = 12 L; the equivalent at 0.80 €/L costs 9.60 €
    const picked = offer('mercadona', 0.9, 5.4, 'm1');
    const item: BasketItem = { ...typeItem('m1', 2, [picked, offer('dia', 0.8)]), per: 'pack' };
    expect(cost(item, picked)).toBeCloseTo(10.8);
    expect(cost(item, item.offers[1])).toBeCloseTo(9.6);
  });

  it('cannot price an equivalent when the picked product has no unit price', () => {
    const picked: Choice = { ...offer('mercadona', 0, 2, 'm1'), unit_price: null };
    const item: BasketItem = { ...typeItem('m1', 1, [picked, offer('dia', 0.8)]), per: 'pack' };
    expect(cost(item, picked)).toBe(2);
    expect(cost(item, item.offers[1])).toBeNull();
  });
});

describe('plans', () => {
  const items = [
    typeItem('Leche', 1, [offer('dia', 0.8), offer('mercadona', 0.9), offer('alcampo', 1)]),
    typeItem('Aceite', 1, [offer('dia', 6), offer('mercadona', 4), offer('alcampo', 5)]),
    typeItem('Pan', 1, [offer('mercadona', 2), offer('alcampo', 1.5)]),
  ];

  it('tries every combination of stores, buying each item where it is cheapest among them', () => {
    const all = plans(items);
    expect(all.length).toBe(7);
    // All three: leche is cheapest at dia, aceite at mercadona, pan at alcampo
    expect(all[0].stores).toEqual(['dia', 'mercadona', 'alcampo']);
    expect(all[0].total).toBeCloseTo(0.8 + 4 + 1.5);
    expect(all[0].picks.map((p) => p.store)).toEqual(['dia', 'mercadona', 'alcampo']);
    const onlyMercadona = all.find((p) => p.stores.join() === 'mercadona')!;
    expect(onlyMercadona.total).toBeCloseTo(6.9);
    expect(onlyMercadona.missing).toBe(0);
  });

  it('puts plans missing items last, even if cheaper', () => {
    const onlyDia = plans(items).find((p) => p.stores.join() === 'dia')!;
    expect(onlyDia.missing).toBe(1);
    expect(plans(items).at(-1)!.missing).toBeGreaterThan(0);
  });

  it('prefers fewer stores when the total is the same', () => {
    const same = [typeItem('Leche', 1, [offer('dia', 1), offer('mercadona', 1)])];
    expect(plans(same)[0].stores).toEqual(['dia']);
  });
});
