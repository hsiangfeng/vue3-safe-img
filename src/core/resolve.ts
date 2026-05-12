import type { PluginOptions, ResolvedConfig, SourceInput } from '../types'

/**
 * 把字串簡寫或物件正規化成 ResolvedConfig，多重 fallback 統一成陣列。
 */
export function resolveValue(
  input: SourceInput,
  globals: PluginOptions,
): ResolvedConfig {
  if (typeof input === 'string') {
    return {
      src: input,
      fallbacks: [globals.defaultSrc],
      placeholder: globals.placeholder,
      retry: globals.retry,
      retryDelay: globals.retryDelay,
      lazy: globals.lazy,
      onError: globals.onError,
    }
  }

  const userFallbacks = input.fallback
    ? Array.isArray(input.fallback)
      ? input.fallback
      : [input.fallback]
    : []

  return {
    src: input.src,
    fallbacks: [...userFallbacks, globals.defaultSrc],
    placeholder: input.placeholder ?? globals.placeholder,
    retry: input.retry ?? globals.retry,
    retryDelay: globals.retryDelay,
    lazy: globals.lazy,
    onError: input.onError ?? globals.onError,
  }
}
