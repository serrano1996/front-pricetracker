import { Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { HistoryProduct, PricePoint, SearchProduct } from '../../../core/api/models';
import { errorMessage, PriceTrackerApi } from '../../../core/api/price-tracker-api';
import { I18n } from '../../../core/i18n/i18n';
import { load } from '../../../core/storage/storage';
import { packSize } from '../../../shared/domain/pack-size';
import { Icon } from '../../../shared/ui/icon';
import { Basket } from '../../basket/application/basket.store';
import { historyStats, sentenceCase } from '../domain/history';
import { PriceChart } from './price-chart';

@Component({
  selector: 'app-product-page',
  imports: [PriceChart, Icon],
  template: `
    <button class="btn-secondary mb-4 rounded-full p-2" (click)="back()" [attr.aria-label]="i18n.t('product.back')" [title]="i18n.t('product.back')">
      <app-icon name="arrow-left" />
    </button>

    @if (data.isLoading()) {
      <div class="card h-40 animate-pulse bg-slate-100" role="status" [attr.aria-label]="i18n.t('product.loading')"><span class="sr-only">{{ i18n.t('product.loading') }}</span></div>
    } @else if (data.error()) {
      <p class="card flex items-center gap-2 border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert"><app-icon name="alert" />{{ error() }}</p>
    } @else if (data.value(); as d) {
      <section class="card mb-6 grid gap-6 p-6 sm:grid-cols-[12rem_1fr]">
        <div class="flex size-48 items-center justify-center justify-self-center rounded-xl bg-slate-100 p-3">
          @if (d.product.image_url) {
            <img [src]="d.product.image_url" [alt]="d.product.name" class="max-h-full max-w-full object-contain"
                 (error)="$any($event.target).hidden = true" />
          }
        </div>
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2 text-sm">
            <span class="flex items-center gap-1.5 rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-50">
              <span class="size-2 rounded-full bg-emerald-400" aria-hidden="true"></span>{{ d.product.store }}
            </span>
            @if (d.product.category) { <span class="text-slate-500">{{ sentenceCase(d.product.category) }}</span> }
          </div>
          <h1 class="mt-2 text-2xl font-semibold text-balance">{{ d.product.name }}</h1>
          <div class="mt-4 flex flex-wrap items-end gap-x-3 gap-y-1">
            <span class="text-4xl font-bold tabular-nums">{{ i18n.money(d.product.current_price) }}</span>
            @if (d.product.unit_price !== null) {
              <span class="pb-1 text-lg font-semibold text-slate-600 tabular-nums">{{ i18n.money(d.product.unit_price) }}/{{ d.product.unit_price_unit }}</span>
            }
            @if (size(); as s) {
              <span class="badge mb-1.5 rounded-full border border-slate-300 bg-surface text-slate-600" [title]="i18n.t('search.packHint')">
                {{ i18n.number(s.amount) }} {{ s.unit }}
              </span>
            }
          </div>
          <div class="mt-5 flex flex-wrap items-center gap-3">
            @if (basket.has(d.product.id)) {
              <span class="badge gap-1 bg-emerald-100 px-2.5 py-1 text-emerald-800"><app-icon name="check" class="size-3.5" />{{ i18n.t('search.inList') }}</span>
            } @else {
              <button class="btn-primary gap-2" (click)="addToList(d.product)"><app-icon name="cart" />{{ i18n.t('search.addToList') }}</button>
            }
            <span class="text-xs text-slate-500">{{ i18n.t('product.checked', { date: i18n.date(d.product.last_checked_at, 'short') }) }}</span>
          </div>
        </div>
      </section>

      @if (stats(); as st) {
        <dl class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          @for (item of [
            { label: i18n.t('product.min'), value: i18n.money(st.min) },
            { label: i18n.t('product.max'), value: i18n.money(st.max) },
            { label: i18n.t('product.avg'), value: i18n.money(st.avg) },
            { label: i18n.t('product.changes'), value: '' + st.changes },
            { label: i18n.t('product.lastChange'), value: lastChange(st.daysSinceChange) },
          ]; track item.label) {
            <div class="card p-3">
              <dt class="text-xs text-slate-500">{{ item.label }}</dt>
              <dd class="mt-1 text-lg font-semibold tabular-nums">{{ item.value }}</dd>
            </div>
          }
        </dl>
      }

      <section class="card p-6">
        <h2 class="mb-4 flex items-center gap-2 text-lg font-semibold"><app-icon name="history" class="size-5 text-emerald-700" />{{ i18n.t('product.history') }}</h2>
        <app-price-chart [points]="d.history" />
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-200 text-left text-slate-500">
              <th class="py-2 pr-6 font-medium">{{ i18n.t('product.since') }}</th>
              <th class="py-2 pr-6 font-medium">{{ i18n.t('product.price') }}</th>
              <th class="py-2 pr-6 font-medium">{{ i18n.t('product.unitPrice') }}</th>
              <th class="py-2 font-medium">{{ i18n.t('product.change') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 tabular-nums">
            @for (row of rows(); track row.point.recorded_at) {
              <tr>
                <td class="py-2 pr-6">{{ i18n.date(row.point.recorded_at, 'd MMM y, HH:mm') }}</td>
                <td class="py-2 pr-6 font-medium">{{ i18n.money(row.point.price) }}</td>
                <td class="py-2 pr-6">{{ row.point.unit_price === null ? '—' : i18n.money(row.point.unit_price) }}</td>
                <td class="py-2">
                  @if (row.previous; as prev) {
                    <span class="badge gap-1 rounded-full"
                          [class.bg-emerald-100]="row.point.price < prev.price" [class.text-emerald-800]="row.point.price < prev.price"
                          [class.bg-red-50]="row.point.price > prev.price" [class.text-red-700]="row.point.price > prev.price">
                      <app-icon [name]="row.point.price < prev.price ? 'trending-down' : 'trending-up'" class="size-3" />
                      <span class="sr-only">{{ i18n.t(row.point.price < prev.price ? 'search.priceDown' : 'search.priceUp') }}</span>
                      {{ i18n.money(row.point.price - prev.price) }} ({{ i18n.percent((row.point.price - prev.price) / prev.price) }})
                    </span>
                  } @else {
                    <span class="text-xs text-slate-500">{{ i18n.t('product.first') }}</span>
                  }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="4" class="py-2 text-slate-500">{{ i18n.t('product.noHistory') }}</td></tr>
            }
          </tbody>
        </table>
      </section>
    }
  `,
})
export class ProductPage {
  private readonly api = inject(PriceTrackerApi);
  readonly i18n = inject(I18n);
  readonly basket = inject(Basket);
  readonly sentenceCase = sentenceCase;

  readonly id = input.required<string>();

  readonly data = rxResource({
    params: () => this.id(),
    stream: ({ params: id }) => this.api.priceHistory(id),
  });

  readonly error = computed(() => errorMessage(this.data.error()) ?? this.i18n.t('error.network'));

  readonly size = computed(() => {
    const p = this.data.value()?.product;
    return p ? packSize({ price: p.current_price, unit_price: p.unit_price, unit_price_unit: p.unit_price_unit }) : null;
  });

  readonly stats = computed(() => {
    const history = this.data.value()?.history ?? [];
    return history.length ? historyStats(history, Date.now()) : null;
  });

  /** Newest first, each with the price it replaced */
  readonly rows = computed(() => {
    const history = this.data.value()?.history ?? [];
    return history.map((point, i) => ({ point, previous: history[i - 1] as PricePoint | undefined })).reverse();
  });

  lastChange(days: number | null): string {
    if (days === null) return this.i18n.t('product.noChanges');
    if (days === 0) return this.i18n.t('product.today');
    return this.i18n.t(days === 1 ? 'product.yesterday' : 'product.daysAgo', { n: days });
  }

  /** From here the product has no comparison at hand: it goes in alone, priced at its own store */
  addToList(p: HistoryProduct): void {
    const product: SearchProduct = {
      id: p.id, external_id: p.external_id, name: p.name, price: p.current_price, price_format: p.price_format,
      unit_price: p.unit_price, unit_price_unit: p.unit_price_unit, image_url: p.image_url, category: p.category,
      type: null, previous_price: null, price_changed_at: null,
    };
    this.basket.addProduct(product, p.store, [], load<string>('pt.postal_code') ?? '');
  }

  back() {
    history.back();
  }
}
