import { computeScrollProgress } from './progress.js'

describe('computeScrollProgress', () => {
  const vh = 800

  it('is 0 before the element enters', () => {
    expect(computeScrollProgress({ top: 900, height: 400 }, vh)).toBe(0)
  })

  it('is 0 as the top edge touches the bottom of the viewport', () => {
    expect(computeScrollProgress({ top: 800, height: 400 }, vh)).toBe(0)
  })

  it('is halfway when the element is centred in its travel', () => {
    expect(computeScrollProgress({ top: 200, height: 400 }, vh)).toBe(0.5)
  })

  it('is 1 once the element has left', () => {
    expect(computeScrollProgress({ top: -400, height: 400 }, vh)).toBe(1)
    expect(computeScrollProgress({ top: -1000, height: 400 }, vh)).toBe(1)
  })

  it('does not divide by zero', () => {
    expect(computeScrollProgress({ top: 0, height: 0 }, 0)).toBe(0)
  })
})
