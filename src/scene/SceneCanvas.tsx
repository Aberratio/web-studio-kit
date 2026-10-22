'use client'

import { Canvas, type CanvasProps } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'

export interface SceneCanvasProps extends Omit<CanvasProps, 'frameloop'> {
  className?: string
}

/**
 * An R3F canvas with the studio defaults: device pixel ratio capped at 1.5, no MSAA (post
 * effects and soft shapes do not need it), and no rendering while it is off screen.
 */
export function SceneCanvas({
  className,
  dpr = [1, 1.5],
  gl,
  children,
  ...canvasProps
}: SceneCanvasProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const element = ref.current
    if (!element || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(entry?.isIntersecting ?? true),
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className={className} style={{ width: '100%', height: '100%' }}>
      <Canvas
        dpr={dpr}
        frameloop={visible ? 'always' : 'never'}
        // A gl factory function is passed through untouched; options are merged with ours.
        gl={
          typeof gl === 'function'
            ? gl
            : { antialias: false, powerPreference: 'high-performance', ...gl }
        }
        {...canvasProps}
      >
        {children}
      </Canvas>
    </div>
  )
}
