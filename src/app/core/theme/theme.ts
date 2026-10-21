import { effect, Injectable, signal } from '@angular/core';
import { load, save } from '../storage/storage';

export type ThemeName = 'light' | 'dark';

const KEY = 'pt.theme';

/** The saved theme, else the system's; index.html applies the same rule before Angular boots */
function initialTheme(): ThemeName {
  const saved = load<ThemeName>(KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Light or dark theme: toggles the `dark` class on <html>, which remaps the colors in styles.css */
@Injectable({ providedIn: 'root' })
export class Theme {
  readonly current = signal<ThemeName>(initialTheme());

  constructor() {
    effect(() => {
      save(KEY, this.current());
      document.documentElement.classList.toggle('dark', this.current() === 'dark');
    });
  }

  toggle(): void {
    this.current.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }
}
