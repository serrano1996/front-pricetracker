import { formatCurrency, formatDate, formatNumber, formatPercent, registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { computed, effect, Injectable, signal } from '@angular/core';
import { load, save } from '../storage/storage';

registerLocaleData(localeEs);

export type Lang = 'en' | 'es';

const EN = {
  'nav.list': 'Shopping list',
  'nav.items': '{n} items',
  'nav.language': 'Language',
  'nav.toDark': 'Switch to dark theme',
  'nav.toLight': 'Switch to light theme',
  'footer.geonames': 'Postal code coordinates by',
  'footer.developedBy': 'Developed by',

  'search.title': 'Compare supermarket prices',
  'search.product': 'Product',
  'search.productPlaceholder': 'Product (e.g. leche)',
  'search.place': 'Town or postal code',
  'search.clear': 'Clear product',
  'search.submit': 'Search',
  'search.invalidPlace': 'Pick a town from the list or type a 5-digit postal code.',
  'search.stores': 'Stores to compare',
  'search.popular': 'Popular:',
  'search.searching': 'Searching...',
  'search.comparison': 'Comparison',
  'search.perUnit': 'per {unit}',
  'search.addToList': 'Add to list',
  'search.inList': 'In list',
  'search.best': 'Cheapest',
  'search.tie': 'Tied cheapest',
  'search.diff': '+{amount}/{unit} (+{pct})',
  'search.notAvailable': 'Not available',
  'search.ref': 'ref. {place}',
  'search.byStore': 'By store',
  'search.sortBy': 'Sort by',
  'search.sort.unit_price': 'Unit price',
  'search.sort.price': 'Price',
  'search.sort.relevance': 'Relevance',
  'search.products': '{n} products',
  'search.notServed': 'Does not deliver to this postal code.',
  'search.unavailable': 'Store temporarily unavailable.',
  'search.retry': 'Retry',
  'search.reference': 'Does not deliver to {place}. Reference prices from {reference}, ≈ {km} km away.',
  'search.stale': 'Cached prices from {date}',
  'search.cheapest': 'Cheapest per {unit}',
  'search.trend': '{amount} since {date}',
  'search.priceDown': 'Price down',
  'search.priceUp': 'Price up',
  'search.noProducts': 'No products found.',
  'search.showAll': 'Show all ({n})',
  'search.showLess': 'Show less',
  'search.packHint': 'Approximate pack size, worked out from its price per unit',

  'error.network': 'Could not reach the server.',

  'product.back': 'Back',
  'product.loading': 'Loading...',
  'product.checked': 'Checked {date}',
  'product.history': 'Price history',
  'product.since': 'Since',
  'product.price': 'Price',
  'product.unitPrice': 'Unit price',
  'product.noHistory': 'No history yet.',
  'product.change': 'Change',
  'product.first': 'First price',
  'product.min': 'Lowest',
  'product.max': 'Highest',
  'product.avg': 'Average',
  'product.changes': 'Price changes',
  'product.lastChange': 'Last change',
  'product.noChanges': 'None yet',
  'product.today': 'Today',
  'product.yesterday': 'Yesterday',
  'product.daysAgo': '{n} days ago',

  'chart.summary': 'Price history: {n} prices, from {min} to {max}',
  'chart.today': 'Today',
  'chart.stable': 'Stable price since {date}.',

  'list.title': 'Shopping list',
  'list.clear': 'Clear list',
  'list.clearConfirm': 'Remove every item from your list?',
  'list.decrease': 'Less {label}',
  'list.increase': 'More {label}',
  'list.removeItem': 'Remove {label}',
  'list.sameEverywhere': 'It costs the same in any store: {total}',
  'list.byStore': 'Total per store',
  'list.combinations': 'Store combinations',
  'list.showAll': 'Show all ({n})',
  'list.refreshing': 'Updating prices...',
  'list.refreshFailed': '{n} prices could not be updated; showing the last saved ones.',
  'list.empty': 'Your list is empty. Search for a product and press the cart on a comparison or on any store\'s product.',
  'list.packs': 'packs',
  'list.pack': 'pack',
  'list.remove': 'Remove',
  'list.pricesFrom': 'Prices from {date} · {postalCode}',
  'list.yourPick': 'your pick',
  'list.equivalent': 'equivalent',
  'list.whereToBuy': 'Where to buy',
  'list.cheapest': 'Cheapest:',
  'list.saves': 'Saves {amount} vs only {stores}',
  'list.noPlan': 'No combination of stores has every item of your list.',
  'list.only': 'Only {stores}',
  'list.missingItems': '{n} not offered',
};

type Key = keyof typeof EN;

const ES: Record<Key, string> = {
  'nav.list': 'Lista de la compra',
  'nav.items': '{n} artículos',
  'nav.language': 'Idioma',
  'nav.toDark': 'Cambiar a tema oscuro',
  'nav.toLight': 'Cambiar a tema claro',
  'footer.geonames': 'Coordenadas de códigos postales de',
  'footer.developedBy': 'Desarrollado por',

  'search.title': 'Compara precios de supermercados',
  'search.product': 'Producto',
  'search.productPlaceholder': 'Producto (p. ej. leche)',
  'search.place': 'Localidad o código postal',
  'search.clear': 'Borrar producto',
  'search.submit': 'Buscar',
  'search.invalidPlace': 'Elige una localidad de la lista o escribe un código postal de 5 cifras.',
  'search.stores': 'Supermercados a comparar',
  'search.popular': 'Populares:',
  'search.searching': 'Buscando...',
  'search.comparison': 'Comparativa',
  'search.perUnit': 'por {unit}',
  'search.addToList': 'Añadir a la lista',
  'search.inList': 'En la lista',
  'search.best': 'Más barato',
  'search.tie': 'Empate más barato',
  'search.diff': '+{amount}/{unit} (+{pct})',
  'search.notAvailable': 'No disponible',
  'search.ref': 'ref. {place}',
  'search.byStore': 'Por supermercado',
  'search.sortBy': 'Ordenar por',
  'search.sort.unit_price': 'Precio por unidad',
  'search.sort.price': 'Precio',
  'search.sort.relevance': 'Relevancia',
  'search.products': '{n} productos',
  'search.notServed': 'No reparte en este código postal.',
  'search.unavailable': 'Supermercado no disponible temporalmente.',
  'search.retry': 'Reintentar',
  'search.reference': 'No reparte en {place}. Precios de referencia de {reference}, a ≈ {km} km.',
  'search.stale': 'Precios guardados del {date}',
  'search.cheapest': 'Más barato por {unit}',
  'search.trend': '{amount} desde el {date}',
  'search.priceDown': 'Bajada de precio',
  'search.priceUp': 'Subida de precio',
  'search.noProducts': 'No se han encontrado productos.',
  'search.showAll': 'Ver todos ({n})',
  'search.showLess': 'Ver menos',
  'search.packHint': 'Tamaño aproximado del envase, calculado a partir del precio por unidad',

  'error.network': 'No se ha podido conectar con el servidor.',

  'product.back': 'Volver',
  'product.loading': 'Cargando...',
  'product.checked': 'Consultado el {date}',
  'product.history': 'Histórico de precios',
  'product.since': 'Desde',
  'product.price': 'Precio',
  'product.unitPrice': 'Precio por unidad',
  'product.noHistory': 'Todavía no hay histórico.',
  'product.change': 'Cambio',
  'product.first': 'Primer precio',
  'product.min': 'Mínimo',
  'product.max': 'Máximo',
  'product.avg': 'Medio',
  'product.changes': 'Cambios de precio',
  'product.lastChange': 'Último cambio',
  'product.noChanges': 'Ninguno aún',
  'product.today': 'Hoy',
  'product.yesterday': 'Ayer',
  'product.daysAgo': 'Hace {n} días',

  'chart.summary': 'Histórico de precios: {n} precios, de {min} a {max}',
  'chart.today': 'Hoy',
  'chart.stable': 'Precio estable desde el {date}.',

  'list.title': 'Lista de la compra',
  'list.clear': 'Vaciar lista',
  'list.clearConfirm': '¿Quitar todos los artículos de la lista?',
  'list.decrease': 'Menos {label}',
  'list.increase': 'Más {label}',
  'list.removeItem': 'Quitar {label}',
  'list.sameEverywhere': 'Te cuesta lo mismo en cualquier súper: {total}',
  'list.byStore': 'Total por súper',
  'list.combinations': 'Combinaciones de súpers',
  'list.showAll': 'Ver todas ({n})',
  'list.refreshing': 'Actualizando precios...',
  'list.refreshFailed': 'No se han podido actualizar {n} precios; se muestran los últimos guardados.',
  'list.empty': 'Tu lista está vacía. Busca un producto y pulsa el carrito en una comparativa o en el producto de cualquier supermercado.',
  'list.packs': 'envases',
  'list.pack': 'envase',
  'list.remove': 'Quitar',
  'list.pricesFrom': 'Precios del {date} · CP {postalCode}',
  'list.yourPick': 'tu elección',
  'list.equivalent': 'equivalente',
  'list.whereToBuy': 'Dónde comprar',
  'list.cheapest': 'Más barato:',
  'list.saves': 'Ahorras {amount} frente a solo {stores}',
  'list.noPlan': 'Ninguna combinación de supermercados tiene todos los artículos de tu lista.',
  'list.only': 'Solo {stores}',
  'list.missingItems': '{n} sin oferta',
};

const MESSAGES: Record<Lang, Record<Key, string>> = { en: EN, es: ES };
const KEY = 'pt.lang';

/** The browser's language when it is Spanish, else English */
function initialLang(): Lang {
  const saved = load<Lang>(KEY);
  if (saved === 'en' || saved === 'es') return saved;
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en';
}

/** UI language, switchable at runtime and remembered in this browser */
@Injectable({ providedIn: 'root' })
export class I18n {
  readonly lang = signal<Lang>(initialLang());
  /** Locale for prices and dates */
  readonly locale = computed(() => (this.lang() === 'es' ? 'es' : 'en-US'));

  constructor() {
    effect(() => {
      save(KEY, this.lang());
      document.documentElement.lang = this.lang();
    });
  }

  /** Euros in the current language: "€4.86" or "4,86 €" */
  readonly money = (value: number): string => formatCurrency(value, this.locale(), '€', 'EUR');

  /** 1.5 → "1.5" or "1,5" */
  readonly number = (value: number): string => formatNumber(value, this.locale(), '1.0-2');

  /** 0.21 → "21%" or "21 %" */
  readonly percent = (value: number): string => formatPercent(value, this.locale(), '1.0-0');

  readonly date = (value: string | null, format: string): string => (value ? formatDate(value, format, this.locale()) : '');

  /** Message for [key] in the current language, with {name} placeholders filled from [params] */
  readonly t = (key: Key, params: Record<string, string | number | null | undefined> = {}): string =>
    MESSAGES[this.lang()][key].replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? ''));
}
