/** A small deterministic random generator (mulberry32), so shapes look the same every load. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** `count` points spread through a sphere, denser towards the middle like a swarm. */
export function sampleSphere(
  count: number,
  radius: number,
  random = seededRandom(1),
): Float32Array {
  const points = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const u = random() * 2 - 1
    const theta = random() * Math.PI * 2
    const r = radius * Math.pow(random(), 0.6)
    const s = Math.sqrt(1 - u * u)
    points[i * 3] = r * s * Math.cos(theta)
    points[i * 3 + 1] = r * u
    points[i * 3 + 2] = r * s * Math.sin(theta)
  }
  return points
}

export const MAX_MORPH_SHAPES = 4

/**
 * Turns 2–4 shapes into the per-particle attributes ParticleMorph's shader reads. Shapes shorter
 * than the first are repeated cyclically; missing shapes repeat the last, so the morph rests there.
 */
export function buildMorphAttributes(
  shapes: Float32Array[],
  random = seededRandom(7),
): { positions: Float32Array[]; randoms: Float32Array; count: number } {
  if (shapes.length < 2 || shapes.length > MAX_MORPH_SHAPES) {
    throw new Error(`ParticleMorph needs 2 to ${MAX_MORPH_SHAPES} shapes, got ${shapes.length}`)
  }
  const count = Math.floor(shapes[0]!.length / 3)
  const positions: Float32Array[] = []
  for (let s = 0; s < MAX_MORPH_SHAPES; s++) {
    const source = shapes[Math.min(s, shapes.length - 1)]!
    const sourceCount = Math.floor(source.length / 3)
    const target = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const j = (i % sourceCount) * 3
      target[i * 3] = source[j]!
      target[i * 3 + 1] = source[j + 1]!
      target[i * 3 + 2] = source[j + 2]!
    }
    positions.push(target)
  }
  const randoms = new Float32Array(count)
  for (let i = 0; i < count; i++) randoms[i] = random()
  return { positions, randoms, count }
}
