export interface FailedCache {
  has(url: string): boolean
  add(url: string): void
  delete(url: string): void
  clear(): void
}

/** 建立 LRU 失敗 URL 快取。capacity 為 0 時整個停用。 */
export function createCache(capacity: number): FailedCache {
  const store = new Map<string, true>()
  const enabled = capacity > 0

  return {
    has(url) {
      if (!enabled) return false
      const hit = store.has(url)
      if (hit) {
        // 命中後挪到最後，模擬 LRU
        store.delete(url)
        store.set(url, true)
      }
      return hit
    },
    add(url) {
      if (!enabled) return
      if (store.has(url)) store.delete(url)
      store.set(url, true)
      if (store.size > capacity) {
        const oldest = store.keys().next().value
        if (oldest !== undefined) store.delete(oldest)
      }
    },
    delete(url) {
      store.delete(url)
    },
    clear() {
      store.clear()
    },
  }
}
