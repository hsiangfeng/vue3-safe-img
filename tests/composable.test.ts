import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import VueSafeImg from '../src/plugin'
import { useSafeImg } from '../src/composable'
import type { ErrorInfo } from '../src/types'

class MockImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  private _src = ''
  get src() {
    return this._src
  }
  set src(value: string) {
    this._src = value
    setTimeout(() => {
      if (value.includes('fail')) this.onerror?.()
      else this.onload?.()
    }, 0)
  }
}

const originalImage = globalThis.Image

beforeEach(() => {
  globalThis.Image = MockImage as unknown as typeof Image
})

afterEach(() => {
  globalThis.Image = originalImage
})

const settle = (ms = 20) => new Promise((r) => setTimeout(r, ms))

/**
 * 包一個最小 component 把 composable 的 ref 暴露出來供測試讀取。
 */
function harness(setupFn: () => unknown) {
  return defineComponent({
    setup() {
      const exposed = setupFn() as Record<string, unknown>
      return () => h('div', JSON.stringify(exposed))
    },
  })
}

describe('useSafeImg', () => {
  it('loads a plain string source to loaded status', async () => {
    let api: ReturnType<typeof useSafeImg> | undefined
    const Wrapper = harness(() => {
      api = useSafeImg('cover.jpg')
      return api
    })
    mount(Wrapper, { global: { plugins: [[VueSafeImg, {}]] } })
    await settle()
    await flushPromises()
    expect(api!.currentSrc.value).toBe('cover.jpg')
    expect(api!.status.value).toBe('loaded')
  })

  it('reacts to ref source change and reloads', async () => {
    const src = ref('first.jpg')
    let api: ReturnType<typeof useSafeImg> | undefined
    const Wrapper = harness(() => {
      api = useSafeImg(src)
      return api
    })
    mount(Wrapper, { global: { plugins: [[VueSafeImg, {}]] } })
    await settle()
    await flushPromises()
    expect(api!.currentSrc.value).toBe('first.jpg')

    src.value = 'second.jpg'
    await settle()
    await flushPromises()
    expect(api!.currentSrc.value).toBe('second.jpg')
    expect(api!.status.value).toBe('loaded')
  })

  it('falls back when main src fails, reports fallback status', async () => {
    let api: ReturnType<typeof useSafeImg> | undefined
    const Wrapper = harness(() => {
      api = useSafeImg('fail.jpg', { fallback: 'default.jpg', retry: 0 })
      return api
    })
    mount(Wrapper, { global: { plugins: [[VueSafeImg, {}]] } })
    await settle()
    await flushPromises()
    expect(api!.currentSrc.value).toBe('default.jpg')
    expect(api!.status.value).toBe('fallback')
  })

  it('calls per-instance onError once on failure', async () => {
    const onError = vi.fn<(info: ErrorInfo) => void>()
    const Wrapper = harness(() => useSafeImg('fail.jpg', { fallback: 'default.jpg', retry: 0, onError }))
    mount(Wrapper, { global: { plugins: [[VueSafeImg, {}]] } })
    await settle()
    await flushPromises()
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError.mock.calls[0][0]).toMatchObject({
      src: 'fail.jpg',
      fallbackUsed: 'default.jpg',
    })
  })

  it('retry() removes the src from failure cache and reloads', async () => {
    let api: ReturnType<typeof useSafeImg> | undefined
    const Wrapper = harness(() => {
      api = useSafeImg('fail.jpg', { fallback: 'default.jpg', retry: 0 })
      return api
    })
    mount(Wrapper, { global: { plugins: [[VueSafeImg, {}]] } })
    await settle()
    await flushPromises()
    expect(api!.status.value).toBe('fallback')

    // 切換 mock 行為：fail.jpg 這次會成功
    class NowOk {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_v: string) {
        setTimeout(() => this.onload?.(), 0)
      }
    }
    globalThis.Image = NowOk as unknown as typeof Image

    api!.retry()
    await settle()
    await flushPromises()
    expect(api!.currentSrc.value).toBe('fail.jpg')
    expect(api!.status.value).toBe('loaded')
  })

  it('emits error status when every fallback also fails', async () => {
    let api: ReturnType<typeof useSafeImg> | undefined
    const Wrapper = harness(() => {
      api = useSafeImg('fail-a.jpg', { fallback: ['fail-b.jpg'], retry: 0 })
      return api
    })
    mount(
      Wrapper,
      {
        global: { plugins: [[VueSafeImg, { defaultSrc: 'fail-c.jpg' }]] },
      },
    )
    await settle()
    await flushPromises()
    expect(api!.status.value).toBe('error')
  })

  it('works without plugin installed (falls back to defaults)', async () => {
    let api: ReturnType<typeof useSafeImg> | undefined
    const Wrapper = harness(() => {
      api = useSafeImg('cover.jpg')
      return api
    })
    mount(Wrapper) // 不裝 plugin
    await settle()
    await flushPromises()
    expect(api!.status.value).toBe('loaded')
    expect(api!.currentSrc.value).toBe('cover.jpg')
  })

  it('warns and skips load when source is empty', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const Wrapper = harness(() => useSafeImg(''))
    mount(Wrapper, { global: { plugins: [[VueSafeImg, {}]] } })
    await settle()
    await flushPromises()
    expect(warn).toHaveBeenCalled()
    expect((warn.mock.calls[0][0] as string)).toMatch(/source is empty/)
    warn.mockRestore()
  })

  it('cancels in-flight load on unmount', async () => {
    let api: ReturnType<typeof useSafeImg> | undefined
    const Wrapper = harness(() => {
      api = useSafeImg('cover.jpg')
      return api
    })
    const wrapper = mount(Wrapper, { global: { plugins: [[VueSafeImg, {}]] } })
    wrapper.unmount()
    await settle()
    // 沒有 throw、沒有 unhandled error 即視為成功
    expect(api!.status.value).toBe('loading')
  })
})
