import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { startLoad, type LoadResult } from '../../src/lib/loader'
import { createCache } from '../../src/core/cache'
import type { ResolvedConfig } from '../../src/types'

// 把 URL 中含「fail」當失敗，其他當成功
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

const flush = (ms = 50) => new Promise((r) => setTimeout(r, ms))

const makeConfig = (overrides: Partial<ResolvedConfig> = {}): ResolvedConfig => ({
  src: 'cover.jpg',
  fallbacks: ['/default.jpg'],
  placeholder: undefined,
  retry: 0,
  retryDelay: 0,
  lazy: true,
  onError: undefined,
  ...overrides,
})

describe('startLoad', () => {
  it('emits loading then loaded on success', async () => {
    const events: LoadResult[] = []
    startLoad(makeConfig(), createCache(0), (r) => events.push(r))
    await flush()
    expect(events.map((e) => e.status)).toEqual(['loading', 'loaded'])
    expect(events[1].src).toBe('cover.jpg')
  })

  it('falls back when main fails and retry is 0', async () => {
    const events: LoadResult[] = []
    startLoad(makeConfig({ src: 'fail.jpg' }), createCache(0), (r) => events.push(r))
    await flush()
    const last = events[events.length - 1]
    expect(last.status).toBe('fallback')
    expect(last.src).toBe('/default.jpg')
    expect(last.errorInfo?.attempts).toBe(1)
    expect(last.errorInfo?.src).toBe('fail.jpg')
  })

  it('retries before falling back', async () => {
    const events: LoadResult[] = []
    startLoad(
      makeConfig({ src: 'fail.jpg', retry: 2, retryDelay: 1 }),
      createCache(0),
      (r) => events.push(r),
    )
    await flush(100)
    const last = events[events.length - 1]
    expect(last.status).toBe('fallback')
    expect(last.errorInfo?.attempts).toBe(3) // 1 + 2 retries
  })

  it('walks the fallback chain when first fallback also fails', async () => {
    const events: LoadResult[] = []
    startLoad(
      makeConfig({ src: 'fail-a.jpg', fallbacks: ['fail-b.jpg', '/ok.jpg'] }),
      createCache(0),
      (r) => events.push(r),
    )
    await flush()
    const last = events[events.length - 1]
    expect(last.status).toBe('fallback')
    expect(last.src).toBe('/ok.jpg')
  })

  it('calls config.onError once on real failure', async () => {
    const onError = vi.fn()
    startLoad(
      makeConfig({ src: 'fail.jpg', onError }),
      createCache(0),
      () => {},
    )
    await flush()
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError.mock.calls[0][0]).toMatchObject({
      src: 'fail.jpg',
      fallbackUsed: '/default.jpg',
    })
  })

  it('skips main load and onError when cache hits', async () => {
    const cache = createCache(10)
    cache.add('fail.jpg')
    const onError = vi.fn()
    const events: LoadResult[] = []
    startLoad(
      makeConfig({ src: 'fail.jpg', onError }),
      cache,
      (r) => events.push(r),
    )
    await flush()
    expect(onError).not.toHaveBeenCalled()
    const last = events[events.length - 1]
    expect(last.status).toBe('fallback')
    expect(last.errorInfo).toBeUndefined()
  })

  it('emits error status when every fallback also fails', async () => {
    const events: LoadResult[] = []
    startLoad(
      makeConfig({ src: 'fail-a.jpg', fallbacks: ['fail-b.jpg', 'fail-c.jpg'] }),
      createCache(0),
      (r) => events.push(r),
    )
    await flush()
    const last = events[events.length - 1]
    expect(last.status).toBe('error')
  })

  it('cancel stops onChange after cancellation', async () => {
    const events: LoadResult[] = []
    const ctrl = startLoad(makeConfig(), createCache(0), (r) => events.push(r))
    ctrl.cancel()
    await flush()
    // 只應收到 cancel 前同步發出的 'loading'
    expect(events.map((e) => e.status)).toEqual(['loading'])
  })

  it('cancel during retry wait clears the timer', async () => {
    const events: LoadResult[] = []
    const ctrl = startLoad(
      makeConfig({ src: 'fail.jpg', retry: 5, retryDelay: 50 }),
      createCache(0),
      (r) => events.push(r),
    )
    await new Promise((r) => setTimeout(r, 5)) // 等第一次 probe.onerror 排好 setTimeout
    ctrl.cancel()
    await new Promise((r) => setTimeout(r, 120))
    // cancel 後 tryMain 不該再被 setTimeout 喚醒，也不會 emit fallback
    expect(events.find((e) => e.status === 'fallback')).toBeUndefined()
    expect(events.find((e) => e.status === 'loaded')).toBeUndefined()
  })

  it('cancel before any fallback probe completes silences fallback emit', async () => {
    const events: LoadResult[] = []
    const ctrl = startLoad(
      makeConfig({ src: 'fail.jpg', retry: 0 }),
      createCache(0),
      (r) => events.push(r),
    )
    // 在主圖 onerror 排程跑完前同步 cancel
    ctrl.cancel()
    await flush()
    expect(events.find((e) => e.status === 'fallback')).toBeUndefined()
  })

  it('cancel between probes catches fallback probe.onload guard', async () => {
    // 走到主圖失敗→fallback probe 已排程 setTimeout、但還沒 onload 之前 cancel
    const onError = vi.fn()
    const events: LoadResult[] = []
    const ctrl = startLoad(
      makeConfig({ src: 'fail.jpg', retry: 0, onError }),
      createCache(0),
      (r) => events.push(r),
    )
    // 等一個 macrotask：主圖 probe.onerror 已跑完、tryFallback 排程 fallback probe
    await new Promise((r) => setTimeout(r, 0))
    // 此時 fallback probe 的 setTimeout(0) 還沒輪到，馬上 cancel
    ctrl.cancel()
    await flush()
    // fallback probe.onload 觸發時應該被 line 55 的 cancelled guard 攔下
    expect(events.find((e) => e.status === 'fallback')).toBeUndefined()
    expect(onError).not.toHaveBeenCalled()
  })
})
