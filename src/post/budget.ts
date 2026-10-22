export type EffectsBudget = 'high' | 'low'

/**
 * How much post-processing a full-quality device gets. Light-mode devices render no WebGL at
 * all; this splits the rest into strong machines and merely capable ones.
 */
export function detectEffectsBudget(signals: { cores?: number; memoryGb?: number }): EffectsBudget {
  const enoughCores = (signals.cores ?? 0) >= 8
  const enoughMemory = signals.memoryGb === undefined || signals.memoryGb >= 8
  return enoughCores && enoughMemory ? 'high' : 'low'
}

/** Reads the budget in the browser. Call only on the client, e.g. inside a scene. */
export function readEffectsBudget(): EffectsBudget {
  const nav = navigator as Navigator & { deviceMemory?: number }
  return detectEffectsBudget({ cores: nav.hardwareConcurrency, memoryGb: nav.deviceMemory })
}
