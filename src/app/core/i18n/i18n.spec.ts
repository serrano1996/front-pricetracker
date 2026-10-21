import { TestBed } from '@angular/core/testing';
import { I18n } from './i18n';

describe('I18n', () => {
  beforeEach(() => localStorage.clear());

  it('translates with placeholders and formats money and dates per language', () => {
    const i18n = TestBed.inject(I18n);
    i18n.lang.set('en');
    expect(i18n.t('search.reference', { place: 'Tarazona (50500)', reference: 'Soria (42001)', km: 64 }))
      .toBe('Does not deliver to Tarazona (50500). Reference prices from Soria (42001), ≈ 64 km away.');
    expect(i18n.money(4.86)).toBe('€4.86');
    expect(i18n.date('2026-10-03T08:00:00Z', 'd MMM')).toBe('3 Oct');

    i18n.lang.set('es');
    expect(i18n.t('search.reference', { place: 'Tarazona (50500)', reference: 'Soria (42001)', km: 64 }))
      .toBe('No reparte en Tarazona (50500). Precios de referencia de Soria (42001), a ≈ 64 km.');
    expect(i18n.money(4.86).replace(/\s/g, ' ')).toBe('4,86 €');
    expect(i18n.date('2026-10-03T08:00:00Z', 'd MMM')).toBe('3 oct');
  });

  it('remembers the chosen language and sets it on the page', () => {
    TestBed.inject(I18n).lang.set('es');
    TestBed.tick();
    expect(JSON.parse(localStorage.getItem('pt.lang')!)).toBe('es');
    expect(document.documentElement.lang).toBe('es');
  });

  it('starts in the saved language', () => {
    localStorage.setItem('pt.lang', JSON.stringify('es'));
    expect(TestBed.inject(I18n).lang()).toBe('es');
  });
});
