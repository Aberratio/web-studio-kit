'use client'

import { useSyncExternalStore } from 'react'
import { REDUCED_MOTION_QUERY } from './detect.js'

function subscribe(onChange: () => void) {
  const query = window.matchMedia?.(REDUCED_MOTION_QUERY)
  query?.addEventListener('change', onChange)
  return () => query?.removeEventListener('change', onChange)
}

const getSnapshot = () => window.matchMedia?.(REDUCED_MOTION_QUERY).matches ?? false
// The server cannot know, so it assumes reduced motion: the calm version renders first.
const getServerSnapshot = () => true

/** True when the user asked the OS for reduced motion. Updates live. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
