import { TestBed } from '@angular/core/testing';
import { Theme } from './theme';

describe('Theme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('toggles the dark class on the page and remembers the choice', () => {
    const theme = TestBed.inject(Theme);
    theme.current.set('light');
    theme.toggle();
    TestBed.tick();

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(JSON.parse(localStorage.getItem('pt.theme')!)).toBe('dark');

    theme.toggle();
    TestBed.tick();
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('starts with the saved theme', () => {
    localStorage.setItem('pt.theme', JSON.stringify('dark'));
    expect(TestBed.inject(Theme).current()).toBe('dark');
  });
});
