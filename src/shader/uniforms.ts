import { Vector2, type IUniform } from 'three'

/** Uniforms every ShaderPlane fragment shader can read. */
export interface ShaderPlaneUniforms {
  /** Seconds since mount, scaled by `timeScale`. */
  uTime: IUniform<number>
  /** Pointer position over the window, 0..1 on both axes, origin bottom-left, smoothed. */
  uMouse: IUniform<Vector2>
  /** Scroll value passed by the caller, usually 0..1. */
  uScroll: IUniform<number>
  /** Drawing buffer size in pixels. */
  uResolution: IUniform<Vector2>
  [name: string]: IUniform
}

/** Built-in uniforms merged with the caller's own. Built-in names win. */
export function createShaderUniforms(extra: Record<string, IUniform> = {}): ShaderPlaneUniforms {
  return {
    ...extra,
    uTime: { value: 0 },
    uMouse: { value: new Vector2(0.5, 0.5) },
    uScroll: { value: 0 },
    uResolution: { value: new Vector2(1, 1) },
  }
}

/** Window pointer position to 0..1 with the origin at the bottom-left, as GLSL expects. */
export function normalizePointer(clientX: number, clientY: number, width: number, height: number) {
  return {
    x: width > 0 ? clientX / width : 0.5,
    y: height > 0 ? 1 - clientY / height : 0.5,
  }
}
