import { describe, it, expect } from 'vitest'
import { mergeOptions, DEFAULT_OPTIONS } from '../../src/core/options'

describe('mergeOptions', () => {
  it('returns defaults when nothing passed', () => {
    expect(mergeOptions()).toEqual(DEFAULT_OPTIONS)
  })

  it('overrides only the specified fields', () => {
    const result = mergeOptions({ retry: 5 })
    expect(result.retry).toBe(5)
    expect(result.retryDelay).toBe(DEFAULT_OPTIONS.retryDelay)
    expect(result.cacheSize).toBe(DEFAULT_OPTIONS.cacheSize)
  })

  it('does not mutate the input', () => {
    const user = { retry: 5 }
    mergeOptions(user)
    expect(user).toEqual({ retry: 5 })
  })

  it('does not mutate the defaults', () => {
    const snapshot = { ...DEFAULT_OPTIONS }
    mergeOptions({ retry: 99 })
    expect(DEFAULT_OPTIONS).toEqual(snapshot)
  })
})
