import { Vector2 } from 'three'
import { createShaderUniforms, normalizePointer } from './uniforms.js'

describe('createShaderUniforms', () => {
  it('provides the built-in uniforms', () => {
    const u = createShaderUniforms()
    expect(u.uTime.value).toBe(0)
    expect(u.uScroll.value).toBe(0)
    expect(u.uMouse.value).toEqual(new Vector2(0.5, 0.5))
    expect(u.uResolution.value).toBeInstanceOf(Vector2)
  })

  it('keeps extra uniforms but never lets them replace built-ins', () => {
    const u = createShaderUniforms({ uColor: { value: 1 }, uTime: { value: 99 } })
    expect(u.uColor?.value).toBe(1)
    expect(u.uTime.value).toBe(0)
  })
})

describe('normalizePointer', () => {
  it('maps the window to 0..1 with the origin at the bottom-left', () => {
    expect(normalizePointer(0, 0, 200, 100)).toEqual({ x: 0, y: 1 })
    expect(normalizePointer(200, 100, 200, 100)).toEqual({ x: 1, y: 0 })
    expect(normalizePointer(50, 50, 200, 100)).toEqual({ x: 0.25, y: 0.5 })
  })

  it('falls back to the centre for an empty window', () => {
    expect(normalizePointer(10, 10, 0, 0)).toEqual({ x: 0.5, y: 0.5 })
  })
})
