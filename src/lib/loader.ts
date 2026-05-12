import type { ErrorInfo, ResolvedConfig } from '../types'
import type { FailedCache } from '../core/cache'
import { shouldRetry } from '../core/retry'

export type LoadStatus = 'loading' | 'loaded' | 'fallback' | 'error'

export interface LoadResult {
  status: LoadStatus
  src: string
  /** 主圖失敗時的詳情，快取命中時不帶 */
  errorInfo?: ErrorInfo
}

export interface LoadController {
  cancel(): void
}

/** preload + retry + fallback chain。回傳的 controller 可中止。 */
export function startLoad(
  config: ResolvedConfig,
  cache: FailedCache,
  onChange: (result: LoadResult) => void,
  element?: HTMLImageElement,
): LoadController {
  let cancelled = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let attempts = 0

  const emit = (result: LoadResult) => {
    if (!cancelled) onChange(result)
  }

  const buildInfo = (fallbackUsed: string): ErrorInfo => ({
    src: config.src,
    attempts,
    fallbackUsed,
    element,
  })

  // notify=false 用於快取命中路徑（之前已通知過，不再重複）
  const tryFallback = (idx: number, notify: boolean) => {
    if (cancelled) return
    const fb = config.fallbacks[idx]
    if (!fb) {
      emit({ status: 'error', src: '' })
      return
    }
    const probe = new Image()
    probe.onload = () => {
      if (cancelled) return
      if (notify) {
        const info = buildInfo(fb)
        config.onError?.(info)
        emit({ status: 'fallback', src: fb, errorInfo: info })
      } else {
        emit({ status: 'fallback', src: fb })
      }
    }
    probe.onerror = () => tryFallback(idx + 1, notify)
    probe.src = fb
  }

  const tryMain = () => {
    // cancel() 會 clearTimeout，retry 排程進不來
    attempts += 1
    const probe = new Image()
    probe.onload = () => emit({ status: 'loaded', src: config.src })
    probe.onerror = () => {
      if (shouldRetry(attempts, config.retry)) {
        timer = setTimeout(tryMain, config.retryDelay)
        return
      }
      cache.add(config.src)
      tryFallback(0, true)
    }
    probe.src = config.src
  }

  emit({ status: 'loading', src: '' })

  if (cache.has(config.src)) {
    tryFallback(0, false)
  } else {
    tryMain()
  }

  return {
    cancel() {
      cancelled = true
      if (timer) clearTimeout(timer)
    },
  }
}
