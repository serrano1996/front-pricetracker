import { historyStats, sentenceCase } from './history';

const point = (price: number, recorded_at: string) => ({ price, unit_price: price, recorded_at });

describe('historyStats', () => {
  it('summarises prices and counts days since the last change', () => {
    const now = Date.parse('2026-10-21T12:00:00Z');
    const stats = historyStats([point(1, '2026-10-01T00:00:00Z'), point(1.2, '2026-10-10T00:00:00Z'), point(0.8, '2026-10-18T06:00:00Z')], now);
    expect(stats).toMatchObject({ min: 0.8, max: 1.2, changes: 2, daysSinceChange: 3 });
    expect(stats.avg).toBeCloseTo(1);
  });

  it('has no last change while the price never changed', () => {
    expect(historyStats([point(1, '2026-10-01T00:00:00Z')], Date.now())).toMatchObject({ changes: 0, daysSinceChange: null });
  });
});

describe('sentenceCase', () => {
  it('keeps only the first letter in capitals', () => {
    expect(sentenceCase('Huevos, Leche Y Mantequilla')).toBe('Huevos, leche y mantequilla');
  });
});
