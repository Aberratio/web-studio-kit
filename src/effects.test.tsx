import { render, screen } from '@testing-library/react'
import { Color } from 'three'
import {
  buildMorphAttributes,
  MAX_MORPH_SHAPES,
  sampleSphere,
  seededRandom,
} from './particles/shapes.js'
import { detectEffectsBudget } from './post/budget.js'
import { fluidFragmentShader, fluidUniforms } from './shader/fluid.js'
import { media } from './test/setup.js'
import { KineticText } from './text/KineticText.js'

describe('fluidUniforms', () => {
  it('turns colour strings into three colours and clamps viscosity', () => {
    const u = fluidUniforms(
      { deep: '#000000', mid: '#ff0000', highlight: '#ffffff' },
      { viscosity: 0 },
    )
    expect(u.uColorMid?.value).toEqual(new Color('#ff0000'))
    expect(u.uViscosity?.value).toBe(0.1)
    expect(u.uDistortion?.value).toBe(1)
  })

  it('declares every uniform it is given', () => {
    const u = fluidUniforms({ deep: '#000', mid: '#000', highlight: '#000' })
    for (const name of Object.keys(u)) expect(fluidFragmentShader).toContain(name)
  })
})

describe('shapes', () => {
  it('generates the same random sequence for the same seed', () => {
    const a = seededRandom(42)
    const b = seededRandom(42)
    const values = [a(), a(), a()]
    expect([b(), b(), b()]).toEqual(values)
    for (const v of values) expect(v).toBeGreaterThanOrEqual(0)
    for (const v of values) expect(v).toBeLessThan(1)
  })

  it('keeps sphere samples inside the radius', () => {
    const points = sampleSphere(500, 2)
    expect(points).toHaveLength(1500)
    for (let i = 0; i < 500; i++) {
      const r = Math.hypot(points[i * 3]!, points[i * 3 + 1]!, points[i * 3 + 2]!)
      expect(r).toBeLessThanOrEqual(2.000001)
    }
  })

  it('pads shapes to four and wraps shorter shapes', () => {
    const big = new Float32Array([0, 0, 0, 1, 1, 1, 2, 2, 2])
    const small = new Float32Array([9, 9, 9])
    const { positions, randoms, count } = buildMorphAttributes([big, small])
    expect(count).toBe(3)
    expect(positions).toHaveLength(MAX_MORPH_SHAPES)
    expect(Array.from(positions[1]!)).toEqual([9, 9, 9, 9, 9, 9, 9, 9, 9])
    // Missing shapes repeat the last one, so the morph rests on it.
    expect(positions[3]).toEqual(positions[1])
    expect(randoms).toHaveLength(3)
  })

  it('refuses fewer than two or more than four shapes', () => {
    const s = new Float32Array(3)
    expect(() => buildMorphAttributes([s])).toThrow()
    expect(() => buildMorphAttributes([s, s, s, s, s])).toThrow()
  })
})

describe('detectEffectsBudget', () => {
  it('gives high only to strong machines', () => {
    expect(detectEffectsBudget({ cores: 8, memoryGb: 8 })).toBe('high')
    expect(detectEffectsBudget({ cores: 12 })).toBe('high')
    expect(detectEffectsBudget({ cores: 4, memoryGb: 16 })).toBe('low')
    expect(detectEffectsBudget({ cores: 8, memoryGb: 4 })).toBe('low')
    expect(detectEffectsBudget({})).toBe('low')
  })
})

describe('KineticText', () => {
  it('is plain, whole text under reduced motion', () => {
    media.reduced = true
    render(
      <KineticText as="h1" id="t" distort>
        Pasieka
      </KineticText>,
    )
    const heading = screen.getByRole('heading', { level: 1, name: 'Pasieka' })
    expect(heading.id).toBe('t')
    expect(heading.children).toHaveLength(0)
    expect(document.querySelector('filter')).toBeNull()
  })

  it('shows the new text after the text changes', () => {
    media.reduced = false
    const { rerender } = render(
      <KineticText as="h1" trigger="mount">
        Pasieka
      </KineticText>,
    )
    rerender(
      <KineticText as="h1" trigger="mount">
        Apiary
      </KineticText>,
    )
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.textContent).toBe('Apiary')
    expect(heading.getAttribute('aria-label') ?? 'Apiary').toBe('Apiary')
  })
})
