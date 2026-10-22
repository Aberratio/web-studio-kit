'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  type ShaderMaterial,
} from 'three'
import { buildMorphAttributes } from './shapes.js'

const vertexShader = /* glsl */ `
uniform float uProgress;
uniform float uTime;
uniform float uSize;
uniform float uPixelRatio;
attribute vec3 aPos0;
attribute vec3 aPos1;
attribute vec3 aPos2;
attribute vec3 aPos3;
attribute float aRandom;
varying float vAlpha;

void main() {
  float p = clamp(uProgress, 0.0, 3.0);
  float segment = floor(min(p, 2.999));
  float local = p - segment;
  // Each particle leaves a little later than the last, so shapes dissolve rather than snap.
  float delay = aRandom * 0.35;
  float t = smoothstep(delay, delay + 0.65, local);

  vec3 from = segment < 0.5 ? aPos0 : segment < 1.5 ? aPos1 : aPos2;
  vec3 to = segment < 0.5 ? aPos1 : segment < 1.5 ? aPos2 : aPos3;
  vec3 position = mix(from, to, t);

  // Gentle hover at rest, a wider swirl while travelling.
  float travel = sin(t * 3.14159);
  vec3 drift = vec3(
    sin(uTime * 0.7 + aRandom * 40.0),
    cos(uTime * 0.6 + aRandom * 30.0),
    sin(uTime * 0.5 + aRandom * 20.0)
  );
  position += drift * (0.015 + travel * 0.22);

  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewPosition;
  gl_PointSize = uSize * uPixelRatio * (0.6 + aRandom * 0.8) / -viewPosition.z;
  vAlpha = 0.45 + 0.55 * aRandom;
}
`

const fragmentShader = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  gl_FragColor = vec4(uColor, smoothstep(0.5, 0.1, d) * vAlpha);
}
`

export interface ParticleMorphProps {
  /** 2–4 shapes as flat xyz arrays. The first sets the particle count. */
  shapes: Float32Array[]
  /** 0 shows the first shape, 1 the second, and so on. A number or a ref read every frame. */
  progress: number | RefObject<number>
  color?: string
  /** Point size in world-ish units before perspective. Default 18. */
  size?: number
}

/** Particles that morph between shapes as `progress` moves, e.g. from a section's scroll. */
export function ParticleMorph({
  shapes,
  progress,
  color = '#ffc95c',
  size = 18,
}: ParticleMorphProps) {
  const material = useRef<ShaderMaterial>(null)
  const dpr = useThree((state) => state.viewport.dpr)

  const geometry = useMemo(() => {
    const { positions, randoms } = buildMorphAttributes(shapes)
    const g = new BufferGeometry()
    // `position` is required by three for bounds; the shader uses the aPos attributes.
    g.setAttribute('position', new BufferAttribute(positions[0]!, 3))
    positions.forEach((p, i) => g.setAttribute(`aPos${i}`, new BufferAttribute(p, 3)))
    g.setAttribute('aRandom', new BufferAttribute(randoms, 1))
    return g
  }, [shapes])
  useEffect(() => () => geometry.dispose(), [geometry])

  // Created once; every frame below writes the current props into them through the material.
  const uniforms = useMemo(
    () => ({
      uProgress: { value: 0 },
      uTime: { value: 0 },
      uSize: { value: 0 },
      uPixelRatio: { value: 1 },
      uColor: { value: new Color() },
    }),
    [],
  )

  useFrame((_, delta) => {
    const u = material.current?.uniforms
    if (!u) return
    u.uTime!.value += delta
    u.uProgress!.value = typeof progress === 'number' ? progress : (progress.current ?? 0)
    u.uSize!.value = size
    u.uPixelRatio!.value = dpr
    ;(u.uColor!.value as Color).set(color)
  })

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  )
}
