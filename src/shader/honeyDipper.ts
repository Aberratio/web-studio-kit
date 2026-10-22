import { Color, Vector3, type IUniform } from 'three'

export interface HoneyDipperColors {
  /** Thin honey with light behind it: the bright, golden colour. */
  honey: string
  /** Thick honey and the background's warm darks. */
  honeyDeep: string
  /** The dipper's wood. */
  wood: string
  /** The light behind the scene: sun glow, rim light and bokeh. */
  sun: string
}

/**
 * Where the dipper sits on screen. `x` and `y` move it, in screen heights from the centre
 * (positive is right and up); `scale` sizes it (1 fills about half the screen height).
 */
export interface HoneyDipperPlacement {
  x: number
  y: number
  scale: number
}

/** Named placements: `right` leaves room for text on the left, `top` for text below. */
export const HONEY_DIPPER_LAYOUTS = {
  center: { x: 0, y: 0, scale: 1 },
  right: { x: 0.36, y: 0.02, scale: 1.05 },
  top: { x: 0.03, y: 0.2, scale: 0.62 },
} as const satisfies Record<string, HoneyDipperPlacement>

export type HoneyDipperLayout = keyof typeof HONEY_DIPPER_LAYOUTS | HoneyDipperPlacement

export interface HoneyDipperOptions {
  /** How fast the honey runs and drips. Default 1. */
  flowSpeed?: number
  /** Where the dipper sits. Default `'center'`. */
  layout?: HoneyDipperLayout
  /** How much scrolling speeds up the flow: at scroll 1 it runs this many times faster. Default 3. */
  scrollBoost?: number
}

/** Uniforms for `honeyDipperFragmentShader`, to pass to `<ShaderPlane uniforms>`. */
export function honeyDipperUniforms(
  colors: HoneyDipperColors,
  { flowSpeed = 1, layout = 'center', scrollBoost = 3 }: HoneyDipperOptions = {},
): Record<string, IUniform> {
  const place = resolveHoneyDipperLayout(layout)
  return {
    uHoney: { value: new Color(colors.honey) },
    uHoneyDeep: { value: new Color(colors.honeyDeep) },
    uWood: { value: new Color(colors.wood) },
    uSun: { value: new Color(colors.sun) },
    uFlowSpeed: { value: Math.max(0, flowSpeed) },
    uFlowBoost: { value: Math.max(0, scrollBoost) },
    // Extra flow time gathered while scrolling; see advanceHoneyDipper.
    uFlowOffset: { value: 0 },
    uLayout: { value: new Vector3(place.x, place.y, place.scale) },
  }
}

/** A layout name or placement as a placement, with the scale kept positive. */
export function resolveHoneyDipperLayout(layout: HoneyDipperLayout): HoneyDipperPlacement {
  const place = typeof layout === 'string' ? HONEY_DIPPER_LAYOUTS[layout] : layout
  return { x: place.x, y: place.y, scale: Math.max(0.05, place.scale) }
}

/** Moves the dipper, for example when the viewport switches between wide and narrow. */
export function setHoneyDipperLayout(
  uniforms: Record<string, IUniform>,
  layout: HoneyDipperLayout,
) {
  const place = resolveHoneyDipperLayout(layout)
  ;(uniforms.uLayout?.value as Vector3 | undefined)?.set(place.x, place.y, place.scale)
}

/**
 * Lets scrolling speed up the flow without the drips jumping: call it every frame with the
 * frame's delta (seconds) and the current scroll (0..1), for example from ShaderPlane's
 * `onFrame`. Without it the honey still runs, just at a constant speed.
 */
export function advanceHoneyDipper(
  uniforms: Record<string, IUniform>,
  delta: number,
  scroll: number,
) {
  const offset = uniforms.uFlowOffset
  if (!offset) return
  const speed = (uniforms.uFlowSpeed?.value as number | undefined) ?? 1
  const boost = (uniforms.uFlowBoost?.value as number | undefined) ?? 0
  const extra = Math.max(0, Math.min(1, scroll)) * boost
  offset.value = (offset.value as number) + Math.max(0, delta) * speed * extra
}

