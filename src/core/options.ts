import type { PluginOptions } from '../types'
import { DEFAULT_IMAGE } from '../assets/default-svg'

export const DEFAULT_OPTIONS: PluginOptions = {
  defaultSrc: DEFAULT_IMAGE,
  placeholder: undefined,
  retry: 2,
  retryDelay: 500,
  lazy: true,
  cacheSize: 100,
  onError: undefined,
}

/**
 * 合併使用者選項與預設值，不變動入參。
 * @param user 使用者部分選項
 * @param defaults 預設值（測試時可注入）
 */
export function mergeOptions(
  user: Partial<PluginOptions> = {},
  defaults: PluginOptions = DEFAULT_OPTIONS,
): PluginOptions {
  return { ...defaults, ...user }
}
