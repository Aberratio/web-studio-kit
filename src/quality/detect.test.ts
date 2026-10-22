import { detectQualityTier, readQualityOverride, type QualitySignals } from './detect.js'

const capable: QualitySignals = { reducedMotion: false, webgl: 'webgl2', cores: 8, memoryGb: 8 }

describe('detectQualityTier', () => {
  it('gives full quality to a capable device', () => {
    expect(detectQualityTier(capable)).toEqual({ tier: 'full', reasons: [] })
  })

  it.each([
    [{ reducedMotion: true }, 'prefers-reduced-motion'],
    [{ webgl: 'none' as const }, 'no-webgl'],
    [{ saveData: true }, 'save-data'],
    [{ cores: 2 }, 'low-cpu'],
    [{ memoryGb: 2 }, 'low-memory'],
  ])('falls back to light for %o', (override, reason) => {
    expect(detectQualityTier({ ...capable, ...override })).toEqual({
      tier: 'light',
      reasons: [reason],
    })
  })

  it('treats hidden hints as capable rather than guessing', () => {
    expect(detectQualityTier({ reducedMotion: false, webgl: 'webgl' }).tier).toBe('full')
  })

  it('honours custom thresholds', () => {
    expect(detectQualityTier({ ...capable, cores: 6 }, { minCores: 8 }).reasons).toEqual([
      'low-cpu',
    ])
  })
})

describe('readQualityOverride', () => {
  it('reads light and full and ignores anything else', () => {
    expect(readQualityOverride('?quality=light')).toBe('light')
    expect(readQualityOverride('?a=1&quality=full')).toBe('full')
    expect(readQualityOverride('?quality=ultra')).toBeUndefined()
    expect(readQualityOverride('')).toBeUndefined()
  })
})
