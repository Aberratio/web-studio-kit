import { Color, type IUniform } from 'three'

export interface FluidColors {
  /** Shadows and the darkest flow. */
  deep: string
  /** The body colour. */
  mid: string
  /** Bright streaks and specular glints. */
  highlight: string
}

export interface FluidOptions {
  /** Higher is slower and thicker. Default 1. */
  viscosity?: number
  /** How strongly the pointer drags the flow. Default 1. */
  distortion?: number
}

/** Uniforms for `fluidFragmentShader`, to pass to `<ShaderPlane uniforms>`. */
export function fluidUniforms(
  colors: FluidColors,
  { viscosity = 1, distortion = 1 }: FluidOptions = {},
): Record<string, IUniform> {
  return {
    uColorDeep: { value: new Color(colors.deep) },
    uColorMid: { value: new Color(colors.mid) },
    uColorHighlight: { value: new Color(colors.highlight) },
    uViscosity: { value: Math.max(0.1, viscosity) },
    uDistortion: { value: distortion },
  }
}

/**
 * A slow, viscous liquid: domain-warped fractal noise, lit from its own screen-space gradient so
 * it reads as a glossy surface. The pointer drags the flow, scroll darkens and shifts it.
 * One noise field per pixel (the lighting uses derivatives), so it stays affordable full screen.
 */
export const fluidFragmentShader = /* glsl */ `
precision highp float;

uniform float uTime;
uniform vec2 uMouse;
uniform float uScroll;
uniform vec2 uResolution;
uniform vec3 uColorDeep;
uniform vec3 uColorMid;
uniform vec3 uColorHighlight;
uniform float uViscosity;
uniform float uDistortion;
varying vec2 vUv;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  mat2 rotate = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p = rotate * p;
    amplitude *= 0.5;
  }
  return value;
}

// Domain warping: noise fed through noise, which is what makes it look poured.
float field(vec2 p, float t) {
  vec2 q = vec2(fbm(p + vec2(0.0, t * 0.10)), fbm(p + vec2(5.2, 1.3) - t * 0.08));
  return fbm(p + 2.6 * q + vec2(1.7, 9.2) + t * 0.04);
}

void main() {
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 p = vec2(vUv.x * aspect, vUv.y);
  vec2 mouse = vec2(uMouse.x * aspect, uMouse.y);
  float t = uTime / uViscosity;

  vec2 away = p - mouse;
  float d = length(away);
  // Smooth everywhere: the push fades to zero at the pointer itself, so there is no pinch point.
  p += away * exp(-d * d * 10.0) * 0.6 * uDistortion;

  p = p * 2.0 + vec2(0.0, uScroll * 1.2);
  float f = field(p, t);

  // Surface normal from the field's screen-space slope.
  float slope = 0.9 * min(uResolution.x, uResolution.y) / 600.0;
  vec3 n = normalize(vec3(-dFdx(f) * slope * 40.0, -dFdy(f) * slope * 40.0, 1.0));
  vec3 light = normalize(vec3(-0.4, 0.6, 0.7));
  float diffuse = clamp(dot(n, light), 0.0, 1.0);
  float specular = pow(clamp(dot(reflect(-light, n), vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 28.0);

  vec3 color = mix(uColorDeep, uColorMid, smoothstep(0.2, 0.72, f));
  color = mix(color, uColorHighlight, smoothstep(0.62, 0.95, f) * 0.55);
  color *= 0.55 + 0.6 * diffuse;
  color += specular * uColorHighlight * 0.9;
  color *= 1.0 - uScroll * 0.5;

  vec2 v = vUv - 0.5;
  color *= 1.0 - dot(v, v) * 0.9;
  gl_FragColor = vec4(color, 1.0);
}
`
