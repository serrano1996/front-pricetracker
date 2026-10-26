import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { PriceTrackerApi } from '../../../core/api/price-tracker-api';
import { I18n } from '../../../core/i18n/i18n';
import { Icon } from '../../../shared/ui/icon';
import { Basket } from '../application/basket.store';
import { BasketItem, cheapestStores, cost, distinctPlans, Plan, same } from '../domain/basket';

/** [items] in consecutive groups of at most [size] */
const chunk = <T>(items: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));

@Component({
  selector: 'app-list-page',
  imports: [RouterLink, Icon],
  template: `
    <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-3">
        <button class="btn-secondary rounded-full p-2" (click)="back()" [attr.aria-label]="i18n.t('product.back')" [title]="i18n.t('product.back')">
          <app-icon name="arrow-left" />
        </button>
        <h1 class="flex items-center gap-2 text-xl font-semibold"><app-icon name="cart" class="size-6 text-emerald-700" />{{ i18n.t('list.title') }}</h1>
      </div>
      @if (basket.items().length) {
        <button class="btn-secondary gap-1.5 text-red-700" (click)="clear()"><app-icon name="trash" class="size-3.5" />{{ i18n.t('list.clear') }}</button>
      }
    </div>
    @if (refreshing()) {
      <p class="mb-4 flex items-center gap-2 text-sm text-slate-500" role="status">
        <app-icon name="refresh" class="animate-spin" />{{ i18n.t('list.refreshing') }}
      </p>
    } @else if (failed()) {
      <p class="notice mb-4 flex items-center gap-2" role="status"><app-icon name="alert" />{{ i18n.t('list.refreshFailed', { n: failed() }) }}</p>
    }

    @if (!basket.items().length) {
      <p class="card flex flex-col items-center gap-3 p-8 text-center text-sm text-slate-500">
        <app-icon name="cart" class="size-10 text-slate-300" />
        {{ i18n.t('list.empty') }}
      </p>
    } @else {
      <div class="grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
        <ul class="space-y-3">
          @for (item of basket.items(); track item.key) {
            <li class="card p-4">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="font-medium">{{ item.label }}</p>
                  <p class="text-xs text-slate-400">{{ i18n.t('list.pricesFrom', { date: i18n.date(item.addedAt, 'd MMM, HH:mm'), postalCode: item.postalCode }) }}</p>
                </div>
                <div class="flex items-center gap-2">
                  <!-- Packs go one by one; kg and L by halves -->
                  <div class="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-0.5">
                    <button type="button" class="flex size-7 items-center justify-center rounded-full text-slate-600 hover:bg-surface disabled:opacity-40"
                            [disabled]="item.quantity <= step(item)" (click)="basket.setQuantity(item.key, item.quantity - step(item))"
                            [attr.aria-label]="i18n.t('list.decrease', { label: item.label })"><span aria-hidden="true">−</span></button>
                    <span class="min-w-14 text-center text-sm font-medium tabular-nums" aria-live="polite">
                      {{ i18n.number(item.quantity) }} {{ item.per === 'pack' ? i18n.t(item.quantity === 1 ? 'list.pack' : 'list.packs') : item.unit }}
                    </span>
                    <button type="button" class="flex size-7 items-center justify-center rounded-full text-slate-600 hover:bg-surface"
                            (click)="basket.setQuantity(item.key, item.quantity + step(item))"
                            [attr.aria-label]="i18n.t('list.increase', { label: item.label })"><span aria-hidden="true">+</span></button>
                  </div>
                  <button type="button" class="rounded-full p-2 text-slate-400 hover:bg-red-50 hover:text-red-700" (click)="basket.remove(item.key)"
                          [attr.aria-label]="i18n.t('list.removeItem', { label: item.label })" [title]="i18n.t('list.remove')">
                    <app-icon name="trash" />
                  </button>
                </div>
              </div>
              <div class="mt-3 grid gap-2" [style.grid-template-columns]="'repeat(' + basket.stores().length + ', minmax(0, 1fr))'">
                @for (s of basket.stores(); track s) {
                  @if (priced(item, s); as p) {
                    <a class="rounded-lg border p-2 text-sm hover:border-emerald-500" [routerLink]="['/products', p.offer.product_id]" [title]="p.offer.name"
                       [class.border-emerald-500]="cheapest(item).has(s)" [class.bg-emerald-50]="cheapest(item).has(s)"
                       [class.border-slate-200]="!cheapest(item).has(s)">
                      <span class="block text-xs capitalize text-slate-500">{{ s }}</span>
                      <span class="block font-semibold tabular-nums" [class.text-emerald-800]="cheapest(item).has(s)">{{ i18n.money(p.cost) }}</span>
                      <span class="block truncate text-[11px] text-slate-500">
                        {{ p.offer.name }}
                        @if (item.per === 'pack') { · {{ i18n.t(p.offer.product_id === item.key ? 'list.yourPick' : 'list.equivalent') }} }
                      </span>
                    </a>
                  } @else {
                    <div class="rounded-lg border border-dashed border-slate-200 p-2 text-sm text-slate-400">
                      <span class="block text-xs capitalize">{{ s }}</span>
                      <span class="block">{{ i18n.t('search.notAvailable') }}</span>
                    </div>
                  }
                }
              </div>
            </li>
          }
        </ul>

        <aside class="card space-y-5 p-5 lg:sticky lg:top-4">
          <h2 class="flex items-center gap-2 text-lg font-semibold"><app-icon name="store" class="size-5 text-emerald-700" />{{ i18n.t('list.whereToBuy') }}</h2>

          @if (sameEverywhere(); as total) {
            <p class="rounded-lg bg-emerald-50 p-3 text-emerald-900">{{ i18n.t('list.sameEverywhere', { total: i18n.money(total) }) }}</p>
          } @else if (best(); as b) {
            <div class="rounded-lg bg-emerald-50 p-3">
              <p class="text-sm text-emerald-900">{{ i18n.t('list.cheapest') }}</p>
              <p class="text-lg font-semibold capitalize text-emerald-900">{{ names(b) }} · {{ i18n.money(b.total) }}</p>
              @if (bestSingle(); as single) {
                @if (single !== b && single.total - b.total > 0.005) {
                  <p class="mt-1 text-sm text-emerald-800">{{ i18n.t('list.saves', { amount: i18n.money(single.total - b.total), stores: names(single) }) }}</p>
                }
              }
              @if (b.stores.length > 1) {
                <ul class="mt-2 space-y-1 text-sm">
                  @for (s of b.stores; track s) {
                    <li><strong class="capitalize">{{ s }}</strong>: {{ itemsAt(b, s) }}</li>
                  }
                </ul>
              }
            </div>
          } @else {
            <p class="notice flex items-center gap-2"><app-icon name="alert" />{{ i18n.t('list.noPlan') }}</p>
          }

          <p class=" flex items-start gap-2 text-xs text-slate-500"><app-icon name="info" class="mt-px shrink-0" />{{ i18n.t('prices.indicative') }}</p>

          <div>
            <h3 class="mb-2 text-sm font-medium text-slate-500">{{ i18n.t('list.byStore') }}</h3>
            <ul class="space-y-2">
              @for (t of storeTotals(); track t.stores[0]) {
                <li class="text-sm">
                  <div class="flex justify-between gap-2">
                    <span class="capitalize">{{ t.stores[0] }}</span>
                    <span class="font-semibold tabular-nums">
                      {{ i18n.money(t.total) }}
                      @if (t.missing) { <span class="text-xs font-normal text-amber-700">· {{ i18n.t('list.missingItems', { n: t.missing }) }}</span> }
                    </span>
                  </div>
                  <div class="mt-1 h-1.5 rounded-full bg-slate-100" aria-hidden="true">
                    <div class="h-full rounded-full" [style.width.%]="(t.total / maxStoreTotal()) * 100"
                         [class.bg-emerald-500]="!t.missing && same(t.total, cheapestComplete())" [class.bg-slate-300]="t.missing || !same(t.total, cheapestComplete())"></div>
                  </div>
                </li>
              }
            </ul>
          </div>

          <div>
            <h3 class="mb-2 text-sm font-medium text-slate-500">{{ i18n.t('list.combinations') }}</h3>
            <ul class="divide-y divide-slate-100 text-sm">
              @for (p of shownPlans(); track names(p)) {
                <li class="flex justify-between gap-2 py-1.5" [class.font-semibold]="p === best()">
                  <span class="capitalize">{{ p.stores.length === 1 ? i18n.t('list.only', { stores: names(p) }) : names(p) }}</span>
                  <span class="tabular-nums">
                    {{ i18n.money(p.total) }}
                    @if (p.missing) { <span class="text-xs font-normal text-amber-700">· {{ i18n.t('list.missingItems', { n: p.missing }) }}</span> }
                  </span>
                </li>
              }
            </ul>
            @if (basket.plans().length > previewPlans().length) {
              <button type="button" class="link mt-2 text-sm" (click)="allPlans.set(!allPlans())" [attr.aria-expanded]="allPlans()">
                {{ allPlans() ? i18n.t('search.showLess') : i18n.t('list.showAll', { n: basket.plans().length }) }}
              </button>
            }
          </div>
        </aside>
      </div>
    }
  `,
})
export class ListPage {
  readonly basket = inject(Basket);
  readonly i18n = inject(I18n);
  readonly refreshing = signal(false);
  /** Products whose current price could not be fetched: they keep the last saved one */
  readonly failed = signal(0);
  readonly allPlans = signal(false);
  readonly same = same;

