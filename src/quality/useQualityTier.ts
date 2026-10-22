'use client'

import { useEffect, useState } from 'react'
import {
  detectQualityTier,
  readQualityOverride,
  readQualitySignals,
  type QualityResult,
  type QualityThresholds,
} from './detect.js'
import { useReducedMotion } from './useReducedMotion.js'

const LIGHT_UNTIL_DETECTED: QualityResult = { tier: 'light', reasons: ['not-detected-yet'] }

/**
 * Light or full rendering for this device. Starts as `light` (also on the server), so the
 * fallback renders first and the full scene only replaces it once the device qualifies.
 */
export function useQuality(thresholds: QualityThresholds = {}): QualityResult {
  const reducedMotion = useReducedMotion()
  const [result, setResult] = useState<QualityResult>(LIGHT_UNTIL_DETECTED)
  const { minCores, minMemoryGb } = thresholds

  useEffect(() => {
    const override = readQualityOverride(window.location.search)
    const next = override
      ? { tier: override, reasons: override === 'light' ? ['query-override'] : [] }
      : detectQualityTier({ ...readQualitySignals(), reducedMotion }, { minCores, minMemoryGb })
    // Detection needs browser APIs, so it can only run after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResult(next)
  }, [reducedMotion, minCores, minMemoryGb])

  return result
}

/** Shorthand for `useQuality().tier`. */
export function useQualityTier(thresholds?: QualityThresholds) {
  return useQuality(thresholds).tier
}
