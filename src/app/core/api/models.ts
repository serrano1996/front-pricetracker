// Backend contracts of PriceTracker's API: snake_case, decimals arrive as numbers

export type StoreStatus = 'ok' | 'not_served' | 'unavailable';

export interface SearchProduct {
  id: string;
  external_id: string;
  name: string;
  price: number;
  price_format: string | null;
  unit_price: number | null;
  unit_price_unit: string | null;
  image_url: string | null;
  category: string | null;
  /** Product type, the key to its equivalents in `comparison`; null when none matched */
  type: string | null;
  /** Price before the last change and when the current price started; null until the price has changed */
  previous_price: number | null;
  price_changed_at: string | null;
}

export interface StoreResult {
  store: string;
  status: StoreStatus;
  stale: boolean;
  fetched_at: string | null;
  products: SearchProduct[];
  /** Set when the store does not serve the searched postal code and prices come from the nearest one it does */
  reference_postal_code: string | null;
  reference_distance_km: number | null;
}

export interface Offer {
  store: string;
  product_id: string;
  name: string;
  unit_price: number;
  price: number;
}

export interface Comparison {
  type: string;
  unit: string;
  offers: Offer[];
}

export interface SearchResponse {
  term: string;
  postal_code: string;
  stores: StoreResult[];
  comparison: Comparison[];
}

export interface HistoryProduct {
  id: string;
  store: string;
  external_id: string;
  name: string;
  current_price: number;
  price_format: string | null;
  unit_price: number | null;
  unit_price_unit: string | null;
  image_url: string | null;
  category: string | null;
  last_checked_at: string;
}

export interface PricePoint {
  price: number;
  unit_price: number | null;
  recorded_at: string;
}

export interface PriceHistoryResponse {
  product: HistoryProduct;
  history: PricePoint[];
}
