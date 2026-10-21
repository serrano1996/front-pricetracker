import { Component, input } from '@angular/core';

/**
 * PriceTracker logo: two tilted price tags with a rising arrow, and the wordmark as live text so it stays sharp,
 * readable by screen readers and theme-aware (slate-900 flips in dark mode). Size it with a text size class.
 */
@Component({
  selector: 'app-logo',
  host: { class: 'inline-flex items-center gap-2 font-extrabold tracking-tight' },
  template: `
    <svg viewBox="0 0 64 64" class="h-[1.6em] w-[1.6em] shrink-0" aria-hidden="true">
      <g transform="translate(32 34) rotate(40) scale(.78) translate(-32 -33)">
        <!-- Back tag, peeking out below and to the left -->
        <path class="fill-slate-900" transform="translate(-6 7)" d="M32 4 49 21v32a5 5 0 0 1-5 5H20a5 5 0 0 1-5-5V21Z" />
        <!-- Front tag with its hole -->
        <path class="fill-emerald-600" fill-rule="evenodd"
              d="M32 4 49 21v32a5 5 0 0 1-5 5H20a5 5 0 0 1-5-5V21Zm0 10a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
      </g>
      <!-- String through the hole -->
      <path class="stroke-emerald-600" d="M40 24.5c-1-9 6-16 12-14s1 9-5 10" fill="none" stroke-width="2.5" stroke-linecap="round" />
      <!-- Rising arrow, pointing at the hole -->
      <path d="M7 52 19 41l7 6 10-12" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M41 30 39.6 38.5 32.5 31.4Z" fill="#fff" stroke="#fff" stroke-width="1.5" stroke-linejoin="round" />
    </svg>
    @if (wordmark()) {
      <span><span class="text-slate-900">Price</span><span class="text-emerald-600">Tracker</span></span>
    }
  `,
})
export class Logo {
  /** false: icon only, e.g. next to another heading */
  readonly wordmark = input(true);
}
