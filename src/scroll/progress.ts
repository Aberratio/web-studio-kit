/**
 * How far an element has travelled through the viewport, from 0 to 1.
 * 0: its top edge touches the bottom of the viewport (about to enter).
 * 1: its bottom edge touches the top of the viewport (just left).
 */
export function computeScrollProgress(
  rect: { top: number; height: number },
  viewportHeight: number,
): number {
  const distance = viewportHeight + rect.height
  if (distance <= 0) return 0
  const progress = (viewportHeight - rect.top) / distance
  return Math.min(1, Math.max(0, progress))
}
