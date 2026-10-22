'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { QualityThresholds } from './detect.js'
import { useQualityTier } from './useQualityTier.js'

export interface QualityGateProps {
  /** Rendered on the server, in light mode, and until the full version may mount. */
  fallback: ReactNode
  /** The full version, usually a lazily imported WebGL scene. */
  children: ReactNode
  /** Wait until the gate nears the viewport before mounting the full version. Default true. */
  lazy?: boolean
  /** How early "near the viewport" starts. Default `200px`. */
  rootMargin?: string
  /**
   * Also wait until the browser is idle. For scenes above the fold: the page paints its
   * largest content first, and the scene's JavaScript loads after. Default false.
   */
  idle?: boolean
  thresholds?: QualityThresholds
  className?: string
}

/** Resolves once the main thread is idle, or after `timeout` ms at the latest. */
function whenIdle(callback: () => void, timeout = 2000): () => void {
  if (typeof requestIdleCallback === 'function') {
    const handle = requestIdleCallback(callback, { timeout })
    return () => cancelIdleCallback(handle)
  }
  const handle = setTimeout(callback, 200)
  return () => clearTimeout(handle)
}

/**
 * Shows `fallback` unless the device qualifies for full quality and the gate is near the
 * viewport. The page stays fully usable without WebGL, because the fallback is the default.
 */
export function QualityGate({
  fallback,
  children,
  lazy = true,
  rootMargin = '200px',
  idle = false,
  thresholds,
  className,
}: QualityGateProps) {
  const tier = useQualityTier(thresholds)
  const ref = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(!lazy)
  const [settled, setSettled] = useState(!idle)

  useEffect(() => {
    if (settled || tier !== 'full') return
    return whenIdle(() => setSettled(true))
  }, [settled, tier])

  useEffect(() => {
    if (near || tier !== 'full') return
    const element = ref.current
    if (!element || typeof IntersectionObserver === 'undefined') {
      // No observer to wait for: mount right away rather than never.
      setNear(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true)
          observer.disconnect()
        }
      },
      { rootMargin },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [near, tier, rootMargin])

  const full = tier === 'full' && near && settled
  return (
    <div ref={ref} className={className} data-quality={full ? 'full' : 'light'}>
      {full ? children : fallback}
    </div>
  )
}
