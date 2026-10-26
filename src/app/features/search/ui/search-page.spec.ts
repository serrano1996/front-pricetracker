import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SearchResponse } from '../../../core/api/models';
import { I18n } from '../../../core/i18n/i18n';
import { SearchPage } from './search-page';

const PLACES = ['Zaragoza\t50001\tZaragoza', 'Tarazona\t50500\tZaragoza', 'Torrellas\t50512\tZaragoza', 'Soria\t42001\tSoria'].join('\n');
const flushPlaces = () => TestBed.inject(HttpTestingController).expectOne('places.tsv').flush(PLACES);

describe('SearchPage', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  it('searches with the bound params and renders comparison and store states', async () => {
    const fixture = TestBed.createComponent(SearchPage);
    fixture.componentRef.setInput('term', 'leche');
    fixture.componentRef.setInput('postal_code', '28001');
    fixture.detectChanges();
    flushPlaces();

    const req = TestBed.inject(HttpTestingController).expectOne(
      (r) => r.url.endsWith('/search') && r.params.get('term') === 'leche' && r.params.get('postal_code') === '28001',
    );
    req.flush({
      term: 'leche',
      postal_code: '28001',
      comparison: [
        { type: 'Leche entera', unit: 'L', offers: [{ store: 'dia', product_id: 'p1', name: 'Leche Dia', unit_price: 0.89, price: 0.89 }] },
      ],
      stores: [
        { store: 'dia', status: 'ok', stale: false, fetched_at: null, reference_postal_code: '50001', reference_distance_km: 76, products: [
          { id: 'p1', external_id: 'e1', name: 'Leche Dia', price: 0.89, price_format: null, unit_price: 0.89, unit_price_unit: 'L', image_url: null, category: null, type: 'Leche entera', previous_price: 0.99, price_changed_at: '2026-10-03T08:00:00Z' },
        ] },
        { store: 'alcampo', status: 'not_served', stale: false, fetched_at: null, reference_postal_code: null, reference_distance_km: null, products: [] },
      ],
    } satisfies SearchResponse);
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent!;
    expect(text).toContain('Leche entera');
    expect(text).toContain('Leche Dia');
    expect(text).toContain('Does not deliver to this postal code.');
    expect(text).toContain("Indicative prices from each supermarket's website");
    expect(text).toContain('Reference prices from Zaragoza (50001), ≈ 76 km away.');
    expect(text).toContain('ref. Zaragoza (50001)');
    // 0.99 → 0.89: a 0.10 € drop since 3 Oct
    expect(text).toContain('Price down');
    expect(text).toContain('€0.10 since 3 Oct');
  });

  it('shows the backend error detail', async () => {
    const fixture = TestBed.createComponent(SearchPage);
    fixture.componentRef.setInput('term', 'x');
    fixture.componentRef.setInput('postal_code', '28001');
    fixture.detectChanges();
    flushPlaces();

    TestBed.inject(HttpTestingController)
      .expectOne((r) => r.url.endsWith('/search'))
      .flush({ detail: 'term too short' }, { status: 400, statusText: 'Bad Request' });
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('term too short');
  });

  it('suggests towns ignoring accents and case, and searches the picked one', async () => {
    const fixture = TestBed.createComponent(SearchPage);
    fixture.detectChanges();
    flushPlaces();
    const el = fixture.nativeElement as HTMLElement;
    const place = el.querySelector<HTMLInputElement>('input[name=place]')!;

    place.value = 'TÁRAZ';
    place.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(el.querySelector('[role=listbox]')?.textContent).toContain('Tarazona (50500) · Zaragoza');

    place.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await fixture.whenStable();
    expect(place.value).toBe('Tarazona (50500)');
    expect(fixture.componentInstance.postal()).toBe('50500');
    expect(el.querySelector('[role=listbox]')).toBeNull();
  });

  it('accepts a typed postal code and rejects free text that is not a town', async () => {
    const fixture = TestBed.createComponent(SearchPage);
    fixture.detectChanges();
    flushPlaces();
    const page = fixture.componentInstance;

    page.type('42001');
    expect(page.postal()).toBe('42001');

    page.type('nowhere');
    page.submit('leche', page.postal());
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Pick a town from the list or type a 5-digit postal code.');
  });

  it('asks the backend only for the selected stores, and toggling updates the URL', async () => {
    const fixture = TestBed.createComponent(SearchPage);
    fixture.componentRef.setInput('term', 'leche');
    fixture.componentRef.setInput('postal_code', '28001');
    fixture.componentRef.setInput('stores', 'mercadona,alcampo');
    fixture.detectChanges();
    flushPlaces();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne((r) => r.url.endsWith('/search') && r.params.get('stores') === 'mercadona,alcampo')
      .flush({ term: 'leche', postal_code: '28001', stores: [], comparison: [] } satisfies SearchResponse);
    await fixture.whenStable();

    // Every store selected is the backend default: no stores param at all
    fixture.componentRef.setInput('stores', undefined);
    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith('/search') && !r.params.has('stores'));

    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.componentInstance.toggle('dia');
    expect(navigate).toHaveBeenLastCalledWith([], { queryParams: { stores: 'mercadona,alcampo' }, queryParamsHandling: 'merge' });

    fixture.componentRef.setInput('stores', 'mercadona,alcampo');
    fixture.componentInstance.toggle('dia');
    expect(navigate).toHaveBeenLastCalledWith([], { queryParams: { stores: null }, queryParamsHandling: 'merge' });
  });

  it('comes back to the last postal code and stores when landing without a query', () => {
    localStorage.setItem('pt.postal_code', JSON.stringify('50500'));
    localStorage.setItem('pt.stores', JSON.stringify('dia'));
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    TestBed.createComponent(SearchPage);

    expect(navigate).toHaveBeenCalledWith([], { queryParams: { postal_code: '50500', stores: 'dia' }, replaceUrl: true });
  });

  it('searching again for the same thing asks the backend again, so a store that failed gets retried', async () => {
    const fixture = TestBed.createComponent(SearchPage);
    fixture.componentRef.setInput('term', 'leche');
    fixture.componentRef.setInput('postal_code', '28001');
    fixture.detectChanges();
    flushPlaces();
    const http = TestBed.inject(HttpTestingController);
    const unavailable = { store: 'dia', status: 'unavailable' as const, stale: false, fetched_at: null,
      reference_postal_code: null, reference_distance_km: null, products: [] };
    http.expectOne((r) => r.url.endsWith('/search')).flush({ term: 'leche', postal_code: '28001', comparison: [], stores: [unavailable] } satisfies SearchResponse);
    await fixture.whenStable();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture.componentInstance.submit('leche', '28001');
    fixture.detectChanges();

    http.expectOne((r) => r.url.endsWith('/search') && r.params.get('term') === 'leche');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('the unavailable store offers to retry the search', async () => {
    const fixture = TestBed.createComponent(SearchPage);
    fixture.componentRef.setInput('term', 'leche');
    fixture.componentRef.setInput('postal_code', '28001');
    fixture.detectChanges();
    flushPlaces();
    const http = TestBed.inject(HttpTestingController);
    const unavailable = { store: 'dia', status: 'unavailable' as const, stale: false, fetched_at: null,
      reference_postal_code: null, reference_distance_km: null, products: [] };
    http.expectOne((r) => r.url.endsWith('/search')).flush({ term: 'leche', postal_code: '28001', comparison: [], stores: [unavailable] } satisfies SearchResponse);
    await fixture.whenStable();

    [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find((b) => b.textContent?.includes('Retry'))!.click();
    fixture.detectChanges();

    http.expectOne((r) => r.url.endsWith('/search'));
  });

  it('entertains a slow search with geeky lines that change every few seconds, and drops them once loaded', async () => {
    vi.useFakeTimers();
    try {
      const fixture = TestBed.createComponent(SearchPage);
      fixture.componentRef.setInput('term', 'leche');
      fixture.componentRef.setInput('postal_code', '28001');
      fixture.detectChanges();
      flushPlaces();
      const lines = TestBed.inject(I18n).loadingLines();
      const shown = () => lines.find((l) => (fixture.nativeElement as HTMLElement).textContent!.includes(l));

      const first = shown();
      expect(first).toBeDefined();
      vi.advanceTimersByTime(3000);
      fixture.detectChanges();
      expect(shown()).not.toBe(first);

      TestBed.inject(HttpTestingController).expectOne((r) => r.url.endsWith('/search'))
        .flush({ term: 'leche', postal_code: '28001', comparison: [], stores: [] } satisfies SearchResponse);
      await vi.advanceTimersByTimeAsync(0);
      fixture.detectChanges();
      expect(shown()).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it('remembers the postal code of a search', () => {
    const fixture = TestBed.createComponent(SearchPage);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture.componentInstance.submit('leche', '50500');

    expect(JSON.parse(localStorage.getItem('pt.postal_code')!)).toBe('50500');
  });

  it('suggests popular terms while typing and as one-click searches', async () => {
    const fixture = TestBed.createComponent(SearchPage);
    fixture.detectChanges();
    flushPlaces();
    TestBed.inject(HttpTestingController).expectOne((r) => r.url.endsWith('/searches/popular')).flush({ terms: ['leche', 'aceite'] });
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect([...el.querySelectorAll('#popular-terms option')].map((o) => o.getAttribute('value'))).toEqual(['leche', 'aceite']);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.componentInstance.type('50500');
    [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'aceite')!.click();
    expect(navigate).toHaveBeenCalledWith([], { queryParams: { term: 'aceite', postal_code: '50500' }, queryParamsHandling: 'merge' });
  });

  it('shows no price change when the backend sends none, as older backends do', async () => {
    const fixture = TestBed.createComponent(SearchPage);
    fixture.componentRef.setInput('term', 'leche');
    fixture.componentRef.setInput('postal_code', '28001');
    fixture.detectChanges();
    flushPlaces();
    const product = { id: 'p1', external_id: 'e1', name: 'Leche', price: 4.86, price_format: null, unit_price: 0.81, unit_price_unit: 'L', image_url: null, category: null, type: null };
    TestBed.inject(HttpTestingController).expectOne((r) => r.url.endsWith('/search')).flush({
      term: 'leche', postal_code: '28001', comparison: [],
      stores: [{ store: 'mercadona', status: 'ok', stale: false, fetched_at: null, reference_postal_code: null, reference_distance_km: null, products: [product] }],
    });
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('since');
  });

  it('switches the whole page to Spanish', async () => {
    TestBed.inject(I18n).lang.set('es');
    const fixture = TestBed.createComponent(SearchPage);
    fixture.componentRef.setInput('term', 'leche');
    fixture.componentRef.setInput('postal_code', '28001');
    fixture.detectChanges();
    flushPlaces();
    TestBed.inject(HttpTestingController).expectOne((r) => r.url.endsWith('/search')).flush({
      term: 'leche', postal_code: '28001', comparison: [],
      stores: [{ store: 'alcampo', status: 'not_served', stale: false, fetched_at: null, reference_postal_code: null, reference_distance_km: null, products: [] }],
    } satisfies SearchResponse);
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent!;
    expect(text).toContain('Compara precios de supermercados');
    expect(text).toContain('No reparte en este código postal.');
    expect(text).not.toContain('Does not deliver');
  });

  it('shows no error when landing without a search', async () => {
    const fixture = TestBed.createComponent(SearchPage);
    fixture.detectChanges();
    flushPlaces();
    await fixture.whenStable();

    expect(fixture.componentInstance.results.error()).toBeUndefined();
    expect((fixture.nativeElement as HTMLElement).querySelector('[role=alert]')).toBeNull();
  });

  it('shows how much dearer each offer is, ties, and selected stores without an offer', async () => {
    const fixture = TestBed.createComponent(SearchPage);
    fixture.componentRef.setInput('term', 'leche');
    fixture.componentRef.setInput('postal_code', '28001');
    fixture.detectChanges();
    flushPlaces();
    const offer = (store: string, unit_price: number) => ({ store, product_id: store, name: `Leche ${store}`, unit_price, price: unit_price });
    TestBed.inject(HttpTestingController).expectOne((r) => r.url.endsWith('/search')).flush({
      term: 'leche', postal_code: '28001', stores: [],
      comparison: [{ type: 'Leche entera', unit: 'L', offers: [offer('dia', 0.81), offer('mercadona', 0.81), offer('alcampo', 1.05)] },
        { type: 'Aceite', unit: 'L', offers: [offer('mercadona', 4)] }],
    } satisfies SearchResponse);
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent!;
    expect(text).toContain('Tied cheapest');
    expect(text).toContain('+€0.24/L (+30%)');
    expect(text).toContain('Not available');
  });

  it('previews the first products of each store and shows them all on demand', async () => {
    const fixture = TestBed.createComponent(SearchPage);
    fixture.componentRef.setInput('term', 'leche');
    fixture.componentRef.setInput('postal_code', '28001');
    fixture.detectChanges();
    flushPlaces();
    const products = Array.from({ length: 8 }, (_, i) => ({
      id: `p${i}`, external_id: `p${i}`, name: `Leche ${i}`, price: 1 + i, price_format: null, unit_price: 1 + i, unit_price_unit: 'L',
      image_url: null, category: null, type: null, previous_price: null, price_changed_at: null,
    }));
    TestBed.inject(HttpTestingController).expectOne((r) => r.url.endsWith('/search')).flush({
      term: 'leche', postal_code: '28001', comparison: [],
      stores: [{ store: 'dia', status: 'ok', stale: false, fetched_at: null, reference_postal_code: null, reference_distance_km: null, products }],
    } satisfies SearchResponse);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const names = () => [...el.querySelectorAll('a[title^="Leche "]')].map((a) => a.textContent!.trim());

    expect(names()).toEqual(['Leche 0', 'Leche 1', 'Leche 2', 'Leche 3', 'Leche 4', 'Leche 5']);
    [...el.querySelectorAll('button')].find((b) => b.textContent?.includes('Show all (8)'))!.click();
    await fixture.whenStable();
    expect(names().length).toBe(8);
    expect(el.textContent).toContain('Show less');
  });
});
