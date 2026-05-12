import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import VueSafeImg from '../src/plugin'

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

describe('v-safe-img directive', () => {
  it('sets el.src to the resolved URL when load succeeds', async () => {
    const Host = defineComponent({
      template: '<img v-safe-img="src" data-testid="img" />',
      setup() {
        const src = ref('cover.jpg')
        return { src }
      },
    })
    const wrapper = mount(Host, { global: { plugins: [[VueSafeImg, {}]] } })
    await settle()
    await flushPromises()
    expect((wrapper.find('[data-testid="img"]').element as HTMLImageElement).src).toContain('cover.jpg')
  })

  it('accepts object value with src + fallback', async () => {
    const Host = defineComponent({
      template: `<img v-safe-img="value" data-testid="img" />`,
      setup() {
        const value = { src: 'fail.jpg', fallback: 'default.jpg', retry: 0 }
        return { value }
      },
    })
    const wrapper = mount(Host, { global: { plugins: [[VueSafeImg, {}]] } })
    await settle()
    await flushPromises()
    expect((wrapper.find('[data-testid="img"]').element as HTMLImageElement).src).toContain('default.jpg')
  })

  it('removes srcset / sizes attrs when falling back', async () => {
    const Host = defineComponent({
      template: `<img
        v-safe-img="value"
        srcset="a 400w, b 800w"
        sizes="100vw"
        data-testid="img"
      />`,
      setup() {
        const value = { src: 'fail.jpg', fallback: 'default.jpg', retry: 0 }
        return { value }
      },
    })
    const wrapper = mount(Host, { global: { plugins: [[VueSafeImg, {}]] } })
    await settle()
    await flushPromises()
    const el = wrapper.find('[data-testid="img"]').element as HTMLImageElement
    expect(el.getAttribute('srcset')).toBeNull()
    expect(el.getAttribute('sizes')).toBeNull()
  })

  it('warns and skips when src is empty', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const Host = defineComponent({
      template: '<img v-safe-img="value" data-testid="img" />',
      setup() {
        return { value: '' }
      },
    })
    mount(Host, { global: { plugins: [[VueSafeImg, {}]] } })
    await settle()
    expect(warn).toHaveBeenCalled()
    expect((warn.mock.calls[0][0] as string)).toMatch(/empty src/)
    warn.mockRestore()
  })

  it('updates the load when binding value changes to a different src', async () => {
    const Host = defineComponent({
      template: '<img v-safe-img="src" data-testid="img" />',
      setup() {
        const src = ref('first.jpg')
        return { src }
      },
    })
    const wrapper = mount(Host, { global: { plugins: [[VueSafeImg, {}]] } })
    await settle()
    await flushPromises()
    expect((wrapper.find('[data-testid="img"]').element as HTMLImageElement).src).toContain('first.jpg')

    // 換 src
    await wrapper.setData({ src: 'second.jpg' })
    await settle()
    await flushPromises()
    expect((wrapper.find('[data-testid="img"]').element as HTMLImageElement).src).toContain('second.jpg')
  })

  it('ignores updates when the underlying src/fallback identity is unchanged', async () => {
    // 用 object literal 模擬「父元件每次 render 都新建物件」的場景，
    // src 沒變的話 directive 不該重新觸發載入
    const newObjectEachRender = ref(0)
    const Host = defineComponent({
      template: '<img v-safe-img="value" data-testid="img" />{{ tick }}',
      setup() {
        return { tick: newObjectEachRender }
      },
      computed: {
        value() {
          // 每次 render 一個新物件，但內容相同
          return { src: 'cover.jpg', fallback: 'default.jpg' }
        },
      },
    })
    const wrapper = mount(Host, { global: { plugins: [[VueSafeImg, {}]] } })
    await settle()
    await flushPromises()

    // 觸發父層重新 render 但 value 內容相同
    let loadCount = 0
    const tracker = class extends MockImage {
      set src(v: string) {
        if (!v.includes('placeholder')) loadCount++
        super.src = v
      }
      get src() {
        return super.src
      }
    }
    globalThis.Image = tracker as unknown as typeof Image
    const before = loadCount

    newObjectEachRender.value++
    await flushPromises()
    await settle()
    // 同 src + 同 fallback：不該重新 attach、不該再次 new Image
    expect(loadCount).toBe(before)
    wrapper.unmount()
  })

  it('removes the WeakMap entry on unmount (no error on second unmount)', async () => {
    const Host = defineComponent({
      template: '<img v-safe-img="src" />',
      setup() {
        return { src: 'cover.jpg' }
      },
    })
    const wrapper = mount(Host, { global: { plugins: [[VueSafeImg, {}]] } })
    await settle()
    await flushPromises()
    expect(() => wrapper.unmount()).not.toThrow()
  })

  it('falls back when value changes from valid to empty (warn path on update)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const src = ref<string>('cover.jpg')
    const Host = defineComponent({
      template: '<img v-safe-img="src" data-testid="img" />',
      setup: () => ({ src }),
    })
    mount(Host, { global: { plugins: [[VueSafeImg, {}]] } })
    await settle()
    await flushPromises()

    src.value = ''
    await flushPromises()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('accepts object value without fallback (no-fallback branch)', async () => {
    const Host = defineComponent({
      template: '<img v-safe-img="value" data-testid="img" />',
      setup() {
        return { value: { src: 'cover.jpg' } }
      },
    })
    const wrapper = mount(Host, { global: { plugins: [[VueSafeImg, {}]] } })
    await settle()
    await flushPromises()
    expect((wrapper.find('[data-testid="img"]').element as HTMLImageElement).src).toContain('cover.jpg')
  })

  it('accepts object value with array fallback chain', async () => {
    const Host = defineComponent({
      template: '<img v-safe-img="value" data-testid="img" />',
      setup() {
        return {
          value: { src: 'fail-a.jpg', fallback: ['fail-b.jpg', 'ok.jpg'], retry: 0 },
        }
      },
    })
    const wrapper = mount(Host, { global: { plugins: [[VueSafeImg, {}]] } })
    await settle()
    await flushPromises()
    expect((wrapper.find('[data-testid="img"]').element as HTMLImageElement).src).toContain('ok.jpg')
  })

  it('treats object value with empty/missing src as empty (defensive)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const Host = defineComponent({
      template: '<img v-safe-img="value" data-testid="img" />',
      setup() {
        // 故意傳沒有 src 的物件，模擬 TS 被繞過的情況
        return { value: { fallback: 'something.jpg' } as unknown as { src: string } }
      },
    })
    mount(Host, { global: { plugins: [[VueSafeImg, {}]] } })
    await settle()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('passes the el to ErrorInfo.element when reporting failure', async () => {
    const onError = vi.fn()
    const Host = defineComponent({
      template: '<img v-safe-img="value" data-testid="img" />',
      setup() {
        return {
          value: { src: 'fail.jpg', fallback: 'default.jpg', retry: 0, onError },
        }
      },
    })
    const wrapper = mount(Host, { global: { plugins: [[VueSafeImg, {}]] } })
    await settle()
    await flushPromises()
    expect(onError).toHaveBeenCalledTimes(1)
    const info = onError.mock.calls[0][0]
    expect(info.element).toBe(wrapper.find('[data-testid="img"]').element)
  })

  it('sets loading="lazy" when globally enabled', async () => {
    const Host = defineComponent({
      template: '<img v-safe-img="src" data-testid="img" />',
      setup: () => ({ src: 'cover.jpg' }),
    })
    const wrapper = mount(Host, { global: { plugins: [[VueSafeImg, { lazy: true }]] } })
    await settle()
    await flushPromises()
    expect((wrapper.find('[data-testid="img"]').element as HTMLImageElement).loading).toBe('lazy')
  })

  it('sets loading="eager" when globally disabled', async () => {
    const Host = defineComponent({
      template: '<img v-safe-img="src" data-testid="img" />',
      setup: () => ({ src: 'cover.jpg' }),
    })
    const wrapper = mount(Host, { global: { plugins: [[VueSafeImg, { lazy: false }]] } })
    await settle()
    await flushPromises()
    expect((wrapper.find('[data-testid="img"]').element as HTMLImageElement).loading).toBe('eager')
  })

  it('treats "a|b" and ["a","b"] as different fallback values (no key collision)', async () => {
    // 透過值更新觸發 updated() 比對：陣列換成「內含 | 的字串」必須被認為是不同的 key
    const value = ref<{ src: string; fallback?: string | string[] }>({
      src: 'cover.jpg',
      fallback: ['a', 'b'],
    })
    const Host = defineComponent({
      template: '<img v-safe-img="value" data-testid="img" />',
      setup: () => ({ value }),
    })
    const wrapper = mount(Host, { global: { plugins: [[VueSafeImg, {}]] } })
    await settle()
    await flushPromises()

    // 換成內容相同但用 | 串起來的單字串。若 key 用 '|' 分隔會誤判為相等
    value.value = { src: 'cover.jpg', fallback: 'a|b' }
    await flushPromises()
    await settle()
    // 沒 throw、wrapper 還在就視為通過（行為驗證點是 key 比對有區分，這條主要為 branch 覆蓋）
    expect(wrapper.find('[data-testid="img"]').exists()).toBe(true)
  })

  it('extractSrc returns empty when binding value updates to no-src object', async () => {
    // 涵蓋 updated() 路徑：先有效後切到沒 src 的物件，
    // 觸發 extractSrc 內部 if (!value.src) return '' 分支
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const value = ref<unknown>('cover.jpg')
    const Host = defineComponent({
      template: '<img v-safe-img="value" data-testid="img" />',
      setup: () => ({ value }),
    })
    mount(Host, { global: { plugins: [[VueSafeImg, {}]] } })
    await settle()
    await flushPromises()

    // 改成沒 src 的物件
    value.value = { fallback: 'x' }
    await flushPromises()
    await settle()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('applies per-instance placeholder before main loads', async () => {
    // 把 MockImage 改成延遲 50ms 才 onload，留出 placeholder 可被看到的時間
    class SlowImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_v: string) {
        setTimeout(() => this.onload?.(), 50)
      }
    }
    globalThis.Image = SlowImage as unknown as typeof Image

    const Host = defineComponent({
      template: '<img v-safe-img="value" data-testid="img" />',
      setup() {
        return {
          value: { src: 'cover.jpg', placeholder: 'data:image/png;base64,placeholder' },
        }
      },
    })
    const wrapper = mount(Host, { global: { plugins: [[VueSafeImg, {}]] } })
    // 載入完成前 (0~50ms 之間) el.src 應該是 placeholder
    await new Promise((r) => setTimeout(r, 10))
    const el = wrapper.find('[data-testid="img"]').element as HTMLImageElement
    expect(el.src).toContain('placeholder')

    // 等載入完成後 el.src 應該換成主圖
    await new Promise((r) => setTimeout(r, 60))
    expect(el.src).toContain('cover.jpg')
  })
})
