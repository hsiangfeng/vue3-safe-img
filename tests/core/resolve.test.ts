import { describe, it, expect } from 'vitest'
import { resolveValue } from '../../src/core/resolve'
import { DEFAULT_OPTIONS } from '../../src/core/options'

const globals = { ...DEFAULT_OPTIONS, defaultSrc: '/global.png' }

describe('resolveValue', () => {
  it('expands string shorthand to full config', () => {
    const r = resolveValue('cover.jpg', globals)
    expect(r.src).toBe('cover.jpg')
    expect(r.fallbacks).toEqual(['/global.png'])
    expect(r.retry).toBe(globals.retry)
  })

  it('appends globals.defaultSrc after user fallbacks', () => {
    const r = resolveValue(
      { src: 'a.jpg', fallback: ['/b.jpg', '/c.jpg'] },
      globals,
    )
    expect(r.fallbacks).toEqual(['/b.jpg', '/c.jpg', '/global.png'])
  })

  it('lifts single fallback string into array', () => {
    const r = resolveValue({ src: 'a.jpg', fallback: '/b.jpg' }, globals)
    expect(r.fallbacks).toEqual(['/b.jpg', '/global.png'])
  })

  it('per-instance retry overrides global', () => {
    const r = resolveValue({ src: 'a.jpg', retry: 0 }, globals)
    expect(r.retry).toBe(0)
  })

  it('per-instance onError overrides global', () => {
    const userFn = () => {}
    const r = resolveValue({ src: 'a.jpg', onError: userFn }, globals)
    expect(r.onError).toBe(userFn)
  })
})
