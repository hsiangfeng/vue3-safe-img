/** 主圖最終失敗時傳給 onError 的資料。 */
export interface ErrorInfo {
  /** 失敗的主圖 URL */
  src: string
  /** 實際嘗試載入次數，包含第一次 */
  attempts: number
  /** 最終切換到的 fallback */
  fallbackUsed: string
  /** 對應的 `<img>` 元素，僅 directive 模式會帶 */
  element?: HTMLImageElement
}

/** Plugin install 接受的全域選項。 */
export interface PluginOptions {
  /** 全域 fallback；未設定時使用套件內建 SVG */
  defaultSrc: string
  /** 載入中的 placeholder（dataURL 或 hex 字串） */
  placeholder?: string
  /** 主圖失敗時的重試次數，0 為不重試 */
  retry: number
  /** 重試之間的等待毫秒數 */
  retryDelay: number
  /** 是否啟用原生 lazy loading */
  lazy: boolean
  /** 失敗 URL 的 LRU 快取容量，0 為停用 */
  cacheSize: number
  /** 主圖最終失敗時觸發 */
  onError?: (info: ErrorInfo) => void
}

/** directive / composable 接受的來源：字串簡寫或物件帶 per-instance 覆寫。 */
export type SourceInput =
  | string
  | {
      src: string
      fallback?: string | string[]
      placeholder?: string
      retry?: number
      onError?: (info: ErrorInfo) => void
    }

/** resolveValue 之後的標準化設定（內部使用）。 */
export interface ResolvedConfig {
  src: string
  fallbacks: string[]
  placeholder?: string
  retry: number
  retryDelay: number
  lazy: boolean
  onError?: (info: ErrorInfo) => void
}
