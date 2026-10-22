'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { Vector2, type IUniform, type ShaderMaterial } from 'three'
import { defaultFragmentShader, shaderPlaneVertexShader } from './shaders.js'
import { createShaderUniforms, normalizePointer, type ShaderPlaneUniforms } from './uniforms.js'

export interface ShaderPlaneProps {
  /** GLSL fragment shader. Reads `vUv` and the uniforms uTime, uMouse, uScroll, uResolution. */
  fragmentShader?: string
  /** Extra uniforms. Mutate their `.value` to animate them; the object itself is read once. */
  uniforms?: Record<string, IUniform>
  /** Scroll value for `uScroll`: a number, or a ref read every frame (e.g. useScrollProgress). */
  scroll?: number | RefObject<number>
  /** Multiplies the speed of `uTime`. Default 1. */
  timeScale?: number
  /** How fast `uMouse` follows the pointer, 0..1 per frame at 60 fps. Default 0.08. */
  mouseEase?: number
  /** Freeze time and pointer. */
  paused?: boolean
  /**
   * Called every frame (unless paused) after the built-in uniforms are updated, to animate
   * your own uniforms. Receives the material's uniforms, the frame's delta in seconds (scaled
   * by `timeScale`) and the current scroll value.
   */
  onFrame?: (uniforms: ShaderPlaneUniforms, delta: number, scroll: number) => void
}

/**
 * A full-screen GLSL plane for use inside an R3F `<Canvas>`. Tracks the pointer over the whole
 * window, so it still reacts when page content sits on top of the canvas.
 */
export function ShaderPlane({
  fragmentShader = defaultFragmentShader,
  uniforms,
  scroll = 0,
  timeScale = 1,
  mouseEase = 0.08,
  paused = false,
  onFrame,
}: ShaderPlaneProps) {
  // Uniforms are created once; three.js reads them by reference every frame.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const shaderUniforms = useMemo(() => createShaderUniforms(uniforms), [])
  const material = useRef<ShaderMaterial>(null)
  const pointer = useRef(new Vector2(0.5, 0.5))

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const { x, y } = normalizePointer(
        event.clientX,
        event.clientY,
        window.innerWidth,
        window.innerHeight,
      )
      pointer.current.set(x, y)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  useFrame((state, delta) => {
    if (!material.current) return
    // Mutate through the material: three.js reads these by reference every frame.
    const u = material.current.uniforms as ShaderPlaneUniforms
    u.uScroll.value = typeof scroll === 'number' ? scroll : (scroll.current ?? 0)
    u.uResolution.value.set(
      state.size.width * state.viewport.dpr,
      state.size.height * state.viewport.dpr,
    )
    if (paused) return
    u.uTime.value += delta * timeScale
    // Frame-rate independent easing toward the pointer.
    const ease = 1 - Math.pow(1 - mouseEase, delta * 60)
    u.uMouse.value.lerp(pointer.current, ease)
    onFrame?.(u, delta * timeScale, u.uScroll.value)
  })

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        // A new shader source needs a new program, so remount the material when it changes.
        key={fragmentShader}
        ref={material}
        vertexShader={shaderPlaneVertexShader}
        fragmentShader={fragmentShader}
        uniforms={shaderUniforms}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  )
}
