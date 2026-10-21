import { Component, computed, inject, input, signal } from '@angular/core';
import { PricePoint } from '../../../core/api/models';
import { I18n } from '../../../core/i18n/i18n';

const WIDTH = 300;
const HEIGHT = 100;

/** Where each point sits on a width × height chart: time from the first point to [now], price between min and max */
function project(points: PricePoint[], now: number, width: number, height: number) {
  const times = points.map((p) => Date.parse(p.recorded_at));
  const prices = points.map((p) => p.price);
  const span = Math.max(now - times[0], 1);
  const min = Math.min(...prices);
  const range = Math.max(...prices) - min;
  return points.map((_, i) => ({
    x: round(((times[i] - times[0]) / span) * width),
    // A single price is a flat line in the middle
    y: round(range ? height - ((prices[i] - min) / range) * height : height / 2),
  }));
}

/** SVG path of a step line: each price holds until the next point, the last one until [now] */
export function stepPath(points: PricePoint[], now: number, width = WIDTH, height = HEIGHT): string {
  if (!points.length) return '';
  const at = project(points, now, width, height);
  let d = `M${at[0].x},${at[0].y}`;
  for (let i = 1; i < at.length; i++) d += ` H${at[i].x} V${at[i].y}`;
  return `${d} H${width}`;
}

const round = (n: number) => Math.round(n * 10) / 10;

let nextId = 0;

@Component({
  selector: 'app-price-chart',
  template: `
    @if (points().length > 1) {
      <figure class="mb-6">
        <div class="flex gap-3">
          <div class="flex w-16 flex-col justify-between text-right text-xs text-slate-500 tabular-nums">
            <span>{{ i18n.money(max()) }}</span>
            <span>{{ i18n.money(min()) }}</span>
          </div>
          <div class="relative h-48 flex-1">
            <svg [attr.viewBox]="'0 0 ' + width + ' ' + height" preserveAspectRatio="none" role="img"
                 [attr.aria-label]="summary()" class="h-full w-full overflow-visible">
              <defs>
                <linearGradient [attr.id]="gradientId" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stop-color="currentColor" stop-opacity="0.25" />
                  <stop offset="1" stop-color="currentColor" stop-opacity="0" />
                </linearGradient>
              </defs>
              @for (y of [0, height / 2, height]; track y) {
                <line x1="0" [attr.y1]="y" [attr.x2]="width" [attr.y2]="y" class="stroke-slate-200"
                      stroke-dasharray="4 4" vector-effect="non-scaling-stroke" />
              }
              <path [attr.d]="path() + ' V' + height + ' H0 Z'" [attr.fill]="'url(#' + gradientId + ')'" class="text-emerald-600" />
              <path [attr.d]="path()" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"
                    vector-effect="non-scaling-stroke" class="text-emerald-600" />
            </svg>
            <!-- Price changes as focusable dots: HTML so they stay round on the stretched chart, and keyboard reachable -->
            @for (dot of dots(); track $index) {
              <button type="button" class="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-600 bg-surface
                                           hover:scale-125 focus-visible:scale-125 focus-visible:outline-none"
                      [style.left.%]="dot.left" [style.top.%]="dot.top" [attr.aria-label]="dot.label"
                      (mouseenter)="active.set($index)" (focus)="active.set($index)"
                      (mouseleave)="active.set(null)" (blur)="active.set(null)"></button>
            }
            @if (active() !== null) {
              @let dot = dots()[active()!];
              <div class="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-md bg-slate-900 px-2 py-1 text-xs whitespace-nowrap text-slate-50 shadow"
                   [style.left.%]="dot.left" [style.top.%]="dot.top" aria-hidden="true">
                {{ dot.label }}
              </div>
            }
          </div>
        </div>
        <figcaption class="mt-1 ml-[4.75rem] flex justify-between text-xs text-slate-500">
          <span>{{ i18n.date(points()[0].recorded_at, 'mediumDate') }}</span>
          <span>{{ i18n.t('chart.today') }}</span>
        </figcaption>
      </figure>
    } @else if (points().length === 1) {
      <p class="mb-6 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-600">
        {{ i18n.t('chart.stable', { date: i18n.date(points()[0].recorded_at, 'd MMM y') }) }}
      </p>
    }
  `,
})
export class PriceChart {
  readonly i18n = inject(I18n);
  readonly points = input.required<PricePoint[]>();
  readonly width = WIDTH;
  readonly height = HEIGHT;
  /** Unique per chart: two charts on a page must not share a gradient */
  readonly gradientId = `price-chart-fill-${nextId++}`;
  /** Dot under the pointer or keyboard focus */
  readonly active = signal<number | null>(null);

  private readonly now = Date.now();
  readonly path = computed(() => stepPath(this.points(), this.now));
  readonly min = computed(() => Math.min(...this.points().map((p) => p.price)));
  readonly max = computed(() => Math.max(...this.points().map((p) => p.price)));
  readonly dots = computed(() =>
    project(this.points(), this.now, WIDTH, HEIGHT).map((at, i) => ({
      left: (at.x / WIDTH) * 100,
      top: (at.y / HEIGHT) * 100,
      label: `${this.i18n.date(this.points()[i].recorded_at, 'd MMM y')}: ${this.i18n.money(this.points()[i].price)}`,
    })),
  );
  readonly summary = computed(() =>
    this.i18n.t('chart.summary', { n: this.points().length, min: this.i18n.money(this.min()), max: this.i18n.money(this.max()) }),
  );
}
