'use client'

import { useEffect, useRef, type RefObject } from 'react'
import { computeScrollProgress } from './progress.js'

export interface ScrollProgressOptions {
  /**
   * CSS custom property written on the element on every change, so CSS can animate from it
   * without a React render. Default `--scroll-progress`; `false` turns it off.
   */
  cssVar?: string | false
  /** Called when the progress changes. Runs at most once per animation frame. */
  onChange?: (progress: number) => void
}

/**
 * Tracks how far `target` has scrolled through the viewport (0 to 1). Returns a ref, not
 * state, so per-frame updates do not re-render. Works with native scroll and with Lenis,
 * which drives the native scroll position.
 */
export function useScrollProgress(
  target: RefObject<HTMLElement | null>,
  { cssVar = '--scroll-progress', onChange }: ScrollProgressOptions = {},
): RefObject<number> {
  const progress = useRef(0)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    const element = target.current
    if (!element) return
    let frame = 0
    let first = true

    const measure = () => {
      frame = 0
      const next = computeScrollProgress(element.getBoundingClientRect(), window.innerHeight)
      // The first measurement always reports, even when the value is 0.
      if (next === progress.current && !first) return
      first = false
      progress.current = next
      if (cssVar) element.style.setProperty(cssVar, next.toFixed(4))
      onChangeRef.current?.(next)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }

    measure()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [target, cssVar])

  return progress
}
