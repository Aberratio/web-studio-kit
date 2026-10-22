import { act, render, screen } from '@testing-library/react'
import { media } from '../test/setup.js'
import { QualityGate } from './QualityGate.js'

function renderGate(lazy = true) {
  return render(
    <QualityGate fallback={<p>static</p>} lazy={lazy}>
      <p>scene</p>
    </QualityGate>,
  )
}

describe('QualityGate', () => {
  beforeEach(() => {
    media.reduced = false
    window.history.replaceState(null, '', '/')
  })

  it('renders the fallback when the device does not qualify', async () => {
    // jsdom has no WebGL, so detection lands on light.
    renderGate(false)
    expect(await screen.findByText('static')).toBeTruthy()
    expect(screen.queryByText('scene')).toBeNull()
  })

  it('renders the full version when forced to full', async () => {
    window.history.replaceState(null, '', '/?quality=full')
    renderGate(false)
    expect(await screen.findByText('scene')).toBeTruthy()
  })

  it('mounts at once when there is no IntersectionObserver to wait for', async () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    window.history.replaceState(null, '', '/?quality=full')
    renderGate(true)
    expect(await screen.findByText('scene')).toBeTruthy()
  })

  it('waits for the viewport when lazy', async () => {
    type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void
    let trigger: Callback = () => {}
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: Callback) {
          trigger = callback
        }
        observe() {}
        disconnect() {}
      },
    )
    window.history.replaceState(null, '', '/?quality=full')
    renderGate(true)
    expect(await screen.findByText('static')).toBeTruthy()
    expect(screen.queryByText('scene')).toBeNull()
    act(() => trigger([{ isIntersecting: true }]))
    expect(await screen.findByText('scene')).toBeTruthy()
  })
})
