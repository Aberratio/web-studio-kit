export type QualityTier = 'light' | 'full'

export type WebGLSupport = 'webgl2' | 'webgl' | 'none'

/** What the browser tells us about the device and the user's preferences. */
export interface QualitySignals {
  reducedMotion: boolean
  webgl: WebGLSupport
  /** `navigator.hardwareConcurrency`; undefined when the browser hides it. */
  cores?: number
  /** `navigator.deviceMemory` in GB; only Chromium exposes it. */
  memoryGb?: number
  /** `navigator.connection.saveData`. */
  saveData?: boolean
}

export interface QualityThresholds {
  /** Fewer logical cores than this means light mode. Default 4. */
  minCores?: number
  /** Less memory (GB) than this means light mode. Default 4. */
  minMemoryGb?: number
}

export interface QualityResult {
  tier: QualityTier
  /** Why the tier is light; empty for full. */
  reasons: string[]
}

/** Decide the tier from signals. Pure, so it is easy to test and reuse on any input. */
export function detectQualityTier(
  signals: QualitySignals,
  { minCores = 4, minMemoryGb = 4 }: QualityThresholds = {},
): QualityResult {
  const reasons: string[] = []
  if (signals.reducedMotion) reasons.push('prefers-reduced-motion')
  if (signals.webgl === 'none') reasons.push('no-webgl')
  if (signals.saveData) reasons.push('save-data')
  if (signals.cores !== undefined && signals.cores < minCores) reasons.push('low-cpu')
  if (signals.memoryGb !== undefined && signals.memoryGb < minMemoryGb) reasons.push('low-memory')
  return { tier: reasons.length > 0 ? 'light' : 'full', reasons }
}

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

interface NavigatorWithHints extends Navigator {
  deviceMemory?: number
  connection?: { saveData?: boolean }
}

function probeWebGL(): WebGLSupport {
  try {
    const canvas = document.createElement('canvas')
    const gl2 = canvas.getContext('webgl2')
    const gl = gl2 ?? canvas.getContext('webgl')
    if (!gl) return 'none'
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return gl2 ? 'webgl2' : 'webgl'
  } catch {
    return 'none'
  }
}

/** Read the signals from the current browser. Call only on the client. */
export function readQualitySignals(): QualitySignals {
  const nav = navigator as NavigatorWithHints
  return {
    reducedMotion: window.matchMedia?.(REDUCED_MOTION_QUERY).matches ?? false,
    webgl: probeWebGL(),
    cores: nav.hardwareConcurrency || undefined,
    memoryGb: nav.deviceMemory,
    saveData: nav.connection?.saveData,
  }
}

/** A `?quality=light|full` query parameter forces a tier, for testing fallbacks by hand. */
export function readQualityOverride(search: string): QualityTier | undefined {
  const value = new URLSearchParams(search).get('quality')
  return value === 'light' || value === 'full' ? value : undefined
}
