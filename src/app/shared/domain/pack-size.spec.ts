import { packSize } from './pack-size';

describe('packSize', () => {
  const product = (price: number, unit_price: number | null, unit: string | null) =>
    ({ id: 'p', external_id: 'p', name: 'p', price, price_format: null, unit_price, unit_price_unit: unit, image_url: null,
      category: null, type: null, previous_price: null, price_changed_at: null });

  it('works out the pack from price and unit price, rounded to real pack sizes', () => {
    expect(packSize(product(4.86, 0.81, 'L'))).toEqual({ amount: 6, unit: 'L' });
    // 1.42 / 0.95 = 1.49…: cents rounding, really a 1.5 L bottle
    expect(packSize(product(1.42, 0.95, 'L'))).toEqual({ amount: 1.5, unit: 'L' });
    // 8.52 / 0.95 = 8.97: a 6 × 1.5 L pack
    expect(packSize(product(8.52, 0.95, 'L'))).toEqual({ amount: 9, unit: 'L' });
    expect(packSize(product(1.2, 4, 'kg'))).toEqual({ amount: 300, unit: 'g' });
    expect(packSize(product(4.56, 0.38, 'ud'))).toEqual({ amount: 12, unit: 'ud' });
  });

  it('gives nothing without a unit price or for other units', () => {
    expect(packSize(product(1, null, null))).toBeNull();
    expect(packSize(product(5, 0.1, 'lavado'))).toBeNull();
  });
});
