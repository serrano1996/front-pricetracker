import { Component, computed, effect, inject, input, linkedSignal, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { SearchProduct } from '../../../core/api/models';
import { errorMessage, PriceTrackerApi } from '../../../core/api/price-tracker-api';
import { I18n } from '../../../core/i18n/i18n';
import { load, save } from '../../../core/storage/storage';
import { packSize } from '../../../shared/domain/pack-size';
import { Icon } from '../../../shared/ui/icon';
import { Logo } from '../../../shared/ui/logo';
import { Basket } from '../../basket/application/basket.store';
import { Place, Places } from '../data/places';
import { cheapestPerUnit, compareOffers, SortBy, sortProducts } from '../domain/offers';

const POSTAL_CODE_KEY = 'pt.postal_code';
const LOADING_LINE_MS = 3000;
const STORES_KEY = 'pt.stores';

@Component({
  selector: 'app-search-page',
  imports: [RouterLink, Icon, Logo],
  template: `
    <!--
      Before any search the finder is the whole page (hero). After one it becomes a single sticky bar above the results:
      product | place | search in one rounded control, store pills beside it on wide screens.
    -->
    <section [class]="landing()
      ? 'mx-auto flex min-h-[65vh] max-w-5xl flex-col items-center justify-center text-center'
      : 'sticky top-0 z-20 -mx-4 mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-200 bg-slate-50/85 px-4 py-3 backdrop-blur'">
      @if (landing()) {
        <app-logo class="mb-6 text-3xl sm:text-4xl" />
        <h1 class="mb-8 text-3xl font-bold tracking-tight text-balance sm:mb-10 sm:text-5xl">{{ i18n.t('search.title') }}</h1>
      } @else {
        <h1 class="sr-only">{{ i18n.t('search.title') }}</h1>
      }
      <form [class]="landing()
              ? 'flex w-full flex-col gap-2 text-left sm:flex-row'
              : 'flex w-full flex-col rounded-2xl border border-slate-300 bg-surface text-left shadow-sm focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/30 sm:flex-row sm:items-center sm:rounded-full lg:w-auto lg:flex-1'"
            (submit)="$event.preventDefault(); submit(termInput.value, postal())">
        <label class="sr-only" for="term">{{ i18n.t('search.product') }}</label>
        <div class="relative flex-1">
          <app-icon name="search" class="pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-400" [class]="landing() ? 'left-3' : 'left-4'" />
          <input #termInput id="term" name="term" [value]="termText()" (input)="termText.set($any($event.target).value)"
                 [placeholder]="i18n.t('search.productPlaceholder')" required list="popular-terms" autocomplete="off"
                 [class]="landing() ? 'input w-full pl-9 py-3 text-base' : compactInput + ' pr-9'" />
          @if (!landing() && termText()) {
            <button type="button" class="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    [attr.aria-label]="i18n.t('search.clear')" [title]="i18n.t('search.clear')"
                    (click)="termText.set(''); termInput.focus()">
              <app-icon name="x" class="block" />
            </button>
          }
        </div>
        <datalist id="popular-terms">
          @for (t of popular(); track t) { <option [value]="t"></option> }
        </datalist>
        <div [class]="landing() ? 'relative sm:w-72' : 'relative border-t border-slate-200 sm:w-72 sm:border-t-0 sm:border-l'">
          <app-icon name="map-pin" class="pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-400" [class]="landing() ? 'left-3' : 'left-4'" />
          <input name="place" role="combobox" [attr.aria-label]="i18n.t('search.place')" aria-autocomplete="list"
                 aria-controls="place-options" [attr.aria-expanded]="open()"
                 [attr.aria-activedescendant]="open() ? 'place-' + active() : null"
                 [value]="query()" (input)="type($any($event.target).value)" (keydown)="onKey($event)"
                 (blur)="open.set(false)" [placeholder]="i18n.t('search.place')" required autocomplete="off"
                 [class]="landing() ? 'input w-full pl-9 py-3 text-base' : compactInput" />
          @if (open()) {
            <ul id="place-options" role="listbox"
                class="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-md border border-slate-200 bg-surface py-1 shadow-sm">
              @for (p of suggestions(); track p.postalCode + p.name; let i = $index) {
                <li [id]="'place-' + i" role="option" [attr.aria-selected]="i === active()"
                    class="cursor-pointer px-3 py-1.5 text-sm" [class.bg-emerald-50]="i === active()"
                    (mousedown)="$event.preventDefault(); pick(p)">
                  {{ p.name }} ({{ p.postalCode }}) <span class="text-slate-500">· {{ p.province }}</span>
                </li>
              }
            </ul>
          }
        </div>
        <button [class]="landing() ? 'btn-primary h-12 w-full sm:w-12 sm:shrink-0 sm:self-center sm:rounded-full sm:p-0' : 'btn-primary m-1 rounded-xl px-3 py-2 sm:size-9 sm:rounded-full sm:p-0'"
                [disabled]="results.isLoading()" [attr.aria-label]="i18n.t('search.submit')" [title]="i18n.t('search.submit')">
          <app-icon name="search" class="size-5" />
        </button>
      </form>
      @if (invalidPlace() && landing()) {
        <p class="mt-2 flex items-center gap-1.5 text-sm text-red-700" role="alert"><app-icon name="alert" />{{ i18n.t('search.invalidPlace') }}</p>
      }

      <div [class]="landing() ? 'mt-5 flex flex-col flex-wrap items-center gap-x-6 gap-y-2' : 'flex flex-wrap items-center gap-2'">
        <fieldset class="flex flex-wrap justify-center gap-2">
          <legend class="sr-only">{{ i18n.t('search.stores') }}</legend>
          @for (s of allStores; track s) {
            <!-- The last selected store cannot be unchecked: comparing nothing makes no sense -->
            <!-- Native checkbox kept for keyboard and screen readers, visually replaced by the pill -->
            <label class="flex cursor-pointer items-center gap-1.5 rounded-full border font-medium capitalize
                          has-[:disabled]:cursor-not-allowed has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2
                          has-[:focus-visible]:outline-emerald-600"
                   [class]="landing() ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-xs'"
                   [class.border-slate-900]="selected().includes(s)" [class.bg-slate-900]="selected().includes(s)"
                   [class.text-slate-50]="selected().includes(s)" [class.border-slate-300]="!selected().includes(s)"
                   [class.bg-surface]="!selected().includes(s)" [class.text-slate-500]="!selected().includes(s)">
              <input type="checkbox" class="sr-only" [checked]="selected().includes(s)" (change)="toggle(s)"
                     [disabled]="selected().length === 1 && selected().includes(s)" />
              <span class="size-2 rounded-full" [class.bg-emerald-400]="selected().includes(s)"
                    [class.bg-slate-300]="!selected().includes(s)"></span>
              {{ s }}
              @if (selected().includes(s)) { <app-icon name="check" class="size-3.5" /> }
            </label>
          }
        </fieldset>
        @if (landing() && popular().length) {
          <p class="mt-3 text-sm text-slate-600">
            <app-icon name="flame" class="text-amber-600" />
            {{ i18n.t('search.popular') }}
            @for (t of popular(); track t) {
              <button type="button" class="link ml-2" (click)="submit(t, postal())">{{ t }}</button>
            }
          </p>
        }
      </div>
      @if (invalidPlace() && !landing()) {
        <p class="flex w-full items-center gap-1.5 text-sm text-red-700" role="alert"><app-icon name="alert" />{{ i18n.t('search.invalidPlace') }}</p>
      }
    </section>

    @if (results.isLoading()) {
      <!-- Hidden from screen readers: a new line every few seconds would be noise; the status below says "Searching" -->
      <p class="mb-4 flex items-center justify-center gap-2 text-center text-sm text-slate-500" aria-hidden="true">
        <app-icon name="refresh" class="animate-spin text-emerald-600" />{{ i18n.loadingLines()[loadingLine() % i18n.loadingLines().length] }}
      </p>
      <div class="grid gap-4 md:grid-cols-3" role="status" [attr.aria-label]="i18n.t('search.searching')">
        <span class="sr-only">{{ i18n.t('search.searching') }}</span>
        @for (i of [1, 2, 3]; track i) { <div class="card h-48 animate-pulse bg-slate-100"></div> }
      </div>
    } @else if (results.error()) {
      <p class="card flex items-center gap-2 border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert"><app-icon name="alert" />{{ error() }}</p>
    } @else if (results.value(); as r) {
      <p class="mb-4 flex items-start gap-2 text-xs text-slate-500"><app-icon name="info" class="mt-px shrink-0" />{{ i18n.t('prices.indicative') }}</p>
      @if (r.comparison.length) {
        <h2 class="mb-3 flex items-center gap-2 text-lg font-semibold"><app-icon name="scale" class="size-5 text-emerald-700" />{{ i18n.t('search.comparison') }}</h2>
        <div class="mb-8 grid gap-3 md:grid-cols-2">
          @for (c of comparisons(); track c.type) {
            <!-- min-w-0: a grid item may not shrink below its content otherwise, and long product names overflow on phones -->
            <section class="card min-w-0 p-4">
              <div class="mb-3 flex items-start justify-between gap-2">
                <h3 class="font-medium">
                  {{ c.type }}
                  <span class="badge ml-1 bg-slate-100 font-normal text-slate-600">{{ i18n.t('search.perUnit', { unit: c.unit }) }}</span>
                </h3>
                @if (basket.has(c.type)) {
                  <span class="badge shrink-0 gap-1 bg-emerald-100 text-emerald-800"><app-icon name="check" class="size-3" />{{ i18n.t('search.inList') }}</span>
                } @else {
                  <button class="btn-primary shrink-0 rounded-full p-2" (click)="basket.addType(c, r.postal_code)"
                          [attr.aria-label]="i18n.t('search.addToList') + ': ' + c.type" [title]="i18n.t('search.addToList')">
                    <app-icon name="cart" class="size-4" />
                  </button>
                }
              </div>
              <ol class="space-y-1">
                @for (row of c.rows; track row.offer.product_id) {
                  <!-- Phones: store and price on top, product and bar below at full width; wider: one row -->
                  <li class="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 rounded-md px-2 py-1.5 text-sm sm:flex" [class.bg-emerald-50]="row.best">
                    <span class="flex shrink-0 items-center gap-1 capitalize sm:w-24" [class.font-semibold]="row.best" [class.text-emerald-800]="row.best">
                      {{ row.offer.store }}
                      @if (references().get(row.offer.store); as ref) {
                        <span class="normal-case" [title]="i18n.t('search.ref', { place: ref })">
                          <app-icon name="map-pin" class="size-3.5 text-amber-600" />
                          <span class="sr-only">{{ i18n.t('search.ref', { place: ref }) }}</span>
                        </span>
                      }
                    </span>
                    <div class="col-span-2 row-start-2 min-w-0 sm:flex-1">
                      <a class="link block truncate" [routerLink]="['/products', row.offer.product_id]" [title]="row.offer.name">{{ row.offer.name }}</a>
                      <!-- Unit price as a share of the dearest offer, to compare at a glance -->
                      <div class="mt-1 h-1.5 rounded-full bg-slate-100" aria-hidden="true">
                        <div class="h-full rounded-full" [class.bg-emerald-500]="row.best" [class.bg-slate-300]="!row.best" [style.width.%]="row.bar"></div>
                      </div>
                    </div>
                    <div class="col-start-2 row-start-1 shrink-0 text-right tabular-nums">
                      <span [class.font-semibold]="row.best">{{ i18n.money(row.offer.unit_price) }}/{{ c.unit }}</span>
                      @if (row.best) {
                        <span class="badge block bg-emerald-100 text-emerald-800">{{ i18n.t(c.tie ? 'search.tie' : 'search.best') }}</span>
                      } @else {
                        <span class="block text-xs text-red-700">
                          {{ i18n.t('search.diff', { amount: i18n.money(row.diff), unit: c.unit, pct: i18n.percent(row.pct) }) }}
                        </span>
                      }
                      <span class="block text-xs text-slate-500">{{ i18n.money(row.offer.price) }}</span>
                    </div>
                  </li>
                }
                @for (store of c.missing; track store) {
                  <li class="flex items-center gap-3 px-2 py-1.5 text-sm text-slate-400">
                    <span class="w-24 shrink-0 capitalize">{{ store }}</span>
                    <span class="flex items-center gap-1"><app-icon name="ban" class="size-3.5" />{{ i18n.t('search.notAvailable') }}</span>
                  </li>
                }
              </ol>
            </section>
          }
        </div>
      }

      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 class="flex items-center gap-2 text-lg font-semibold"><app-icon name="store" class="size-5 text-emerald-700" />{{ i18n.t('search.byStore') }}</h2>
        <label class="flex items-center gap-2 rounded-lg border border-slate-200 bg-surface py-1 pr-1 pl-3 text-sm text-slate-500 shadow-sm">
          {{ i18n.t('search.sortBy') }}:
          <select class="cursor-pointer rounded-md bg-transparent py-1 pr-1 font-medium text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40"
                  (change)="sortBy.set($any($event.target).value)">
            <option value="unit_price" [selected]="sortBy() === 'unit_price'">{{ i18n.t('search.sort.unit_price') }}</option>
            <option value="price" [selected]="sortBy() === 'price'">{{ i18n.t('search.sort.price') }}</option>
            <option value="relevance" [selected]="sortBy() === 'relevance'">{{ i18n.t('search.sort.relevance') }}</option>
          </select>
        </label>
      </div>
      <div class="grid items-start gap-4 md:grid-cols-2 lg:grid-cols-3">
        @for (s of sortedStores(); track s.store) {
          <section class="card min-w-0 rounded-xl p-4">
            <h3 class="flex items-center justify-between gap-2 border-b border-slate-200 pb-3 font-semibold capitalize">
              <span class="flex items-center gap-2"><span class="size-2 rounded-full bg-emerald-500" aria-hidden="true"></span>{{ s.store }}</span>
              @if (s.status === 'ok') {
                <span class="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-normal text-slate-600 normal-case">
                  {{ i18n.t('search.products', { n: s.products.length }) }}
                </span>
              }
            </h3>
            @switch (s.status) {
              @case ('not_served') { <p class="flex items-center gap-2 pt-3 text-sm text-slate-500"><app-icon name="ban" />{{ i18n.t('search.notServed') }}</p> }
              @case ('unavailable') {
                <div class="flex flex-wrap items-center justify-between gap-2 pt-3">
                  <p class="flex items-center gap-2 text-sm text-red-700"><app-icon name="alert" />{{ i18n.t('search.unavailable') }}</p>
                  <button type="button" class="btn-secondary gap-1.5" (click)="results.reload()"><app-icon name="refresh" class="size-3.5" />{{ i18n.t('search.retry') }}</button>
                </div>
              }
              @default {
                @if (s.reference_postal_code || s.stale) {
                  <div class="space-y-2 pt-3">
                    @if (s.reference_postal_code) {
                      <p class="notice flex gap-2 rounded-lg">
                        <app-icon name="info" class="mt-0.5" />
                        {{ i18n.t('search.reference', { place: places.label(r.postal_code), reference: places.label(s.reference_postal_code), km: s.reference_distance_km }) }}
                      </p>
                    }
                    @if (s.stale) {
                      <p class="notice flex items-center gap-2 rounded-lg"><app-icon name="clock" />{{ i18n.t('search.stale', { date: i18n.date(s.fetched_at, 'short') }) }}</p>
                    }
                  </div>
                }
                <ul class="space-y-2 pt-3">
                  @for (p of shown(s); track p.id) {
                    <!-- The whole card opens the product (stretched link); the cart button sits above it -->
                    <li class="relative rounded-lg border bg-slate-100 p-3 transition hover:border-emerald-500 hover:shadow-sm"
                        [class.border-emerald-500]="basket.has(p.id)" [class.ring-1]="basket.has(p.id)"
                        [class.ring-emerald-500]="basket.has(p.id)" [class.border-slate-200]="!basket.has(p.id)">
                      <div class="flex gap-3">
                        <div class="size-14 shrink-0 rounded-md bg-surface p-1">
                          <!-- An image that fails to load is hidden instead of showing its alt text (Dia blocks automated browsers) -->
                          @if (p.image_url) {
                            <img [src]="p.image_url" [alt]="p.name" loading="lazy" class="h-full w-full object-contain"
                                 (error)="$any($event.target).hidden = true" />
                          }
                        </div>
                        <div class="min-w-0 flex-1">
                          <a class="line-clamp-2 text-sm text-slate-900 after:absolute after:inset-0 after:rounded-lg hover:text-emerald-800 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-emerald-600"
                             [routerLink]="['/products', p.id]" [title]="p.name">{{ p.name }}</a>
                          <div class="mt-1 flex flex-wrap items-center gap-1">
                            @if (packSize(p); as size) {
                              <span class="badge rounded-full border border-slate-300 bg-surface text-[11px] font-medium text-slate-600"
                                    [title]="i18n.t('search.packHint')">{{ i18n.number(size.amount) }} {{ size.unit }}</span>
                            }
                            @if (s.cheapest.has(p.id)) {
                              <span class="badge gap-1 rounded-full bg-emerald-100 text-[11px] text-emerald-800">
                                <app-icon name="tag" class="size-3" />{{ i18n.t('search.cheapest', { unit: p.unit_price_unit }) }}
                              </span>
                            }
                            <!-- != null: an older backend sends no previous_price at all -->
                            @if (p.previous_price != null) {
                              <span class="badge gap-1 rounded-full text-[11px]"
                                    [class.bg-emerald-100]="p.price < p.previous_price" [class.text-emerald-800]="p.price < p.previous_price"
                                    [class.bg-red-50]="p.price > p.previous_price" [class.text-red-700]="p.price > p.previous_price">
                                <app-icon [name]="p.price < p.previous_price ? 'trending-down' : 'trending-up'" class="size-3" />
                                <span class="sr-only">{{ i18n.t(p.price < p.previous_price ? 'search.priceDown' : 'search.priceUp') }}</span>
                                {{ i18n.t('search.trend', {
                                  amount: i18n.money(abs(p.price - p.previous_price)),
                                  date: i18n.date(p.price_changed_at, 'd MMM'),
                                }) }}
                              </span>
                            }
                          </div>
                        </div>
                      </div>
                      <div class="mt-2 flex items-center justify-between gap-2">
                        <p class="tabular-nums">
                          <span class="font-semibold">{{ i18n.money(p.price) }}</span>
                          @if (p.unit_price !== null) {
                            <span class="ml-1.5 text-sm font-semibold text-slate-700">{{ i18n.money(p.unit_price) }}/{{ p.unit_price_unit }}</span>
                          }
                        </p>
                        @if (basket.has(p.id)) {
                          <span class="badge gap-1 bg-emerald-100 text-emerald-800"><app-icon name="check" class="size-3" />{{ i18n.t('search.inList') }}</span>
                        } @else {
                          <button class="btn-primary relative z-10 rounded-full p-2" (click)="basket.addProduct(p, s.store, r.comparison, r.postal_code)"
                                  [attr.aria-label]="i18n.t('search.addToList') + ': ' + p.name" [title]="i18n.t('search.addToList')">
                            <app-icon name="cart" class="size-4" />
                          </button>
                        }
                      </div>
                    </li>
                  } @empty {
                    <li class="text-sm text-slate-500">{{ i18n.t('search.noProducts') }}</li>
                  }
                </ul>
                @if (s.products.length > previewSize) {
                  <button type="button" class="btn-secondary mt-3 w-full justify-center py-1.5" (click)="toggleExpanded(s.store)"
                          [attr.aria-expanded]="expanded().has(s.store)">
                    {{ expanded().has(s.store) ? i18n.t('search.showLess') : i18n.t('search.showAll', { n: s.products.length }) }}
                  </button>
                }
              }
            }
          </section>
        }
      </div>
    }
  `,
})
export class SearchPage {
  private readonly api = inject(PriceTrackerApi);
  readonly i18n = inject(I18n);
  private readonly router = inject(Router);

  // Bound from query params so searches are shareable and survive back navigation
  readonly term = input<string>();
  readonly postal_code = input<string>();
  /** Comma-separated stores to compare; all when missing */
  readonly stores = input<string>();

  readonly allStores = ['mercadona', 'alcampo', 'dia'];
  readonly selected = computed(() => {
    const picked = (this.stores() ?? '').split(',').filter((s) => this.allStores.includes(s));
    return picked.length ? picked : this.allStores;
  });

  // The backend only calls the selected stores' scrapers, so changing the selection searches again
  readonly results = rxResource({
    // undefined keeps the resource idle: a stream that completes without a value would be an error (NG0991)
    params: () => {
      const term = this.term();
      const postalCode = this.postal_code();
      if (!term || !postalCode) return undefined;
      return { term, postalCode, stores: this.selected().length === this.allStores.length ? undefined : this.selected() };
    },
    stream: ({ params: { term, postalCode, stores } }) => this.api.search(term, postalCode, stores),
  });

  /** Borderless field inside the compact search bar */
  readonly compactInput = 'w-full bg-transparent py-2.5 pl-10 text-sm placeholder:text-slate-400 focus:outline-none';
  /** Text in the product box, so the clear button knows when to show */
  readonly termText = linkedSignal(() => this.term() ?? '');
  /** No search to show yet: the finder takes the whole page */
  readonly landing = computed(() => !this.term() || !this.postal_code());
  readonly error = computed(() => errorMessage(this.results.error()) ?? this.i18n.t('error.network'));
  readonly basket = inject(Basket);
  readonly abs = Math.abs;
  /** Most searched terms lately: suggestions while typing; without them the box just has none */
  readonly popular = toSignal(
    this.api.popularSearches().pipe(
      map((r) => r.terms),
      catchError(() => of([] as string[])),
    ),
    { initialValue: [] as string[] },
  );

  readonly sortBy = signal<SortBy>('unit_price');
  /** Each store's products in the chosen order, with the cheapest per unit (kg, L…) marked */
  readonly sortedStores = computed(() =>
    (this.results.value()?.stores ?? []).map((s) => ({
      ...s,
      products: sortProducts(s.products, this.sortBy()),
      cheapest: cheapestPerUnit(s.products),
    })),
  );

  readonly packSize = packSize;
  /** Which geeky loading line shows: a random one first, then the next every few seconds while loading */
  readonly loadingLine = signal(0);

  private readonly rotateLoadingLines = effect((onCleanup) => {
    if (!this.results.isLoading()) return;
    this.loadingLine.set(Math.floor(Math.random() * this.i18n.loadingLines().length));
    const timer = setInterval(() => this.loadingLine.update((i) => i + 1), LOADING_LINE_MS);
    onCleanup(() => clearInterval(timer));
  });
  /** Products shown per store until "Show all" */
  readonly previewSize = 6;
  /** Stores showing all their products; back to previews on every new search */
  readonly expanded = linkedSignal<unknown, Set<string>>({ source: () => this.results.value(), computation: () => new Set() });

  shown(store: { store: string; products: SearchProduct[] }): SearchProduct[] {
    return this.expanded().has(store.store) ? store.products : store.products.slice(0, this.previewSize);
  }

  toggleExpanded(store: string): void {
    this.expanded.update((open) => {
      const next = new Set(open);
      if (!next.delete(store)) next.add(store);
      return next;
    });
  }

  constructor() {
    // Landing with no query: come back to the last postal code and stores used in this browser
    const query = inject(ActivatedRoute).snapshot.queryParamMap;
    const postalCode = load<string>(POSTAL_CODE_KEY);
    const stores = load<string>(STORES_KEY);
    if (!query.keys.length && (postalCode || stores)) {
      this.router.navigate([], { queryParams: { postal_code: postalCode, stores }, replaceUrl: true });
    }
  }

  toggle(store: string) {
    const next = this.allStores.filter((s) => (s === store) !== this.selected().includes(s));
    // Every store selected is the default: keep the URL clean
    const stores = next.length === this.allStores.length ? null : next.join(',');
    save(STORES_KEY, stores);
    this.router.navigate([], { queryParams: { stores }, queryParamsHandling: 'merge' });
  }

  readonly places = inject(Places);
  /** Postal code to search: from the URL, a picked town, or 5 typed digits */
  readonly postal = linkedSignal(() => this.postal_code() ?? '');
  /** Text in the town box; shows the URL's postal code as "Town (postal code)" once the list has loaded */
  readonly query = linkedSignal(() => this.places.label(this.postal_code() ?? ''));
  readonly suggestions = computed(() => this.places.search(this.query()));
  readonly open = signal(false);
  readonly active = signal(0);
  readonly invalidPlace = signal(false);

  /** Comparisons with each offer measured against the cheapest, and the selected stores that have none */
  readonly comparisons = computed(() =>
    (this.results.value()?.comparison ?? []).map((c) => ({
      ...c,
      ...compareOffers(c.offers),
      missing: this.selected().filter((s) => !c.offers.some((o) => o.store === s)),
    })),
  );

  /** Store → "Town (postal code)", for stores priced from another postal code */
  readonly references = computed(
    () =>
      new Map(
        (this.results.value()?.stores ?? [])
          .filter((s) => s.reference_postal_code)
          .map((s) => [s.store, this.places.label(s.reference_postal_code!)]),
      ),
  );

  type(value: string) {
    this.query.set(value);
    this.postal.set(/^\d{5}$/.test(value.trim()) ? value.trim() : '');
    this.active.set(0);
    this.open.set(this.suggestions().length > 0);
  }

  pick(place: Place) {
    this.query.set(`${place.name} (${place.postalCode})`);
    this.postal.set(place.postalCode);
    this.open.set(false);
    this.invalidPlace.set(false);
  }

  onKey(event: KeyboardEvent) {
    const count = this.suggestions().length;
    if (!this.open() || !count) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.active.update((i) => (i + (event.key === 'ArrowDown' ? 1 : count - 1)) % count);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.pick(this.suggestions()[this.active()]);
    } else if (event.key === 'Escape') {
      this.open.set(false);
    }
  }

  submit(term: string, postalCode: string) {
    term = term.trim();
    this.invalidPlace.set(!/^\d{5}$/.test(postalCode));
    if (!term || this.invalidPlace()) return;
    save(POSTAL_CODE_KEY, postalCode);
    // Same search again: the URL would not change, so ask the backend again (it only retries stores without fresh data)
    if (term === this.term() && postalCode === this.postal_code()) this.results.reload();
    else this.router.navigate([], { queryParams: { term, postal_code: postalCode }, queryParamsHandling: 'merge' });
  }
}
