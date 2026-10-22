import { act, render } from '@testing-library/react'
import { useRef } from 'react'
import { useScrollProgress } from './useScrollProgress.js'

function Section({ onChange }: { onChange: (value: number) => void }) {
  const ref = useRef<HTMLElement>(null)
  useScrollProgress(ref, { onChange })
  return <section ref={ref} data-testid="section" />
}

describe('useScrollProgress', () => {
  it('reports progress and writes the CSS variable', async () => {
    let top = 800
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      () => ({ top, height: 400 }) as DOMRect,
    )
    window.innerHeight = 800
    const onChange = vi.fn()
    const { getByTestId } = render(<Section onChange={onChange} />)
    expect(onChange).toHaveBeenLastCalledWith(0)

    top = 200
    await act(async () => {
      window.dispatchEvent(new Event('scroll'))
      await new Promise((resolve) => requestAnimationFrame(resolve))
    })
    expect(onChange).toHaveBeenLastCalledWith(0.5)
    expect(getByTestId('section').style.getPropertyValue('--scroll-progress')).toBe('0.5000')
  })
})
