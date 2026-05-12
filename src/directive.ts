import type { Directive } from 'vue'
import type { PluginOptions, SourceInput } from './types'
import type { FailedCache } from './core/cache'
import { resolveValue } from './core/resolve'
import { startLoad, type LoadController } from './lib/loader'

interface State {
  controller: LoadController
  src: string
  fallbackKey: string
}

const states = new WeakMap<HTMLImageElement, State>()

// 用 NUL 當分隔字元，URL 不可能含這個字元，避免「'a|b' 跟 ['a','b']」這種誤判
const FB_SEP = '\u0000'

const extractSrc = (value: SourceInput | undefined): string => {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (!value.src) return ''
  return value.src
}

const extractFallbackKey = (value: SourceInput | undefined): string => {
  if (!value || typeof value === 'string') return ''
  const fb = value.fallback
  if (!fb) return ''
  return Array.isArray(fb) ? fb.join(FB_SEP) : fb
}

/** 由 plugin install 注入當前選項與快取，回傳 v-safe-img directive。 */
export function createDirective(
  getOptions: () => PluginOptions,
  cache: FailedCache,
): Directive<HTMLImageElement, SourceInput> {
  const attach = (el: HTMLImageElement, value: SourceInput) => {
    const config = resolveValue(value, getOptions())

    if (!config.src) {
      console.warn('[vue3-safe-img] v-safe-img: empty src')
      return
    }

    // 明確覆寫，避免 update 時殘留上一次的設定
    el.loading = config.lazy ? 'lazy' : 'eager'
    if (config.placeholder) el.src = config.placeholder

    const controller = startLoad(
      config,
      cache,
      (result) => {
        if (result.status === 'loaded' || result.status === 'fallback') {
          if (result.status === 'fallback') {
            el.removeAttribute('srcset')
            el.removeAttribute('sizes')
          }
          el.src = result.src
        }
      },
      el,
    )

    states.set(el, {
      controller,
      src: extractSrc(value),
      fallbackKey: extractFallbackKey(value),
    })
  }

  const detach = (el: HTMLImageElement) => {
    states.get(el)?.controller.cancel()
    states.delete(el)
  }

  return {
    mounted(el, binding) {
      attach(el, binding.value)
    },
    updated(el, binding) {
      // 用值比較，父元件每次新建相同內容的物件不會觸發重綁
      const prev = states.get(el)
      const nextSrc = extractSrc(binding.value)
      const nextFbKey = extractFallbackKey(binding.value)
      if (prev && prev.src === nextSrc && prev.fallbackKey === nextFbKey) return
      detach(el)
      attach(el, binding.value)
    },
    unmounted(el) {
      detach(el)
    },
  }
}
