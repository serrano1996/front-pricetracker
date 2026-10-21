import { cheapestStores, distinctPlans } from './basket';

describe('list helpers', () => {
  const offer = (store: string, unit_price: number) => ({ store, product_id: `${store}-p`, name: store, unit_price, price: unit_price });
  const item = (offers: ReturnType<typeof offer>[]) =>
    ({ key: 'k', label: 'k', unit: 'L', per: 'unit' as const, quantity: 1, offers, postalCode: '50500', addedAt: '2026-10-21T08:00:00Z' });

  it('cheapestStores keeps every store on a tie', () => {
    expect(cheapestStores(item([offer('dia', 0.81), offer('mercadona', 0.81), offer('alcampo', 1)]))).toEqual(new Set(['dia', 'mercadona']));
  });

  it('distinctPlans drops plans that cost the same as a better one', () => {
    const plan = (stores: string[], total: number, missing = 0) => ({ stores, total, missing, picks: [] });
    const plans = [plan(['dia'], 6.48), plan(['mercadona'], 6.48), plan(['dia', 'mercadona'], 6.48), plan(['alcampo'], 7), plan(['x'], 5, 1)];
    expect(distinctPlans(plans).map((p) => p.stores.join())).toEqual(['dia', 'alcampo', 'x']);
  });
});
