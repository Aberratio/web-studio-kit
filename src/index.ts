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
export {
  fluidFragmentShader,
  fluidUniforms,
  type FluidColors,
  type FluidOptions,
} from './shader/fluid.js'
export { ParticleMorph, type ParticleMorphProps } from './particles/ParticleMorph.js'
export {
  buildMorphAttributes,
  MAX_MORPH_SHAPES,
  sampleSphere,
  seededRandom,
} from './particles/shapes.js'
export { SceneCanvas, type SceneCanvasProps } from './scene/SceneCanvas.js'
export { PostFX, type PostFXProps } from './post/PostFX.js'
export { detectEffectsBudget, readEffectsBudget, type EffectsBudget } from './post/budget.js'
export { KineticText, type KineticTextProps } from './text/KineticText.js'
