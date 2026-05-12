import type { InjectionKey } from 'vue'
import { inject } from 'vue'
import type { PluginOptions } from './types'
import { DEFAULT_OPTIONS } from './core/options'
import { createCache, type FailedCache } from './core/cache'

export const OPTIONS_KEY: InjectionKey<PluginOptions> = Symbol('vsi-options')
export const CACHE_KEY: InjectionKey<FailedCache> = Symbol('vsi-cache')

// 沒走 install 流程時的退路
const fallbackCache = createCache(0)

export function injectOptions(): PluginOptions {
  return inject(OPTIONS_KEY, DEFAULT_OPTIONS)
}

export function injectCache(): FailedCache {
  return inject(CACHE_KEY, fallbackCache)
}
