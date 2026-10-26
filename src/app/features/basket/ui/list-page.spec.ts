import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Basket } from '../application/basket.store';
import { ListPage } from './list-page';

describe('ListPage', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
  });

  it('refreshes saved prices when opened and says which could not be updated', async () => {
    const offer = (store: string, product_id: string, unit_price: number) => ({ store, product_id, name: product_id, unit_price, price: unit_price });
    TestBed.inject(Basket).addType({ type: 'Leche', unit: 'L', offers: [offer('dia', 'd1', 0.8), offer('mercadona', 'm1', 0.9)] }, '50500');

    const fixture = TestBed.createComponent(ListPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Updating prices...');

    // One request for every product; the backend leaves out the ones it no longer knows (m1)
    TestBed.inject(HttpTestingController).expectOne((r) => r.url.endsWith('/products') && r.params.get('ids') === 'd1,m1').flush({
      products: [{ id: 'd1', store: 'dia', external_id: 'd1', name: 'd1', current_price: 0.7, price_format: null, unit_price: 0.7,
        unit_price_unit: 'L', image_url: null, category: null, last_checked_at: '2026-10-21T08:00:00Z' }],
    });
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent!;
    expect(text).toContain('1 prices could not be updated');
    expect(text).not.toContain('Updating prices...');
    // One product missing: the item keeps all its saved prices rather than mixing old and new
    expect(TestBed.inject(Basket).items()[0].offers[0].unit_price).toBe(0.8);
  });
});

describe('ListPage controls', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
  });

  it('steps quantities, says when every store costs the same, and clears the list after confirming', async () => {
    const offer = (store: string) => ({ store, product_id: store, name: store, unit_price: 1, price: 1 });
    const basket = TestBed.inject(Basket);
    basket.addType({ type: 'Leche', unit: 'L', offers: [offer('dia'), offer('mercadona')] }, '50500');
    const fixture = TestBed.createComponent(ListPage);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne((r) => r.url.endsWith('/products')).flush({ products: [] });
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('It costs the same in any store: €1.00');
    expect(el.textContent).toContain("Indicative prices from each supermarket's website");
    (el.querySelector('button[aria-label="More Leche"]') as HTMLButtonElement).click();
    expect(basket.items()[0].quantity).toBe(1.5);

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    [...el.querySelectorAll('button')].find((b) => b.textContent?.includes('Clear list'))!.click();
    expect(basket.items()).toEqual([]);
  });
});
