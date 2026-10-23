import { BackSide, Color, FrontSide, Mesh, MeshBasicMaterial, Vector3 } from 'three'
import { createBacklitEnvironmentScene } from './BacklitEnvironment.js'

function mesh(name: string, scene = createBacklitEnvironmentScene()) {
  const object = scene.getObjectByName(name)
  if (!(object instanceof Mesh)) throw new Error(`no mesh ${name}`)
  return object as Mesh<never, MeshBasicMaterial>
}

describe('createBacklitEnvironmentScene', () => {
  it('puts the sun up, right and behind the subject, and the rim on the other side', () => {
    const scene = createBacklitEnvironmentScene()
    const sun = mesh('sun', scene).position
    const rim = mesh('rim', scene).position
    expect(sun.x).toBeGreaterThan(0)
    expect(sun.y).toBeGreaterThan(0)
    expect(sun.z).toBeLessThan(0)
    expect(rim.x).toBeLessThan(0)
    expect(rim.z).toBeLessThan(0)
  })

  it('turns the panels to face the cube camera at the origin, and the room inwards', () => {
    const scene = createBacklitEnvironmentScene()
    for (const name of ['sun', 'rim']) {
      const panel = mesh(name, scene)
      panel.updateMatrixWorld()
      // The plane's front face points along its local +Z.
      const front = new Vector3(0, 0, 1).transformDirection(panel.matrixWorld)
      const toOrigin = panel.position.clone().negate().normalize()
      expect(front.dot(toOrigin)).toBeCloseTo(1)
      expect(panel.material.side).toBe(FrontSide)
    }
    expect(mesh('room', scene).material.side).toBe(BackSide)
  })

  it('makes the sun brighter than white and the room dark', () => {
    const sun = mesh('sun').material.color
    const room = mesh('room').material.color
    expect(Math.max(sun.r, sun.g, sun.b)).toBeGreaterThan(1)
    expect(Math.max(room.r, room.g, room.b)).toBeLessThan(0.05)
  })

  it('keeps defaults for options passed as undefined', () => {
    const a = mesh('sun', createBacklitEnvironmentScene({ sun: undefined, intensity: undefined }))
    const b = mesh('sun')
    expect(a.material.color.equals(b.material.color)).toBe(true)
  })

  it('follows a custom sun direction and colour', () => {
    const scene = createBacklitEnvironmentScene({
      sunDirection: [-1, 0, -1],
      sun: '#ff0000',
      intensity: 2,
    })
    const sun = mesh('sun', scene)
    expect(
      sun.position
        .clone()
        .normalize()
        .dot(new Vector3(-1, 0, -1).normalize()),
    ).toBeCloseTo(1)
    expect(sun.material.color.equals(new Color('#ff0000').multiplyScalar(2))).toBe(true)
  })
})
