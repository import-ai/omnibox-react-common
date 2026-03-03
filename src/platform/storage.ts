/**
 * Platform-agnostic storage interface
 * Implementations should provide platform-specific storage (localStorage, AsyncStorage, etc.)
 */

export interface StorageProvider {
  /**
   * Get an item from storage
   * @param key - The storage key
   * @returns The stored value or null if not found
   */
  getItem(key: string): string | null | Promise<string | null>;

  /**
   * Set an item in storage
   * @param key - The storage key
   * @param value - The value to store
   */
  setItem(key: string, value: string): void | Promise<void>;

  /**
   * Remove an item from storage
   * @param key - The storage key
   */
  removeItem(key: string): void | Promise<void>;
}

/**
 * Simple in-memory storage implementation
 * Useful for testing or environments without persistent storage
 */
export class MemoryStorage implements StorageProvider {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }
}
