import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of } from 'rxjs';

export interface Place {
  name: string;
  postalCode: string;
  province: string;
  /** Name without accents, lowercase, for matching */
  key: string;
}

const normalize = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

/**
 * Spanish towns with their postal codes, from GeoNames (CC BY 4.0): public/places.tsv, "name\tpostal code\tprovince".
 * shortcut: the whole list (~350 KB gzipped) loads once in the browser; move to a backend endpoint if it grows.
 */
@Injectable({ providedIn: 'root' })
export class Places {
  private readonly all = toSignal(
    inject(HttpClient)
      .get('places.tsv', { responseType: 'text' })
      .pipe(
        map((tsv) =>
          tsv
            .split('\n')
            .filter(Boolean)
            .map((line) => {
              const [name, postalCode, province] = line.split('\t');
              return { name, postalCode, province, key: normalize(name) };
            }),
        ),
        // Without the list, postal codes can still be typed
        catchError(() => of([] as Place[])),
      ),
    { initialValue: [] as Place[] },
  );

  private readonly byPostalCode = computed(() => {
    const places = new Map<string, Place>();
    for (const p of this.all()) if (!places.has(p.postalCode)) places.set(p.postalCode, p);
    return places;
  });

  /** "Tarazona (50500)", or the bare postal code when it is not in the list */
  label(postalCode: string): string {
    const place = this.byPostalCode().get(postalCode);
    return place ? `${place.name} (${postalCode})` : postalCode;
  }

  /** Towns whose name (accents and case ignored) or postal code starts with [query], then names containing it */
  search(query: string, limit = 8): Place[] {
    const q = normalize(query);
    if (q.length < 2) return [];
    if (/^\d+$/.test(q)) return this.all().filter((p) => p.postalCode.startsWith(q)).slice(0, limit);
    const starts = this.all().filter((p) => p.key.startsWith(q));
    const contains = starts.length < limit ? this.all().filter((p) => !p.key.startsWith(q) && p.key.includes(q)) : [];
    return [...starts, ...contains].slice(0, limit);
  }
}
