import { describe, it, expect } from 'vitest'
import { createApp, defineComponent, h } from 'vue'
import VueSafeImg from '../src/plugin'
import { injectOptions, injectCache } from '../src/context'
import { DEFAULT_OPTIONS } from '../src/core/options'

describe('VueSafeImg plugin install', () => {
  it('merges user options with defaults and provides them', () => {
    let observed: ReturnType<typeof injectOptions> | undefined
    const Probe = defineComponent({
      setup() {
        observed = injectOptions()
        return () => h('div')
      },
    })
    const app = createApp(Probe)
    app.use(VueSafeImg, { retry: 7 })
    const root = document.createElement('div')
    app.mount(root)

    expect(observed?.retry).toBe(7)
    expect(observed?.retryDelay).toBe(DEFAULT_OPTIONS.retryDelay)
    app.unmount()
  })

  it('provides a cache instance', () => {
    let cache: ReturnType<typeof injectCache> | undefined
    const Probe = defineComponent({
      setup() {
        cache = injectCache()
        return () => h('div')
      },
    })
    const app = createApp(Probe)
    app.use(VueSafeImg, { cacheSize: 5 })
    const root = document.createElement('div')
    app.mount(root)

    expect(cache).toBeDefined()
    expect(typeof cache!.has).toBe('function')
    expect(typeof cache!.add).toBe('function')
    expect(typeof cache!.delete).toBe('function')
    expect(typeof cache!.clear).toBe('function')
    app.unmount()
  })

  it('registers the v-safe-img directive globally', () => {
    const app = createApp({ render: () => null })
    app.use(VueSafeImg)
    expect(app.directive('safe-img')).toBeDefined()
  })

  it('registers the SafeImg component globally', () => {
    const app = createApp({ render: () => null })
    app.use(VueSafeImg)
    expect(app.component('SafeImg')).toBeDefined()
  })

  it('uses empty options when none provided', () => {
    let observed: ReturnType<typeof injectOptions> | undefined
    const Probe = defineComponent({
      setup() {
        observed = injectOptions()
        return () => h('div')
      },
    })
    const app = createApp(Probe)
    app.use(VueSafeImg) // 不傳任何 options
    const root = document.createElement('div')
    app.mount(root)
    expect(observed).toEqual(DEFAULT_OPTIONS)
    app.unmount()
  })

  it('each app instance gets its own cache (no cross-app leakage)', () => {
    let cacheA: ReturnType<typeof injectCache> | undefined
    let cacheB: ReturnType<typeof injectCache> | undefined
    const Probe = (assign: (c: ReturnType<typeof injectCache>) => void) =>
      defineComponent({
        setup() {
          assign(injectCache())
          return () => h('div')
        },
      })

    const appA = createApp(Probe((c) => (cacheA = c)))
    appA.use(VueSafeImg)
    appA.mount(document.createElement('div'))

    const appB = createApp(Probe((c) => (cacheB = c)))
    appB.use(VueSafeImg)
    appB.mount(document.createElement('div'))

    cacheA!.add('shared-url')
    expect(cacheB!.has('shared-url')).toBe(false)

    appA.unmount()
    appB.unmount()
  })
})

describe('context inject defaults (no plugin installed)', () => {
  it('injectOptions falls back to DEFAULT_OPTIONS', () => {
    let observed: ReturnType<typeof injectOptions> | undefined
    const Probe = defineComponent({
      setup() {
        observed = injectOptions()
        return () => h('div')
      },
    })
    const app = createApp(Probe)
    const root = document.createElement('div')
    app.mount(root)
    expect(observed).toEqual(DEFAULT_OPTIONS)
    app.unmount()
  })

  it('injectCache falls back to a disabled cache', () => {
    let cache: ReturnType<typeof injectCache> | undefined
    const Probe = defineComponent({
      setup() {
        cache = injectCache()
        return () => h('div')
      },
    })
    const app = createApp(Probe)
    const root = document.createElement('div')
    app.mount(root)

    cache!.add('x')
    expect(cache!.has('x')).toBe(false) // capacity 0 disabled
    app.unmount()
  })
})
