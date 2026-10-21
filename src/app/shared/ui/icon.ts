import { Component, computed, input } from '@angular/core';

// Shapes from Lucide (https://lucide.dev, ISC license), all drawn as paths on a 24×24 grid
const circle = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
const line = (points: string) => {
  const n = points.trim().split(/\s+/);
  return n.reduce((d, v, i) => d + (i % 2 ? `${v}` : `${i ? 'L' : 'M'}${v} `), '');
};

const ICONS = {
  search: [circle(11, 11, 8), 'm21 21-4.3-4.3'],
  'map-pin': ['M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z', circle(12, 10, 3)],
  cart: [circle(8, 21, 1), circle(19, 21, 1), 'M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12'],
  plus: ['M5 12h14', 'M12 5v14'],
  x: ['M18 6 6 18', 'm6 6 12 12'],
  check: ['M20 6 9 17l-5-5'],
  'arrow-left': ['m12 19-7-7 7-7', 'M19 12H5'],
  'trending-down': [line('22 17 13.5 8.5 8.5 13.5 2 7'), line('16 17 22 17 22 11')],
  'trending-up': [line('22 7 13.5 15.5 8.5 10.5 2 17'), line('16 7 22 7 22 13')],
  alert: ['m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3', 'M12 9v4', 'M12 17h.01'],
  info: [circle(12, 12, 10), 'M12 16v-4', 'M12 8h.01'],
  ban: [circle(12, 12, 10), 'm4.9 4.9 14.2 14.2'],
  clock: [circle(12, 12, 10), line('12 6 12 12 16 14')],
  store: ['M3 9 4.5 4h15L21 9', 'M4 9v11h16V9', 'M3 9h18', 'M9 20v-6h6v6'],
  tag: [
    'M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z',
    circle(7.5, 7.5, 0.5),
  ],
  scale: [
    'm16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z',
    'm2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z',
    'M7 21h10',
    'M12 3v18',
    'M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2',
  ],
  refresh: [
    'M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8',
    'M21 3v5h-5',
    'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16',
    'M8 16H3v5',
  ],
  sort: ['m21 16-4 4-4-4', 'M17 20V4', 'm3 8 4-4 4 4', 'M7 4v16'],
  history: ['M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8', 'M3 3v5h5', 'M12 7v5l4 2'],
  trash: ['M3 6h18', 'M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6', 'M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2'],
  globe: [circle(12, 12, 10), 'M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20', 'M2 12h20'],
  sun: [circle(12, 12, 4), 'M12 2v2', 'M12 20v2', 'm4.93 4.93 1.41 1.41', 'm17.66 17.66 1.41 1.41', 'M2 12h2', 'M20 12h2', 'm6.34 17.66-1.41 1.41', 'm19.07 4.93-1.41 1.41'],
  moon: ['M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z'],
  flame: [
    'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z',
  ],
} satisfies Record<string, string[]>;

export type IconName = keyof typeof ICONS;

/** Decorative icon: size it with classes (default 1rem), it is hidden from screen readers so text must carry the meaning */
@Component({
  selector: 'app-icon',
  host: { 'aria-hidden': 'true', class: 'inline-block shrink-0 align-[-0.125em]' },
  template: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
         stroke-linejoin="round" class="block h-full w-full">
      @for (d of paths(); track $index) { <path [attr.d]="d" /> }
    </svg>
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly paths = computed(() => ICONS[this.name()]);
}
