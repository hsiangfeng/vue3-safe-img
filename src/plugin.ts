import type { App } from 'vue'
import type { PluginOptions } from './types'
import { mergeOptions } from './core/options'
import { createCache } from './core/cache'
import { createDirective } from './directive'
import { OPTIONS_KEY, CACHE_KEY } from './context'
import SafeImg from './component.vue'

const VueSafeImg = {
  install(app: App, userOptions: Partial<PluginOptions> = {}) {
    const options = mergeOptions(userOptions)
    const cache = createCache(options.cacheSize)

    app.provide(OPTIONS_KEY, options)
    app.provide(CACHE_KEY, cache)
    app.directive('safe-img', createDirective(() => options, cache))
    app.component('SafeImg', SafeImg)
  },
}

export default VueSafeImg
