// localStorage can be blocked or full (private windows, cleared site data): never let it break the page

export function load<T>(key: string): T | null {
  try {
    const value = localStorage.getItem(key);
    return value === null ? null : (JSON.parse(value) as T);
  } catch {
    return null;
  }
}

/** null or undefined removes the key */
export function save(key: string, value: unknown): void {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Not saved: the app keeps working, it just forgets on reload
  }
}
