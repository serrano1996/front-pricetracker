import { TestBed } from '@angular/core/testing';
import { PriceChart, stepPath } from './price-chart';

const point = (price: number, recorded_at: string) => ({ price, unit_price: price, recorded_at });

describe('stepPath', () => {
  const day = 86_400_000;
  const start = Date.parse('2026-10-01T00:00:00Z');

  it('holds each price until the next one and the last until now', () => {
    const points = [
      { price: 1, unit_price: null, recorded_at: '2026-10-01T00:00:00Z' },
      { price: 2, unit_price: null, recorded_at: '2026-10-03T00:00:00Z' },
    ];
    // 4 days wide: the change lands at x = 50; cheapest at the bottom (y = 100), dearest at the top (y = 0)
    expect(stepPath(points, start + 4 * day, 100, 100)).toBe('M0,100 H50 V0 H100');
  });

  it('draws a single price as a flat line in the middle', () => {
    expect(stepPath([{ price: 1, unit_price: null, recorded_at: '2026-10-01T00:00:00Z' }], start + day, 100, 100)).toBe('M0,50 H100');
  });

  it('draws nothing without points', () => {
    expect(stepPath([], start, 100, 100)).toBe('');
  });
});

describe('PriceChart', () => {
  it('replaces the chart by a sentence when the price never changed, and draws a dot per change otherwise', async () => {
    const fixture = TestBed.createComponent(PriceChart);
    fixture.componentRef.setInput('points', [point(4.86, '2026-10-20T08:00:00Z')]);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Stable price since 20 Oct 2026.');
    expect(el.querySelector('svg')).toBeNull();

    fixture.componentRef.setInput('points', [point(4.86, '2026-10-01T08:00:00Z'), point(4.5, '2026-10-10T08:00:00Z')]);
    await fixture.whenStable();
    const dots = el.querySelectorAll('button[aria-label]');
    expect([...dots].map((d) => d.getAttribute('aria-label'))).toEqual(['1 Oct 2026: €4.86', '10 Oct 2026: €4.50']);
  });
});
