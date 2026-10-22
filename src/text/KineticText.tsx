'use client'

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { useEffect, useId, useRef, type ElementType } from 'react'
import { useReducedMotion } from '../quality/useReducedMotion.js'

export interface KineticTextProps {
  /** The element to render. Default `h2`. */
  as?: ElementType
  children: string
  id?: string
  className?: string
  /** Animate on mount, or when the text scrolls into view. Default `scroll`. */
  trigger?: 'mount' | 'scroll'
  /** Ripple the letters with an SVG displacement as they arrive and under the pointer. */
  distort?: boolean
  /** Seconds between letters. Default 0.025. */
  stagger?: number
  /**
   * `rise`: letters fade in from below (default). `settle`: letters stay visible and settle
   * into place. `ripple`: the text is not split at all; it ripples (with `distort`) and drifts
   * into place as one piece.
   *
   * Use `ripple` for the page's Largest Contentful Paint headline. Splitting replaces the text
   * with new elements once JavaScript runs, and the browser then counts those as a new, late
   * LCP, even when they never stop being visible.
   */
  appear?: 'rise' | 'settle' | 'ripple'
}

/**
 * Kinetic typography: the text splits into letters that rise into place (GSAP SplitText).
 * Screen readers get the whole text (SplitText's `aria: 'auto'`). Under reduced motion,
 * and before JavaScript runs, it is plain text.
 */
export function KineticText({
  as: Tag = 'h2',
  children,
  id,
  className,
  trigger = 'scroll',
  distort = false,
  stagger = 0.025,
  appear = 'rise',
}: KineticTextProps) {
  const ref = useRef<HTMLElement>(null)
  const displacement = useRef<SVGFEDisplacementMapElement>(null)
  const reducedMotion = useReducedMotion()
  // useId output contains characters that are not valid in url(#…).
  const filterId = `kt-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`

  useEffect(() => {
    const element = ref.current
    if (!element || reducedMotion) return
    gsap.registerPlugin(SplitText, ScrollTrigger)

    const context = gsap.context(() => {
      const timeline = gsap.timeline({
        scrollTrigger:
          trigger === 'scroll' ? { trigger: element, start: 'top 85%', once: true } : undefined,
      })
      if (appear === 'ripple') {
        // The same DOM node throughout: only a transform, which never creates a new paint entry.
        timeline.from(element, { yPercent: 8, duration: 1.4, ease: 'elastic.out(1, 0.5)' })
      } else {
        const split = SplitText.create(element, { type: 'words,chars', aria: 'auto' })
        timeline.from(
          split.chars,
          appear === 'settle'
            ? { yPercent: 18, rotate: 3, duration: 1.2, ease: 'elastic.out(1, 0.6)', stagger }
            : { yPercent: 110, rotate: 6, autoAlpha: 0, duration: 0.9, ease: 'expo.out', stagger },
        )
      }
      if (distort && displacement.current) {
        element.style.filter = `url(#${filterId})`
        timeline.fromTo(
          displacement.current,
          { attr: { scale: 40 } },
          { attr: { scale: 0 }, duration: 1.4, ease: 'power3.out' },
          0,
        )
      }
    }, element)

    // Pointer ripples: faster movement, stronger distortion, settling back to calm.
    let last: { x: number; y: number; t: number } | null = null
    const onMove = (event: PointerEvent) => {
      const now = performance.now()
      if (last && displacement.current) {
        const speed =
          Math.hypot(event.clientX - last.x, event.clientY - last.y) / Math.max(1, now - last.t)
        gsap.to(displacement.current, {
          attr: { scale: Math.min(24, speed * 12) },
          duration: 0.2,
          overwrite: true,
          onComplete: () => {
            gsap.to(displacement.current, { attr: { scale: 0 }, duration: 0.8, ease: 'power2.out' })
          },
        })
      }
      last = { x: event.clientX, y: event.clientY, t: now }
    }
    if (distort) element.addEventListener('pointermove', onMove)

    return () => {
      element.removeEventListener('pointermove', onMove)
      element.style.filter = ''
      context.revert()
    }
  }, [reducedMotion, trigger, distort, stagger, appear, filterId, children])

  return (
    <>
      {/* A new text remounts the element: reverting the old split after React has written
          the new text would otherwise put the old text back. */}
      <Tag key={children} ref={ref} id={id} className={className}>
        {children}
      </Tag>
      {distort && !reducedMotion && (
        <svg
          width="0"
          height="0"
          aria-hidden="true"
          focusable="false"
          style={{ position: 'absolute' }}
        >
          <filter id={filterId}>
            <feTurbulence type="fractalNoise" baseFrequency="0.015 0.06" numOctaves={2} seed={3} />
            <feDisplacementMap ref={displacement} in="SourceGraphic" scale={0} />
          </filter>
        </svg>
      )}
    </>
  )
}
