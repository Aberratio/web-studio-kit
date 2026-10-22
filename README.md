# web-studio-kit

Shared building blocks for custom, 3D-heavy client websites: React Three Fiber scenes, GLSL shaders, smooth scrolling and the light-mode fallback that keeps every site usable without WebGL.

Client sites install a pinned version straight from GitHub:

```sh
npm install github:aberratio/web-studio-kit#v0.1.0
```

npm runs the `prepare` script on install, which builds `dist/` from source. Nothing built is committed.

## Peer dependencies

The site provides these, so there is exactly one copy of each:

| Package              | Range     |
| -------------------- | --------- |
| `react`, `react-dom` | `^19`     |
| `three`              | `>=0.170` |
| `@react-three/fiber` | `^9`      |
| `gsap`               | `^3.13`   |

`lenis` is a regular dependency. All dependencies are free and open source. No paid libraries.

## Exports

### Quality tier and fallbacks

- `useQualityTier(thresholds?)` returns `'light'` or `'full'`. Light when the user prefers reduced motion, WebGL is missing, Save-Data is on, or the device has fewer than 4 cores or 4 GB of memory. It starts as `'light'` (also on the server), so the fallback always renders first.
- `useQuality()` returns `{ tier, reasons }`, for debugging why a device got light mode.
- `<QualityGate fallback={...}>` renders its children (the full scene) only on a full-tier device and only once it nears the viewport. Everywhere else it renders `fallback`. Pair it with `next/dynamic` so three.js is not even downloaded in light mode.
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

Cap the device pixel ratio on the canvas (`<Canvas dpr={[1, 1.5]}>`) to keep full-screen shaders cheap.

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
