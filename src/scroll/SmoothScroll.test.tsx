import { render, screen } from '@testing-library/react'
import { media } from '../test/setup.js'
import { SmoothScroll, useLenis } from './SmoothScroll.js'

function Probe() {
  return <p>{useLenis() ? 'smooth' : 'native'}</p>
}

describe('SmoothScroll', () => {
  it('keeps native scrolling under prefers-reduced-motion', () => {
    media.reduced = true
    render(
      <SmoothScroll>
        <Probe />
      </SmoothScroll>,
    )
    expect(screen.getByText('native')).toBeTruthy()
  })

  it('keeps native scrolling when disabled', () => {
    media.reduced = false
    render(
      <SmoothScroll enabled={false}>
        <Probe />
      </SmoothScroll>,
    )
    expect(screen.getByText('native')).toBeTruthy()
  })

  it('starts Lenis otherwise', async () => {
    media.reduced = false
    render(
      <SmoothScroll>
        <Probe />
      </SmoothScroll>,
    )
    expect(await screen.findByText('smooth')).toBeTruthy()
  })
})
