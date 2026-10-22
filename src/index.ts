export {
  detectQualityTier,
  readQualityOverride,
  readQualitySignals,
  type QualityResult,
  type QualitySignals,
  type QualityThresholds,
  type QualityTier,
  type WebGLSupport,
} from './quality/detect.js'
export { QualityGate, type QualityGateProps } from './quality/QualityGate.js'
export { useQuality, useQualityTier } from './quality/useQualityTier.js'
export { useReducedMotion } from './quality/useReducedMotion.js'
export { computeScrollProgress } from './scroll/progress.js'
export { SmoothScroll, useLenis, type SmoothScrollProps } from './scroll/SmoothScroll.js'
export { useScrollProgress, type ScrollProgressOptions } from './scroll/useScrollProgress.js'
export { ShaderPlane, type ShaderPlaneProps } from './shader/ShaderPlane.js'
export { defaultFragmentShader, shaderPlaneVertexShader } from './shader/shaders.js'
export {
  createShaderUniforms,
  normalizePointer,
  type ShaderPlaneUniforms,
} from './shader/uniforms.js'
