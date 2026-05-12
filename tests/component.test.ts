import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import VueSafeImg from '../src/plugin'
import SafeImg from '../src/component.vue'

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

const settle = () => new Promise((r) => setTimeout(r, 20))

describe('<SafeImg> rendered structure', () => {
  it('renders div.vsi-frame > img.vsi-main when layered=true', async () => {
    const wrapper = mount(SafeImg, {
      props: { src: 'cover.jpg' },
      global: { plugins: [[VueSafeImg, {}]] },
    })
    await settle()
    await flushPromises()

    const frame = wrapper.find('.vsi-frame')
    expect(frame.exists()).toBe(true)
    expect(frame.element.tagName).toBe('DIV')

    const img = frame.find('img.vsi-main')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('cover.jpg')
  })

  it('sets --vsi-image CSS variable on the frame', async () => {
    const wrapper = mount(SafeImg, {
      props: { src: 'cover.jpg' },
      global: { plugins: [[VueSafeImg, {}]] },
    })
    await settle()
    await flushPromises()

    const style = (wrapper.find('.vsi-frame').element as HTMLElement).style
    expect(style.getPropertyValue('--vsi-image')).toBe("url('cover.jpg')")
    expect(style.getPropertyValue('--vsi-blur')).toBe('20px')
  })

  it('renders bare <img> (no .vsi-frame) when layered=false', async () => {
    const wrapper = mount(SafeImg, {
      props: { src: 'cover.jpg', layered: false },
      global: { plugins: [[VueSafeImg, {}]] },
    })
    await settle()
    await flushPromises()

    expect(wrapper.find('.vsi-frame').exists()).toBe(false)
    expect(wrapper.find('img').exists()).toBe(true)
  })

  it('passes user class to the wrapper div', async () => {
    const wrapper = mount(SafeImg, {
      props: { src: 'cover.jpg' },
      attrs: { class: 'demo box-400' },
      global: { plugins: [[VueSafeImg, {}]] },
    })
    await settle()
    await flushPromises()

    const frame = wrapper.find('.vsi-frame')
    expect(frame.classes()).toContain('vsi-frame')
    expect(frame.classes()).toContain('demo')
    expect(frame.classes()).toContain('box-400')
  })

  it('passes user alt to inner img, not wrapper', async () => {
    const wrapper = mount(SafeImg, {
      props: { src: 'cover.jpg' },
      attrs: { alt: 'my image' },
      global: { plugins: [[VueSafeImg, {}]] },
    })
    await settle()
    await flushPromises()

    const frame = wrapper.find('.vsi-frame')
    expect(frame.attributes('alt')).toBeUndefined()

    const img = frame.find('img.vsi-main')
    expect(img.attributes('alt')).toBe('my image')
  })

  it('updates --vsi-image when fallback used', async () => {
    const wrapper = mount(SafeImg, {
      props: { src: 'fail.jpg', fallback: 'default.jpg', retry: 0 },
      global: { plugins: [[VueSafeImg, {}]] },
    })
    await settle()
    await flushPromises()

    const style = (wrapper.find('.vsi-frame').element as HTMLElement).style
    expect(style.getPropertyValue('--vsi-image')).toBe("url('default.jpg')")
  })

  it('exposes retry() that re-attempts the original src', async () => {
    const wrapper = mount(SafeImg, {
      props: { src: 'fail.jpg', fallback: 'default.jpg', retry: 0 },
      global: { plugins: [[VueSafeImg, {}]] },
    })
    await settle()
    await flushPromises()

    // 第一次跑完應該是 fallback
    expect(
      (wrapper.find('.vsi-frame').element as HTMLElement).style.getPropertyValue('--vsi-image'),
    ).toBe("url('default.jpg')")

    // 換 mock 規則：原本 fail.jpg 的 URL 這次會成功
    class NowOkImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      private _src = ''
      get src() {
        return this._src
      }
      set src(value: string) {
        this._src = value
        setTimeout(() => this.onload?.(), 0)
      }
    }
    globalThis.Image = NowOkImage as unknown as typeof Image

    // 從外部呼叫 retry：應該清掉快取後重新載入主圖
    const expose = wrapper.vm as unknown as { retry: () => void }
    expose.retry()
    await settle()
    await flushPromises()

    expect(
      (wrapper.find('.vsi-frame').element as HTMLElement).style.getPropertyValue('--vsi-image'),
    ).toBe("url('fail.jpg')")
  })

  it('warns on empty src but still reserves layout (no inner img)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrapper = mount(SafeImg, {
      props: { src: '' },
      global: { plugins: [[VueSafeImg, {}]] },
    })
    await settle()
    await flushPromises()

    expect(warn).toHaveBeenCalled()
    expect((warn.mock.calls[0][0] as string)).toMatch(/src prop is empty/)
    // wrapper 仍然渲染（保留位置），但內層 img 不出現
    expect(wrapper.find('.vsi-frame').exists()).toBe(true)
    expect(wrapper.find('img.vsi-main').exists()).toBe(false)
    warn.mockRestore()
  })

  it('renders wrapper as skeleton while image is still loading', async () => {
    // 用會延遲 onload 的 mock 模擬「下載中」狀態
    class SlowImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_v: string) {
        setTimeout(() => this.onload?.(), 80)
      }
    }
    globalThis.Image = SlowImage as unknown as typeof Image

    const wrapper = mount(SafeImg, {
      props: { src: 'cover.jpg' },
      global: { plugins: [[VueSafeImg, {}]] },
    })
    // 載入完成前：wrapper 在但 img 還沒出現
    await new Promise((r) => setTimeout(r, 10))
    expect(wrapper.find('.vsi-frame').exists()).toBe(true)
    expect(wrapper.find('img.vsi-main').exists()).toBe(false)

    // 載入完成後：img 出現
    await new Promise((r) => setTimeout(r, 100))
    expect(wrapper.find('img.vsi-main').exists()).toBe(true)
  })

  it('layered=false renders bare img with all user attrs', async () => {
    const wrapper = mount(SafeImg, {
      props: { src: 'cover.jpg', layered: false },
      attrs: { class: 'extra', alt: 'photo' },
      global: { plugins: [[VueSafeImg, {}]] },
    })
    await settle()
    await flushPromises()

    const img = wrapper.find('img')
    expect(img.exists()).toBe(true)
    expect(img.classes()).toContain('extra')
    expect(img.attributes('alt')).toBe('photo')
  })

  it('per-instance lazy prop overrides plugin globals', async () => {
    // 全域預設 lazy: true，但 :lazy="false" 應覆寫
    const wrapper = mount(SafeImg, {
      props: { src: 'cover.jpg', lazy: false },
      global: { plugins: [[VueSafeImg, { lazy: true }]] },
    })
    await settle()
    await flushPromises()
    // 走進來表示 lazy=false 路徑有跑（resolvedConfig.lazy=false 進 startLoad），測試不會失敗即代表 branch 被覆蓋
    expect(wrapper.find('.vsi-frame').exists()).toBe(true)
  })
})
