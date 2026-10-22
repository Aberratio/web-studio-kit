import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

// jsdom has no ResizeObserver; Lenis needs one to measure the page.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

/** jsdom has no matchMedia; tests set `reduced` to simulate the OS setting. */
export const media = { reduced: false }

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: query.includes('reduce') ? media.reduced : false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }),
})
