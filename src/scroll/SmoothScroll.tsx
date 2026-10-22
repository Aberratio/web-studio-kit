'use client'

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis, { type LenisOptions } from 'lenis'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useReducedMotion } from '../quality/useReducedMotion.js'

const LenisContext = createContext<Lenis | null>(null)

/** The running Lenis instance, or null when smooth scrolling is off (e.g. reduced motion). */
export function useLenis(): Lenis | null {
  return useContext(LenisContext)
}

export interface SmoothScrollProps {
  children: ReactNode
  /** Passed to Lenis. `autoRaf` is always off: the GSAP ticker drives Lenis. */
  options?: Omit<LenisOptions, 'autoRaf'>
  /** Turn smooth scrolling off without unmounting. Default true. */
  enabled?: boolean
}

/**
 * Smooth scrolling with Lenis, driven by the GSAP ticker so Lenis and ScrollTrigger share one
 * frame loop. Off under `prefers-reduced-motion`: the page keeps native scrolling.
 * Import `lenis/dist/lenis.css` once in the app for Lenis' recommended styles.
 */
export function SmoothScroll({ children, options, enabled = true }: SmoothScrollProps) {
  const reducedMotion = useReducedMotion()
  const [lenis, setLenis] = useState<Lenis | null>(null)
  const active = enabled && !reducedMotion

  useEffect(() => {
    if (!active) return
    gsap.registerPlugin(ScrollTrigger)
    const instance = new Lenis({ ...options, autoRaf: false })
    const tick = (time: number) => instance.raf(time * 1000)
    instance.on('scroll', ScrollTrigger.update)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    // The instance only exists after mount; publishing it is the point of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLenis(instance)
    return () => {
      gsap.ticker.remove(tick)
      instance.destroy()
      setLenis(null)
    }
    // Options are read once per activation; changing them later would restart scrolling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>
}