  constructor() {
    const ids = this.basket.productIds();
    if (!ids.length) return;
    this.refreshing.set(true);
    const api = inject(PriceTrackerApi);
    // One request per 100 products (the backend's limit); a failed batch just keeps those saved prices
    forkJoin(chunk(ids, 100).map((batch) => api.products(batch).pipe(map((r) => r.products), catchError(() => of([])))))
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe((batches) => {
        const found = batches.flat();
        this.basket.updatePrices(new Map(found.map((p) => [p.id, { price: p.current_price, unit_price: p.unit_price, checkedAt: p.last_checked_at }])));
        this.failed.set(ids.length - found.length);
        this.refreshing.set(false);
      });
  }

  /** Cheapest plan with every item */
  readonly best = computed(() => this.basket.plans().find((p) => p.missing === 0));
  readonly bestSingle = computed(() => this.basket.plans().find((p) => p.missing === 0 && p.stores.length === 1));
  /** What the whole list costs in each store alone */
  readonly storeTotals = computed(() => this.basket.plans().filter((p) => p.stores.length === 1));
  readonly maxStoreTotal = computed(() => Math.max(...this.storeTotals().map((t) => t.total), 0.01));
  readonly cheapestComplete = computed(() => this.bestSingle()?.total ?? NaN);
  /** The total when every store has the whole list at the same price, so where to buy does not matter */
  readonly sameEverywhere = computed(() => {
    const totals = this.storeTotals();
    const complete = totals.every((t) => !t.missing) && totals.length > 1;
    return complete && totals.every((t) => same(t.total, totals[0].total)) ? totals[0].total : null;
  });
  readonly previewPlans = computed(() => distinctPlans(this.basket.plans()).slice(0, 3));
  readonly shownPlans = computed(() => (this.allPlans() ? this.basket.plans() : this.previewPlans()));

  priced(item: BasketItem, store: string) {
    const offer = item.offers.find((o) => o.store === store);
    const c = offer ? cost(item, offer) : null;
    return offer && c !== null ? { offer, cost: c } : undefined;
  }

  cheapest(item: BasketItem): Set<string> {
    return cheapestStores(item);
  }

  step(item: BasketItem): number {
    return item.per === 'pack' ? 1 : 0.5;
  }

  back(): void {
    history.back();
  }

  clear(): void {
    if (confirm(this.i18n.t('list.clearConfirm'))) this.basket.clear();
  }

  /** "Mercadona + Alcampo" */
  names(plan: Plan): string {
    return plan.stores.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' + ');
  }

  itemsAt(plan: Plan, store: string): string {
    const labels = new Map(this.basket.items().map((i) => [i.key, i.label]));
    return plan.picks.filter((p) => p.store === store).map((p) => labels.get(p.key)).join(', ');
  }
}
