import { TestBed } from '@angular/core/testing';
import { Comparison, Offer, SearchProduct } from '../../../core/api/models';
import { Basket } from './basket.store';

const offer = (store: string, unit_price: number, price = unit_price, product_id = `${store}-p`): Offer =>
  ({ store, product_id, name: `${store} product`, unit_price, price });

describe('Basket', () => {
  beforeEach(() => localStorage.clear());

  const comparison = (unit_price: number): Comparison => ({ type: 'Leche entera', unit: 'L', offers: [offer('dia', unit_price)] });
  const product = (id: string, type: string | null): SearchProduct => ({
    id, external_id: id, name: `Leche ${id}`, price: 5.4, price_format: null, unit_price: 0.9, unit_price_unit: 'L',
    image_url: null, category: null, type, previous_price: null, price_changed_at: null,
  });

  it('adds a type, refreshes prices keeping the quantity, and removes at quantity 0', () => {
    const basket = TestBed.inject(Basket);
    basket.addType(comparison(0.8), '50500');
    basket.setQuantity('Leche entera', 3);
    basket.addType(comparison(0.7), '50500');

    expect(basket.items().length).toBe(1);
    expect(basket.items()[0].quantity).toBe(3);
    expect(basket.plans()[0].total).toBeCloseTo(2.1);

    basket.setQuantity('Leche entera', 0);
    expect(basket.items()).toEqual([]);
  });

  it('adds a store product with its type equivalents from other stores', () => {
    const basket = TestBed.inject(Basket);
    const comparisons: Comparison[] = [
      { type: 'Leche entera', unit: 'L', offers: [offer('mercadona', 0.85, 5.1, 'cheaper'), offer('dia', 0.8)] },
    ];

    basket.addProduct(product('m1', 'Leche entera'), 'mercadona', comparisons, '50500');
    basket.addProduct(product('m2', null), 'mercadona', comparisons, '50500');

    const [typed, untyped] = basket.items();
    expect(typed.per).toBe('pack');
    expect(typed.offers.map((o) => `${o.store}:${o.product_id}`)).toEqual(['mercadona:m1', 'dia:dia-p']);
    expect(untyped.offers.map((o) => o.store)).toEqual(['mercadona']);
  });

  it('is kept in this browser, and reads lists saved before products could be added', () => {
    localStorage.setItem('pt.basket', JSON.stringify([
      { type: 'Leche entera', unit: 'L', quantity: 2, offers: [offer('dia', 0.8)], postalCode: '50500', addedAt: '2026-10-20T10:00:00Z' },
    ]));
    const basket = TestBed.inject(Basket);
    expect(basket.items()[0]).toMatchObject({ key: 'Leche entera', label: 'Leche entera', per: 'unit', quantity: 2 });

    basket.setQuantity('Leche entera', 3);
    TestBed.tick();
    expect(JSON.parse(localStorage.getItem('pt.basket')!)[0].quantity).toBe(3);
  });
});

describe('Basket.updatePrices', () => {
  beforeEach(() => localStorage.clear());

  it('replaces prices keeping quantities, dated by the oldest check; items with an unknown product stay as they were', () => {
    const basket = TestBed.inject(Basket);
    basket.addType({ type: 'Leche', unit: 'L', offers: [offer('dia', 0.8), offer('mercadona', 0.9)] }, '50500');
    basket.addType({ type: 'Aceite', unit: 'L', offers: [{ ...offer('dia', 4), product_id: 'gone' }] }, '50500');
    basket.setQuantity('Leche', 2);
    const aceiteBefore = basket.items()[1];

    expect(basket.productIds()).toEqual(['dia-p', 'mercadona-p', 'gone']);
    basket.updatePrices(new Map([
      ['dia-p', { price: 0.7, unit_price: 0.7, checkedAt: '2026-10-21T08:00:00Z' }],
      ['mercadona-p', { price: 0.95, unit_price: 0.95, checkedAt: '2026-10-20T08:00:00Z' }],
    ]));

    const [leche, aceite] = basket.items();
    expect(leche.offers.map((o) => o.unit_price)).toEqual([0.7, 0.95]);
    expect(leche.quantity).toBe(2);
    expect(leche.addedAt).toBe('2026-10-20T08:00:00Z');
    expect(aceite).toEqual(aceiteBefore);
  });
});
