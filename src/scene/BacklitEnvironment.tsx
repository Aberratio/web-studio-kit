'use client'

import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import {
  BackSide,
  Color,
  FrontSide,
  type ColorRepresentation,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  SphereGeometry,
} from 'three'

export interface BacklitEnvironmentOptions {
  /** Colour of the sun behind the subject. Default a warm honey light, `#ffc164`. */
  sun?: ColorRepresentation
  /** Colour of the dim rim light on the opposite side. Default `#ffd9a0`. */
  rim?: ColorRepresentation
  /** Colour of the room around everything. Default a near-black warm brown, `#0c0703`. */
  ambient?: ColorRepresentation
  /** Brightness of the sun panel; the rim follows at a quarter of it. Default 6. */
  intensity?: number
  /**
   * Where the sun sits, as a direction from the subject, in camera terms: x right, y up,
   * z towards the camera. Default `[1, 0.9, -1.2]`: up and right, behind the subject.
   */
  sunDirection?: [number, number, number]
}

const DEFAULTS = {
  sun: '#ffc164',
  rim: '#ffd9a0',
  ambient: '#0c0703',
  intensity: 6,
  sunDirection: [1, 0.9, -1.2] as [number, number, number],
}

function panel(color: Color, size: number, direction: [number, number, number], distance: number) {
  const [x, y, z] = direction
  const length = Math.hypot(x, y, z) || 1
  const mesh = new Mesh(
    new PlaneGeometry(size, size),
    new MeshBasicMaterial({ color, side: FrontSide, toneMapped: false }),
  )
  mesh.position.set((x / length) * distance, (y / length) * distance, (z / length) * distance)
  // lookAt turns the plane's front face (+Z) to the origin, where the cube camera sits.
  mesh.lookAt(0, 0, 0)
  return mesh
}

/**
 * The scene a backlit environment map is made from: a dark warm room with one big bright
 * panel (the sun) behind the subject and a smaller, dimmer one opposite it. Glass and honey
 * pick up bright edges from the panels and stay clear against the dark room, as in a
 * backlit product photo. Pure: builds three objects only, no renderer.
 */
export function createBacklitEnvironmentScene(options: BacklitEnvironmentOptions = {}): Scene {
  // Options left undefined keep their defaults.
  const given = Object.fromEntries(Object.entries(options).filter(([, v]) => v !== undefined))
  const o = { ...DEFAULTS, ...given } as typeof DEFAULTS & BacklitEnvironmentOptions
  const scene = new Scene()
  const room = new Mesh(
    new SphereGeometry(10, 32, 16),
    new MeshBasicMaterial({ color: new Color(o.ambient), side: BackSide, toneMapped: false }),
  )
  room.name = 'room'
  scene.add(room)
  const sun = panel(new Color(o.sun).multiplyScalar(o.intensity), 6, o.sunDirection, 7)
  sun.name = 'sun'
  scene.add(sun)
  const [x, y, z] = o.sunDirection
  const rim = panel(new Color(o.rim).multiplyScalar(o.intensity / 4), 3, [-x, y * 0.4, z], 7)
  rim.name = 'rim'
  scene.add(rim)
  return scene
}

/** Frees the geometry and materials of a scene made by `createBacklitEnvironmentScene`. */
function disposeScene(scene: Scene) {
  scene.traverse((object) => {
    if (object instanceof Mesh) {
      object.geometry.dispose()
      ;(object.material as MeshBasicMaterial).dispose()
    }
  })
}

export type BacklitEnvironmentProps = BacklitEnvironmentOptions

/**
 * Image-based lighting for physically based materials, lit like the hero scenes: warm light
 * from behind the subject on a dark ground. Built from a small scene on the GPU, so nothing
 * is downloaded. Put it inside a `<Canvas>`; it sets `scene.environment`.
 */
export function BacklitEnvironment(props: BacklitEnvironmentProps) {
  const get = useThree((state) => state.get)
  const { intensity, sunDirection } = props
  // Effect keys by value, so an inline `new Color(...)` does not rebuild the map every render.
  const key = (value: ColorRepresentation | undefined) =>
    value === undefined ? undefined : new Color(value).getHex()
  const sun = key(props.sun)
  const rim = key(props.rim)
  const ambient = key(props.ambient)
  const direction = sunDirection?.join(',')

  useEffect(() => {
    // Read inside the effect: the scene and renderer are three's objects, not React state.
    const { gl, scene } = get()
    const source = createBacklitEnvironmentScene({
      sun,
      rim,
      ambient,
      intensity,
      sunDirection: direction
        ? (direction.split(',').map(Number) as [number, number, number])
        : undefined,
    })
    const pmrem = new PMREMGenerator(gl)
    const environment = pmrem.fromScene(source, 0.02).texture
    scene.environment = environment
    disposeScene(source)
    return () => {
      scene.environment = null
      environment.dispose()
      pmrem.dispose()
    }
  }, [get, sun, rim, ambient, intensity, direction])

  return null
}
