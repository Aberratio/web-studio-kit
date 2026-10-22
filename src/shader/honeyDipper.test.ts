import { Color, Vector3 } from 'three'
import {
  advanceHoneyDipper,
  HONEY_DIPPER_LAYOUTS,
  honeyDipperFragmentShader,
  honeyDipperUniforms,
  resolveHoneyDipperLayout,
  setHoneyDipperLayout,
} from './honeyDipper.js'

const colors = { honey: '#f6a91f', honeyDeep: '#6e2a03', wood: '#9a6634', sun: '#ffc164' }

describe('honeyDipperUniforms', () => {
  it('turns colour strings into three colours', () => {
    const u = honeyDipperUniforms(colors)
    expect(u.uHoney?.value).toBeInstanceOf(Color)
    expect((u.uWood?.value as Color).equals(new Color('#9a6634'))).toBe(true)
  })

  it('defaults to a centred dipper at normal speed and never runs backwards', () => {
    const u = honeyDipperUniforms(colors)
    expect(u.uFlowSpeed?.value).toBe(1)
    expect(u.uLayout?.value).toEqual(new Vector3(0, 0, 1))
    expect(honeyDipperUniforms(colors, { flowSpeed: -2 }).uFlowSpeed?.value).toBe(0)
  })

  it('takes a named layout or an exact placement', () => {
    const right = HONEY_DIPPER_LAYOUTS.right
    expect(honeyDipperUniforms(colors, { layout: 'right' }).uLayout?.value).toEqual(
      new Vector3(right.x, right.y, right.scale),
    )
    const custom = honeyDipperUniforms(colors, { layout: { x: 0.1, y: -0.2, scale: 0.5 } })
    expect(custom.uLayout?.value).toEqual(new Vector3(0.1, -0.2, 0.5))
  })

  it('declares every uniform it is given', () => {
    const u = honeyDipperUniforms(colors)
    for (const name of Object.keys(u)) {
      expect(honeyDipperFragmentShader).toMatch(new RegExp(`uniform \\w+ ${name};`))
    }
  })
})

describe('honeyDipperFragmentShader', () => {
  it('reads the ShaderPlane built-ins', () => {
    for (const name of ['uTime', 'uMouse', 'uScroll', 'uResolution']) {
      expect(honeyDipperFragmentShader).toMatch(new RegExp(`uniform \\w+ ${name};`))
    }
  })

  it('caps the march at 80 steps', () => {
    expect(honeyDipperFragmentShader).toContain('#define MAX_STEPS 80')
  })

  it('has balanced braces and parentheses', () => {
    const count = (c: string) => honeyDipperFragmentShader.split(c).length - 1
    expect(count('{')).toBe(count('}'))
    expect(count('(')).toBe(count(')'))
  })
})

describe('resolveHoneyDipperLayout', () => {
  it('keeps the scale positive', () => {
    expect(resolveHoneyDipperLayout({ x: 0, y: 0, scale: 0 }).scale).toBeGreaterThan(0)
  })
})

describe('setHoneyDipperLayout', () => {
  it('moves the dipper in place', () => {
    const u = honeyDipperUniforms(colors)
    const vector = u.uLayout?.value as Vector3
    setHoneyDipperLayout(u, 'top')
    expect(u.uLayout?.value).toBe(vector)
    expect(vector.z).toBe(HONEY_DIPPER_LAYOUTS.top.scale)
  })
})

describe('advanceHoneyDipper', () => {
  it('adds nothing at the top of the page', () => {
    const u = honeyDipperUniforms(colors)
    advanceHoneyDipper(u, 0.5, 0)
    expect(u.uFlowOffset?.value).toBe(0)
  })

  it('runs faster the further the page has scrolled, scaled by flow speed', () => {
    const u = honeyDipperUniforms(colors, { flowSpeed: 2, scrollBoost: 3 })
    advanceHoneyDipper(u, 0.5, 0.5)
    expect(u.uFlowOffset?.value).toBeCloseTo(0.5 * 2 * 0.5 * 3)
    advanceHoneyDipper(u, 0.5, 4)
    expect(u.uFlowOffset?.value).toBeCloseTo(1.5 + 0.5 * 2 * 1 * 3)
  })

  it('never moves the flow backwards', () => {
    const u = honeyDipperUniforms(colors)
    advanceHoneyDipper(u, -1, 1)
    expect(u.uFlowOffset?.value).toBe(0)
  })
})