/**
 * A backlit close-up of a wooden honey dipper with thick honey running off it, raymarched as
 * signed distance fields: a grooved head and a handle running out of frame, a honey coat on
 * the head's lower side and a stream whose drops stretch and break off. The sun sits behind
 * and above, so the honey glows by its thickness, with fresnel and specular highlights.
 *
 * The pointer turns and tilts the dipper, `uScroll` darkens the scene and (with
 * `advanceHoneyDipper`) speeds up the flow. Rays that miss the dipper's bounds skip the march,
 * and the march stops after 80 steps, so render it at a reduced pixel ratio.
 */
export const honeyDipperFragmentShader = /* glsl */ `
precision highp float;

uniform float uTime;
uniform vec2 uMouse;
uniform float uScroll;
uniform vec2 uResolution;
uniform vec3 uHoney;
uniform vec3 uHoneyDeep;
uniform vec3 uWood;
uniform vec3 uSun;
uniform float uFlowSpeed;
uniform float uFlowBoost;
uniform float uFlowOffset;
uniform vec3 uLayout;
varying vec2 vUv;

#define MAX_STEPS 80
#define HEAD_H 0.62
#define RIDGES 6.0
#define FOCAL 2.1
#define CAM_Z 5.0

// Scene state, computed once per pixel in main().
mat3 gM;        // dipper local to world rotation; local +y runs up the handle
vec3 gC;        // centre of the head
vec3 gAxis;     // world direction of the handle
vec3 gTip;      // where the stream leaves the head
float gFlow;    // flow clock
float gEndY;    // lower end of the attached stream
float gHangR;   // radius of the drop hanging from the stream
float gHangS;   // its vertical stretch
float gNeck;    // how thin the stream gets just above the hanging drop
float gFallY;   // centre of the drop that broke off
float gFallR;
float gFallS;

const vec3 SUN_DIR = vec3(0.34, 0.56, -0.76);   // toward the sun: behind and above
const vec3 FILL_DIR = vec3(-0.62, 0.38, 0.69);  // a dim fill from the front left

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float smax(float a, float b, float k) {
  return -smin(-a, -b, k);
}

float sdRoundBox2(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

// Cone with rounded ends along y, from radius r1 at y = 0 to r2 at y = h.
float sdRoundConeY(vec3 p, float r1, float r2, float h) {
  vec2 q = vec2(length(p.xz), p.y);
  float b = (r1 - r2) / h;
  float a = sqrt(1.0 - b * b);
  float k = dot(q, vec2(-b, a));
  if (k < 0.0) return length(q) - r1;
  if (k > a * h) return length(q - vec2(0.0, h)) - r2;
  return dot(q, vec2(a, b)) - r1;
}

float sdEllipsoid(vec3 p, vec3 r) {
  float k0 = length(p / r);
  float k1 = length(p / (r * r));
  return k0 * (k0 - 1.0) / k1;
}

// Outer radius of the head along its axis: full in the middle, rounded at the ends.
float headRadius(float s) {
  float u = s / (HEAD_H + 0.16);
  return 0.31 * sqrt(max(0.0, 1.0 - u * u));
}

float ridge(vec2 rs, float k) {
  float cell = 2.0 * HEAD_H / RIDGES;
  float centre = -HEAD_H + cell * (k + 0.5);
  return sdRoundBox2(vec2(rs.x, rs.y - centre), vec2(headRadius(centre), cell * 0.3), 0.045);
}

float sdWood(vec3 p) {
  vec3 q = (p - gC) * gM;
  float rho = length(q.xz);
  vec2 rs = vec2(rho, q.y);

  // Grooved head: a core with a row of rounded discs. Check the nearest disc and its neighbour.
  float cell = 2.0 * HEAD_H / RIDGES;
  float f = (q.y + HEAD_H) / cell - 0.5;
  float k = clamp(floor(f + 0.5), 0.0, RIDGES - 1.0);
  float k2 = clamp(k + (f > k ? 1.0 : -1.0), 0.0, RIDGES - 1.0);
  float head = min(ridge(rs, k), ridge(rs, k2));
  float core = sdRoundBox2(rs, vec2(0.16, HEAD_H + 0.03), 0.05);
  head = smin(head, core, 0.03);

  // Neck and a handle long enough to leave the frame.
  float neck = sdRoundConeY(q - vec3(0.0, HEAD_H - 0.02, 0.0), 0.15, 0.07, 0.3);
  float handle = sdRoundConeY(q - vec3(0.0, HEAD_H + 0.28, 0.0), 0.07, 0.085, 9.0);
  float collar = length(vec2(rho - 0.075, q.y - HEAD_H - 0.52)) - 0.025;
  return min(smin(head, min(neck, handle), 0.04), collar);
}

float sdHoney(vec3 p) {
  vec3 q = (p - gC) * gM;
  float rho = length(q.xz);

  // A coat over the lower side of the head: the grooved shape, softened and grown, so the
  // ridges still show through. Its upper edge sags in slow drips.
  vec2 rs = vec2(rho, q.y);
  float cell = 2.0 * HEAD_H / RIDGES;
  // Blend three neighbouring discs so the coat stays continuous across disc boundaries.
  float k = clamp(floor((q.y + HEAD_H) / cell), 1.0, RIDGES - 2.0);
  float shell = smin(ridge(rs, k - 1.0), ridge(rs, k), 0.06);
  shell = smin(shell, ridge(rs, k + 1.0), 0.06);
  shell = smin(shell, sdRoundBox2(rs, vec2(0.16, HEAD_H), 0.05), 0.1);
  shell -= 0.05;
  float edge = 0.05 * sin(atan(q.z, q.x) * 3.0 + q.y * 5.0 + gFlow * 0.25)
    + 0.025 * sin(q.y * 13.0 - gFlow * 0.4);
  float level = (p.y - gC.y) * 0.8 + q.y * 0.4 + 0.02 + edge;
  float honey = smax(shell, level, 0.1);

  // Honey gathers at the lowest rim before it lets go.
  honey = smin(honey, length(p - gTip - vec3(0.0, -0.05, 0.0)) - 0.11, 0.14);

  // The stream: thins as it falls, with slow beads running down it, pinched above the drop.
  vec3 s = p - gTip;
  float fall = max(0.0, -s.y);
  float r = 0.085 / sqrt(1.0 + fall * 3.0);
  r *= 1.0 + 0.16 * smoothstep(0.55, 1.0, sin(fall * 9.0 - gFlow * 3.2));
  r *= mix(gNeck, 1.0, smoothstep(gEndY + 0.02, gEndY + 0.4, p.y));
  float sway = 0.025 * sin(gFlow * 0.7 + fall * 2.0) * fall;
  float stream = length(s.xz - vec2(sway, 0.0)) - r;
  stream = smax(max(stream * 0.8, s.y - 0.05), gEndY - p.y, 0.04);
  honey = smin(honey, stream, 0.09);

  // The drop hanging from the end of the stream, and the one that broke off.
  vec3 hang = vec3(gTip.x, gEndY - gHangR * gHangS * 0.55, gTip.z);
  honey = smin(honey, sdEllipsoid(p - hang, vec3(gHangR, gHangR * gHangS, gHangR)), 0.07);
  vec3 drop = vec3(gTip.x, gFallY, gTip.z);
  honey = min(honey, sdEllipsoid(p - drop, vec3(gFallR, gFallR * gFallS, gFallR)));
  return honey;
}

// x: distance, y: material (0 wood, 1 honey).
vec2 map(vec3 p) {
  float w = sdWood(p);
  float h = sdHoney(p);
  return h < w ? vec2(h, 1.0) : vec2(w, 0.0);
}

vec3 calcNormal(vec3 p) {
  const vec2 e = vec2(1.0, -1.0) * 0.0015;
  return normalize(
    e.xyy * map(p + e.xyy).x + e.yyx * map(p + e.yyx).x +
    e.yxy * map(p + e.yxy).x + e.xxx * map(p + e.xxx).x
  );
}

// Nearest entry of a ray into a capsule, or -1. After Inigo Quilez.
float capsuleHit(vec3 ro, vec3 rd, vec3 a, vec3 b, float r) {
  vec3 ba = b - a;
  vec3 oa = ro - a;
  float baba = dot(ba, ba);
  float bard = dot(ba, rd);
  float baoa = dot(ba, oa);
  float rdoa = dot(rd, oa);
  float oaoa = dot(oa, oa);
  float qa = baba - bard * bard;
  float qb = baba * rdoa - baoa * bard;
  float qc = baba * oaoa - baoa * baoa - r * r * baba;
  float h = qb * qb - qa * qc;
  if (h >= 0.0) {
    float t = (-qb - sqrt(h)) / qa;
    float y = baoa + t * bard;
    if (y > 0.0 && y < baba) return t;
    vec3 oc = (y <= 0.0) ? oa : ro - b;
    qb = dot(rd, oc);
    qc = dot(oc, oc) - r * r;
    h = qb * qb - qc;
    if (h > 0.0) return -qb - sqrt(h);
  }
  return -1.0;
}

// The dark warm backdrop: gradient, sun glow and soft bokeh. p is in dipper space, sp on screen.
vec3 backdrop(vec2 p, vec2 sp) {
  vec3 col = mix(uHoneyDeep * 0.006, uHoneyDeep * 0.04, smoothstep(-0.7, 0.8, sp.y));
  vec2 g = p - vec2(0.3, 0.62);
  float d2 = dot(g, g);
  col += uSun * 0.5 * exp(-d2 * 10.0) + mix(uSun, uHoney, 0.75) * (0.2 * exp(-d2 * 2.8) + 0.035 * exp(-sqrt(d2) * 1.8));
  col += uHoney * 0.03 * exp(-dot(p - vec2(-0.1, -0.1), p - vec2(-0.1, -0.1)) * 1.5);

  // Two layers of out-of-focus discs drifting up, brighter near the sun.
  for (int layer = 0; layer < 2; layer++) {
    float size = layer == 0 ? 0.21 : 0.13;
    vec2 c = sp / size + vec2(float(layer) * 7.3, uTime * (0.012 + float(layer) * 0.01) / size);
    vec2 id = floor(c);
    float rnd = hash(id + float(layer) * 13.1);
    if (rnd > 0.22) continue;
    vec2 centre = id + 0.5 + (vec2(hash(id + 3.7), hash(id + 9.1)) - 0.5) * 0.5;
    float r = mix(0.12, 0.26, hash(id + 5.3));
    float d = length(c - centre);
    float disc = smoothstep(r, r * 0.82, d) * (0.65 + 0.35 * smoothstep(r * 0.4, r, d));
    float near = 0.35 + exp(-d2 * 2.0);
    col += mix(uSun, uHoney, rnd * 4.5) * disc * near * (layer == 0 ? 0.05 : 0.03);
  }
  return col;
}

// What a glossy surface reflects: the same warm room, with the sun and a fill window in it.
vec3 environment(vec3 r) {
  vec3 col = mix(uHoneyDeep * 0.03, uHoneyDeep * 0.2 + uSun * 0.05, smoothstep(-0.4, 0.8, r.y));
  col += uSun * 3.0 * pow(max(dot(r, normalize(SUN_DIR)), 0.0), 24.0);
  col += vec3(1.0, 0.93, 0.82) * 0.7 * pow(max(dot(r, normalize(FILL_DIR)), 0.0), 220.0);
  return col;
}

vec3 woodShade(vec3 p, vec3 n, vec3 rd) {
  vec3 q = (p - gC) * gM;
  float ang = atan(q.z, q.x);
  // Grain runs along the axis.
  float grain = noise(vec2(ang * 4.0, q.y * 1.6)) * 0.6 + noise(vec2(ang * 22.0, q.y * 3.0)) * 0.4;
  vec3 albedo = uWood * (0.62 + 0.55 * grain);
  vec3 L = normalize(SUN_DIR);
  vec3 F = normalize(FILL_DIR);

  // Cheap occlusion from the wood itself, so the grooves read.
  float occ = clamp(0.35 + sdWood(p + n * 0.06) * 10.0, 0.0, 1.0);
  float facing = max(dot(n, -rd), 0.0);
  vec3 col = albedo * (uSun * 1.3 * max(dot(n, L), 0.0) + vec3(1.0, 0.92, 0.82) * 0.45 * max(dot(n, F), 0.0));
  col += albedo * uHoneyDeep * 0.35;
  col *= occ;
  col += uSun * pow(1.0 - facing, 3.0) * 0.9 * clamp(dot(n, L) + 0.55, 0.0, 1.0);
  col += uSun * 0.25 * pow(max(dot(reflect(rd, n), L), 0.0), 16.0);
  return col;
}

// Thickness-tinted honey: thin is golden, thick goes deep amber.
vec3 honeyTint(float t) {
  return mix(uHoney * 1.15, uHoneyDeep, smoothstep(0.02, 0.5, t)) * exp(-t * 1.8);
}

vec3 honeyShade(vec3 p, vec3 n, vec3 rd, vec2 lp, vec2 sp) {
  vec3 L = normalize(SUN_DIR);
  float facing = max(dot(n, -rd), 0.0);
  float fres = 0.04 + 0.96 * pow(1.0 - facing, 5.0);

  // Look through the honey: how much of it the ray crosses, and whether wood is behind.
  vec3 rr = refract(rd, n, 1.0 / 1.49);
  // A per-pixel jitter turns the march's banding into fine noise, which the grain hides.
  float jitter = hash(gl_FragCoord.xy);
  vec3 pos = p - n * 0.01 - rr * 0.045 * jitter;
  float thick = -0.045 * jitter;
  float nearWood = 1.0;
  for (int i = 0; i < 10; i++) {
    pos += rr * 0.045;
    float w = sdWood(pos);
    nearWood = min(nearWood, w);
    if (w < 0.0 || sdHoney(pos) > 0.0) break;
    thick += 0.045;
  }
  // Blend rather than switch, so the edge of the wood under the honey stays smooth.
  vec3 behind = mix(
    backdrop(lp + rr.xy * 0.12, sp + rr.xy * 0.12),
    woodShade(pos, -rr, rd) * 1.2 + uHoney * 0.22,
    smoothstep(0.04, 0.0, nearWood)
  );

  // Light reaching this point through the honey from the sun behind it.
  float toSun = 0.0;
  for (int i = 1; i <= 4; i++) {
    toSun += step(sdHoney(p - n * 0.02 + L * (0.07 * float(i))), 0.0);
  }
  float lightThick = toSun * 0.07;
  float forward = pow(max(dot(rd, L), 0.0), 3.0);
  thick = max(thick, 0.0);
  float rim = 1.0 - facing;
  vec3 glow = uSun * honeyTint(lightThick * 1.2 + thick * 0.5) * (0.7 + 4.4 * forward) * (0.75 + 1.6 * rim * rim);

  vec3 col = behind * honeyTint(thick) * 1.35 + glow;
  col = mix(col, environment(reflect(rd, n)), fres);
  // Crisp highlights and a softer sheen make it read as wet.
  vec3 h = normalize(normalize(FILL_DIR) - rd);
  float nh = max(dot(n, h), 0.0);
  col += vec3(1.0, 0.95, 0.85) * (1.2 * pow(nh, 260.0) + 0.12 * pow(nh, 24.0));
  col += uSun * 1.1 * pow(max(dot(reflect(rd, n), L), 0.0), 30.0);
  return col;
}

void main() {
  vec2 sp = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
  vec2 lp = (sp - uLayout.xy) / uLayout.z;

  // The pointer turns (yaw) and tilts (pitch) the dipper; a slow sway keeps it alive.
  float yaw = (uMouse.x - 0.5) * 0.8 + 0.07 * sin(uTime * 0.21);
  float pitch = (0.5 - uMouse.y) * 0.4 + 0.04 * sin(uTime * 0.17 + 1.3);
  float cy = cos(yaw), sy = sin(yaw), cp = cos(pitch), spi = sin(pitch);
  mat3 rot = mat3(cy, 0.0, -sy, 0.0, 1.0, 0.0, sy, 0.0, cy) * mat3(1.0, 0.0, 0.0, 0.0, cp, spi, 0.0, -spi, cp);
  vec3 axis0 = normalize(vec3(0.62, 0.74, -0.16));
  vec3 t1 = normalize(cross(axis0, vec3(0.0, 0.0, 1.0)));
  gM = rot * mat3(t1, axis0, cross(t1, axis0));
  gAxis = gM[1];
  gC = vec3(0.1, 0.32, 0.0);

  // The stream leaves from the lowest point of the lowest ridge.
  float cell = 2.0 * HEAD_H / RIDGES;
  float lowS = -HEAD_H + cell * 0.5;
  vec3 down = normalize(vec3(0.0, -1.0, 0.0) - gAxis * dot(vec3(0.0, -1.0, 0.0), gAxis));
  gTip = gC + gAxis * lowS + down * (headRadius(lowS) + 0.02);

  // One drip cycle: the drop at the end of the stream fills and stretches, then breaks off
  // and falls while the stream end springs back up.
  gFlow = uTime * uFlowSpeed + uFlowOffset;
  float cycle = gFlow / 4.2;
  float phase = fract(cycle);
  float yA = gTip.y - 0.5;
  float stretchLen = 0.42;
  if (phase < 0.72) {
    float a = phase / 0.72;
    gEndY = yA - stretchLen * a * a;
    gHangR = mix(0.06, 0.105, a);
    gHangS = 1.0 + 0.7 * a * a;
    gNeck = mix(1.0, 0.3, a * a);
    gFallY = -100.0;
    gFallR = 0.05;
    gFallS = 1.0;
  } else {
    float b = (phase - 0.72) / 0.28;
    float e = b * b * (3.0 - 2.0 * b);
    gEndY = mix(yA - stretchLen, yA, e);
    gHangR = 0.06 * smoothstep(0.0, 1.0, b);
    gHangS = mix(1.4, 1.0, b);
    gNeck = mix(0.3, 1.0, e);
    float tau = (phase - 0.72) * 4.2;
    gFallR = 0.1;
    gFallS = mix(1.9, 1.15, smoothstep(0.0, 0.5, b));
    gFallY = yA - stretchLen - 0.12 - 2.2 * tau * tau;
  }

  vec3 ro = vec3(0.0, 0.0, CAM_Z);
  vec3 rd = normalize(vec3(lp, -FOCAL));
  vec3 col = backdrop(lp, sp);

  // Skip the march for rays that miss the head, the handle and the stream.
  float tHead = capsuleHit(ro, rd, gC - gAxis * (HEAD_H + 0.3), gC + gAxis * (HEAD_H + 0.1), 0.5);
  float tHandle = capsuleHit(ro, rd, gC + gAxis * HEAD_H, gC + gAxis * (HEAD_H + 9.5), 0.16);
  float tStream = capsuleHit(ro, rd, gTip + vec3(0.0, 0.1, 0.0), vec3(gTip.x, -6.0, gTip.z), 0.24);
  float tMin = 1e5;
  if (tHead > 0.0) tMin = min(tMin, tHead);
  if (tHandle > 0.0) tMin = min(tMin, tHandle);
  if (tStream > 0.0) tMin = min(tMin, tStream);

  if (tMin < 1e4) {
    float t = tMin;
    vec2 hit = vec2(1.0, -1.0);
    for (int i = 0; i < MAX_STEPS; i++) {
      vec2 h = map(ro + rd * t);
      if (h.x < 0.0012 * t) { hit = vec2(t, h.y); break; }
      t += h.x * 0.85;
      if (t > CAM_Z + 4.0) break;
    }
    if (hit.y >= 0.0) {
      vec3 p = ro + rd * hit.x;
      vec3 n = calcNormal(p);
      col = hit.y > 0.5 ? honeyShade(p, n, rd, lp, sp) : woodShade(p, n, rd);
    }
  }

  // Scroll dims the scene; a soft vignette and gentle highlight roll-off finish it.
  col *= 1.0 - 0.38 * clamp(uScroll, 0.0, 1.0);
  col *= 1.0 - 0.55 * dot(sp * vec2(0.6, 0.9), sp * vec2(0.6, 0.9));
  col = col * (1.0 + col / 6.0) / (1.0 + col);
  gl_FragColor = vec4(col, 1.0);
}
`
