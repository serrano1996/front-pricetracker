import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HistoryProduct, PriceHistoryResponse, SearchResponse } from './models';

// shortcut: hardcoded backend URL, move to environment files when deploying
const API_URL = 'http://localhost:8080/api/v1';

@Injectable({ providedIn: 'root' })
export class PriceTrackerApi {
  private readonly http = inject(HttpClient);

  /** [stores] limits which supermarkets are searched; all when omitted */
  search(term: string, postalCode: string, stores?: string[]): Observable<SearchResponse> {
    let params = new HttpParams().set('term', term).set('postal_code', postalCode);
    if (stores) params = params.set('stores', stores.join(','));
    return this.http.get<SearchResponse>(`${API_URL}/search`, { params });
  }

  /** Most searched terms lately, for suggestions */
  popularSearches(): Observable<{ terms: string[] }> {
    return this.http.get<{ terms: string[] }>(`${API_URL}/searches/popular`);
  }

  /** Current data of several products in one call; unknown ids are left out */
  products(ids: string[]): Observable<{ products: HistoryProduct[] }> {
    return this.http.get<{ products: HistoryProduct[] }>(`${API_URL}/products`, { params: { ids: ids.join(',') } });
  }

  priceHistory(productId: string): Observable<PriceHistoryResponse> {
    return this.http.get<PriceHistoryResponse>(`${API_URL}/products/${productId}/price-history`);
  }
}

/** Backend errors come as {"detail": "..."}; null when there is none, e.g. the server could not be reached. */
export function errorMessage(error: unknown): string | null {
  return (error as { error?: { detail?: string } })?.error?.detail ?? null;
}
