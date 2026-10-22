/** Full-screen quad: the 2x2 plane covers clip space directly, no camera involved. */
export const shaderPlaneVertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

/** A slow warm gradient that follows the pointer and scroll. A starting point, not an effect. */
export const defaultFragmentShader = /* glsl */ `
precision highp float;

uniform float uTime;
uniform vec2 uMouse;
uniform float uScroll;
uniform vec2 uResolution;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  float wave = sin(uv.x * 3.0 + uTime * 0.4) * 0.5 + 0.5;
  float glow = 1.0 - smoothstep(0.0, 0.8, distance(uv, uMouse));
  vec3 deep = vec3(0.12, 0.07, 0.02);
  vec3 warm = vec3(0.95, 0.66, 0.18);
  vec3 color = mix(deep, warm, wave * 0.5 + glow * 0.5);
  color *= 1.0 - uScroll * 0.6;
  gl_FragColor = vec4(color, 1.0);
}
`
