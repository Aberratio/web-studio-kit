# web-studio-kit

Shared building blocks for custom, 3D-heavy client websites: React Three Fiber scenes, GLSL shaders, smooth scrolling and the light-mode fallback that keeps every site usable without WebGL.

Client sites install a pinned version straight from GitHub:

```sh
npm install github:aberratio/web-studio-kit#v0.3.0
```

npm runs the `prepare` script on install, which builds `dist/` from source. Nothing built is committed.

## Peer dependencies

The site provides these, so there is exactly one copy of each:

| Package                       | Range     |
| ----------------------------- | --------- |
| `react`, `react-dom`          | `^19`     |
| `three`                       | `>=0.170` |
| `@react-three/fiber`          | `^9`      |
| `gsap`                        | `^3.13`   |
| `@react-three/postprocessing` | `^3`      |
| `postprocessing`              | `^6.36`   |

`lenis` is a regular dependency. All dependencies are free and open source. No paid libraries.

## Exports

### Quality tier and fallbacks

- `useQualityTier(thresholds?)` returns `'light'` or `'full'`. Light when the user prefers reduced motion, WebGL is missing, Save-Data is on, or the device has fewer than 4 cores or 4 GB of memory. It starts as `'light'` (also on the server), so the fallback always renders first.
- `useQuality()` returns `{ tier, reasons }`, for debugging why a device got light mode.
- `<QualityGate fallback={...}>` renders its children (the full scene) only on a full-tier device and only once it nears the viewport. Everywhere else it renders `fallback`. Pair it with `next/dynamic` so three.js is not even downloaded in light mode. For a scene above the fold, add `idle` (since v0.2.1): it mounts once the browser is idle, so the page paints its largest content before the scene's JavaScript runs.
- `useReducedMotion()` follows `prefers-reduced-motion` live.
- `detectQualityTier(signals, thresholds?)` is the pure decision behind the hook.

Add `?quality=light` or `?quality=full` to any URL to force a tier while testing.

```tsx
const HeroScene = dynamic(() => import('./HeroScene'), { ssr: false })

<QualityGate fallback={<div className="hero-gradient" />}>
  <HeroScene />
</QualityGate>
```

### Scrolling

- `<SmoothScroll>` wraps the page in Lenis, driven by the GSAP ticker so ScrollTrigger and Lenis share one frame loop. It does nothing under `prefers-reduced-motion`. Import `lenis/dist/lenis.css` once in the app.
- `useLenis()` returns the running Lenis instance, or `null` when scrolling is native.
- `useScrollProgress(ref, { cssVar?, onChange? })` tracks how far an element has travelled through the viewport (0 when its top enters at the bottom, 1 when its bottom leaves at the top). It returns a ref rather than state, and writes `--scroll-progress` on the element so CSS can animate from it without a React render.

### Shaders

- `<ShaderPlane fragmentShader uniforms scroll timeScale paused />` draws a full-screen GLSL plane inside an R3F `<Canvas>`. Every shader gets `vUv` and the uniforms `uTime`, `uMouse` (0..1, origin bottom-left, smoothed, tracked over the whole window), `uScroll` and `uResolution`. `scroll` takes a number or a ref, such as the one `useScrollProgress` returns.
- `defaultFragmentShader` and `shaderPlaneVertexShader` are the starting sources.
- `fluidFragmentShader` with `fluidUniforms({ deep, mid, highlight }, { viscosity, distortion })` is a slow, glossy liquid (honey, oil, molten glass). The pointer pushes it, scroll darkens it.
- `honeyDipperFragmentShader` with `honeyDipperUniforms({ honey, honeyDeep, wood, sun }, { flowSpeed, layout, scrollBoost })` (since v0.3.0) is a backlit close-up of a wooden honey dipper, raymarched from signed distance fields with no model files: a grooved head, a handle running out of frame, a honey coat on the head's lower side and a stream whose drops stretch and break off. The sun sits behind and above, so the honey glows by its thickness. The pointer turns and tilts the dipper and scroll darkens the scene.
  - `layout` is `'center'`, `'right'` (text on the left), `'top'` (text below) or `{ x, y, scale }`. Change it later with `setHoneyDipperLayout(uniforms, layout)`, for example from a `matchMedia` listener.
  - To let scroll speed up the flow without the drips jumping, pass `onFrame={(u, delta, scroll) => advanceHoneyDipper(u, delta, scroll)}` to `ShaderPlane`.
  - Cost: rays that miss the dipper's bounds skip the march and the march stops after 80 steps, but it is still a raymarcher. Render it at a reduced pixel ratio (honey is soft anyway), for example `<SceneCanvas dpr={[0.6, 1]}>`.
- `ShaderPlane`'s `onFrame(uniforms, delta, scroll)` (since v0.3.0) runs every frame after the built-in uniforms update, for shaders that keep their own state.

```tsx
const uniforms = useMemo(
  () =>
    honeyDipperUniforms(
      { honey: '#f6a91f', honeyDeep: '#6e2a03', wood: '#9a6634', sun: '#ffc164' },
      { layout: 'right' },
    ),
  [],
)

<SceneCanvas dpr={[0.6, 1]}>
  <ShaderPlane
    fragmentShader={honeyDipperFragmentShader}
    uniforms={uniforms}
    scroll={scrollRef}
    onFrame={(u, delta, scroll) => advanceHoneyDipper(u, delta, scroll)}
  />
  <PostFX bloom={0.5} bloomThreshold={0.8} grain={0.04} />
</SceneCanvas>
```

### Scenes and effects (since v0.2.0)

- `<SceneCanvas>` is an R3F `<Canvas>` with the studio defaults: DPR capped at 1.5, no MSAA, and no rendering while it is off screen. Use it for every scene.
- `<ParticleMorph shapes progress color size />` morphs a cloud of points between 2–4 shapes (flat xyz `Float32Array`s) as `progress` goes from 0 to `shapes.length - 1`. Particles leave at staggered times and swirl in transit. `sampleSphere` and `seededRandom` help build shapes that look the same on every load.
- `<PostFX bloom bloomThreshold grain />` adds bloom and film grain sized to the device: strong machines (8+ cores, 8+ GB) get full-resolution bloom and grain, the rest a half-resolution bloom. `detectEffectsBudget` is the pure rule.
- `<KineticText as="h2" trigger="scroll" distort>` splits text into letters that rise into place (GSAP SplitText) when it mounts or scrolls into view. `distort` adds an SVG displacement that ripples the letters on arrival and under a moving pointer. Screen readers get the whole text; under reduced motion it is plain text. For the page's Largest Contentful Paint headline use `appear="ripple"` (since v0.2.2): the text is not split, it ripples and drifts in as one piece. Splitting replaces the text with new elements once JavaScript runs, and browsers count those as a new, late LCP. `appear="settle"` keeps letters visible but still splits, so it suits headlines below the fold.

Light mode still applies: wrap every scene in `QualityGate` with a static fallback, and keep `KineticText` for text that reads fine without the animation.

## Development

```sh
npm install
npm test          # Vitest
npm run lint
npm run typecheck
npm run build     # tsc to dist/
```

## Releasing

1. Bump `version` in `package.json`.
2. Tag the commit `vX.Y.Z` and push the tag.
3. Update the pinned tag in each site that should move to it.

A tag, once a site depends on it, is never moved. A fix is a new tag.

## License

MIT
