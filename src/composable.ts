import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import type { ErrorInfo, SourceInput } from './types'
import { resolveValue } from './core/resolve'
import { injectOptions, injectCache } from './context'
import { startLoad, type LoadController, type LoadStatus } from './lib/loader'

export type { LoadStatus }

export interface UseSafeImgOptions {
  fallback?: string | string[]
  placeholder?: string
  retry?: number
  onError?: (info: ErrorInfo) => void
}

/** 不想用 `<SafeImg>` 包裝、想自己組元件時用這個 composable。 */
export function useSafeImg(
  source: Ref<string> | string,
  options: UseSafeImgOptions = {},
) {
  const globals = injectOptions()
  const cache = injectCache()

  const currentSrc = ref<string>('')
  const status = ref<LoadStatus>('loading')

  const config = computed(() => {
    const src = typeof source === 'string' ? source : source.value
    const input: SourceInput = {
      src,
      fallback: options.fallback,
      placeholder: options.placeholder,
      retry: options.retry,
      onError: options.onError,
    }
    return resolveValue(input, globals)
  })

  let controller: LoadController | undefined

  const start = () => {
    controller?.cancel()
    currentSrc.value = config.value.placeholder ?? ''
    status.value = 'loading'
    if (!config.value.src) {
      console.warn('[vue3-safe-img] useSafeImg: source is empty')
      return
    }
    controller = startLoad(config.value, cache, (result) => {
      status.value = result.status
      if (result.status === 'loaded' || result.status === 'fallback') {
        currentSrc.value = result.src
      }
    })
  }

  /** 手動重試：先把當前 src 從失敗快取移除，再重新載入。 */
  const retry = () => {
    cache.delete(config.value.src)
    start()
  }

  onMounted(start)

  watch(() => config.value.src, start)

  onBeforeUnmount(() => controller?.cancel())

  return {
    currentSrc,
    status,
    retry,
  }
}
