import { cheapestPerUnit, compareOffers, sortProducts } from './offers';

describe('sorting products', () => {
  const product = (id: string, price: number, unit_price: number | null, unit: string | null) =>
    ({ id, external_id: id, name: id, price, price_format: null, unit_price, unit_price_unit: unit, image_url: null, category: null, type: null, previous_price: null, price_changed_at: null });
  const products = [product('a', 3, 1.5, 'L'), product('b', 1, null, null), product('c', 2, 0.5, 'kg'), product('d', 5, 1.0, 'L')];

  it('orders by unit price with unknown ones last, by price, or keeps the store order', () => {
    expect(sortProducts(products, 'unit_price').map((p) => p.id)).toEqual(['c', 'd', 'a', 'b']);
    expect(sortProducts(products, 'price').map((p) => p.id)).toEqual(['b', 'c', 'a', 'd']);
    expect(sortProducts(products, 'relevance').map((p) => p.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('marks the cheapest of each unit', () => {
    expect(cheapestPerUnit(products)).toEqual(new Set(['c', 'd']));
  });
});

describe('compareOffers', () => {
  const offer = (store: string, unit_price: number) => ({ store, product_id: store, name: store, unit_price, price: unit_price });

  it('measures each offer against the cheapest and scales bars to the dearest', () => {
    const { rows, tie } = compareOffers([offer('dia', 0.8), offer('mercadona', 1)]);
    expect(tie).toBe(false);
    expect(rows.map((r) => r.best)).toEqual([true, false]);
    expect(rows[1].diff).toBeCloseTo(0.2);
    expect(rows[1].pct).toBeCloseTo(0.25);
    expect(rows.map((r) => r.bar)).toEqual([80, 100]);
  });

  it('counts offers within half a cent of the cheapest as a tie', () => {
    const { rows, tie } = compareOffers([offer('dia', 0.81), offer('mercadona', 0.814), offer('alcampo', 0.9)]);
    expect(tie).toBe(true);
    expect(rows.map((r) => r.best)).toEqual([true, true, false]);
  });
});
