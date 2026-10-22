'use client'

import { Bloom, EffectComposer, Noise } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { useState } from 'react'
import { readEffectsBudget, type EffectsBudget } from './budget.js'

export interface PostFXProps {
  /** Overrides the detected budget. */
  budget?: EffectsBudget
  /** Bloom strength. Default 0.7. */
  bloom?: number
  /** Brightness above which things glow, 0..1. Default 0.6. */
  bloomThreshold?: number
  /** Film grain opacity on high budgets. Default 0.06; 0 turns it off. */
  grain?: number
}

/**
 * Bloom and film grain, scaled to the device: high budgets get full-resolution mipmap bloom and
 * grain, low budgets a half-resolution bloom only. Put it last inside a `<Canvas>`.
 */
export function PostFX({ budget, bloom = 0.7, bloomThreshold = 0.6, grain = 0.06 }: PostFXProps) {
  // Read once on mount: the scene only exists in the browser.
  const [detected] = useState(readEffectsBudget)
  const level = budget ?? detected

  if (level === 'low') {
    return (
      <EffectComposer multisampling={0} resolutionScale={0.5}>
        <Bloom intensity={bloom} luminanceThreshold={bloomThreshold} luminanceSmoothing={0.2} />
      </EffectComposer>
    )
  }
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        mipmapBlur
        intensity={bloom}
        luminanceThreshold={bloomThreshold}
        luminanceSmoothing={0.2}
      />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={grain} />
    </EffectComposer>
  )
}
