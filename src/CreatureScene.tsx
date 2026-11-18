import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { Color, Object3D, type Group, type InstancedMesh, type OrthographicCamera } from 'three';
import type { Allele, Individual } from './individuals';
import { exchangeDuration } from './labMotion';

export const alleleColors: Record<Allele, string> = { A: '#49e9b9', B: '#ff8da8' };

type SceneProps = {
  individuals: Individual[];
  selected: number;
  onSelect: (index: number) => void;
  population: number;
  generation: number;
  reducedMotion: boolean;
  onFailure: () => void;
};

type Part = {
  individual: number;
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  angle: number;
  color: string;
};

const bodies = ['#a9afb7', '#b3acb5', '#aab8b4', '#c0b8ae'];

function layout(count: number) {
  const columns = count <= 24 ? Math.ceil(Math.sqrt(count * 1.25)) : 8;
  const rows = Math.ceil(count / columns);
  const strideX = Math.min(1.9, 9.55 / columns);
  const strideZ = Math.min(1.58, 6.4 / rows);
  const scale = Math.min(0.87, strideX * 0.52, strideZ * 0.51);
  return Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / columns);
    const rowSize = Math.min(columns, count - row * columns);
    return {
      x: (index % columns - (rowSize - 1) / 2) * strideX,
      z: (row - (rows - 1) / 2) * strideZ,
      scale,
    };
  });
}

function creatureParts(individuals: Individual[]) {
  const parts = { body: [] as Part[], details: [] as Part[], stems: [] as Part[], circle: [] as Part[], diamond: [] as Part[] };
  individuals.forEach((pair, i) => {
    const add = (kind: keyof typeof parts, color: string, x: number, y: number, z: number, sx: number, sy: number, sz: number, angle = 0) =>
      parts[kind].push({ individual: i, x, y, z, sx, sy, sz, angle, color });
    const body = bodies[(i * 3 + Math.floor(i / 4)) % bodies.length];
    add('body', body, 0, 0.62, 0, 0.66, 0.59, 0.59);
    add('details', '#dbe5ff', 0, 0.40, 0.43, 0.39, 0.30, 0.18);
    add('details', '#212442', 0, 0.46, 0.622, 0.064, 0.037, 0.02);
    for (const side of [-1, 1]) {
      add('details', body, side * 0.47, 0.16, 0.23, 0.25, 0.15, 0.29);
      add('details', body, side * 0.58, 0.52, 0.07, 0.19, 0.24, 0.18);
      add('details', '#fcf7ff', side * 0.24, 0.72, 0.49, 0.18, 0.21, 0.11);
      add('details', '#1d233e', side * 0.223, 0.70, 0.57, 0.115, 0.137, 0.065);
      add('details', '#ffffff', side * 0.223 - 0.035, 0.755, 0.623, 0.038, 0.043, 0.023);
      add('details', '#f891b1', side * 0.37, 0.49, 0.48, 0.098, 0.049, 0.048);
      const allele = pair[side === -1 ? 0 : 1];
      add('stems', alleleColors[allele], side * 0.31, 1.25, 0, 0.043, 0.28, 0.043, side * -0.33);
      add(allele === 'A' ? 'circle' : 'diamond', alleleColors[allele],
        side * 0.41, 1.50, 0, 0.15, allele === 'A' ? 0.15 : 0.19, 0.15);
    }
  });
  return parts;
}

function Instances({ parts, positions, shape, onSelect }: {
  parts: Part[];
  positions: ReturnType<typeof layout>;
  shape: 'sphere' | 'stem' | 'diamond';
  onSelect?: (index: number) => void;
}) {
  const mesh = useRef<InstancedMesh>(null);
  const invalidate = useThree(state => state.invalidate);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const instance = mesh.current;
    const object = new Object3D();
    const color = new Color();
    parts.forEach((part, index) => {
      const { x, z, scale } = positions[part.individual];
      object.position.set(x + part.x * scale, part.y * scale, z + part.z * scale);
      object.scale.set(part.sx * scale, part.sy * scale, part.sz * scale);
      object.rotation.z = part.angle;
      object.updateMatrix();
      instance.setMatrixAt(index, object.matrix);
      instance.setColorAt(index, color.set(part.color));
    });
    instance.instanceMatrix.needsUpdate = true;
    if (instance.instanceColor) instance.instanceColor.needsUpdate = true;
    instance.computeBoundingSphere();
    invalidate();
  }, [parts, positions, invalidate]);

  if (!parts.length) return null;
  return <instancedMesh ref={mesh} args={[undefined, undefined, parts.length]}
    onClick={onSelect ? event => {
      event.stopPropagation();
      if (event.instanceId !== undefined) onSelect(parts[event.instanceId].individual);
    } : undefined}>
    {shape === 'sphere' && <sphereGeometry args={[1, 14, 10]} />}
    {shape === 'stem' && <cylinderGeometry args={[1, 1, 2, 8]} />}
    {shape === 'diamond' && <octahedronGeometry args={[1]} />}
    <meshStandardMaterial roughness={0.53} />
  </instancedMesh>;
}

function Camera() {
  const { camera, size } = useThree();
  useLayoutEffect(() => {
    const ortho = camera as OrthographicCamera;
    ortho.zoom = Math.min(size.width / 11.7, size.height / 7.4);
    ortho.lookAt(0, 0.25, 0);
    ortho.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  return null;
}

function Platform() {
  return <>
    <mesh position={[0, -0.43, 0]}><boxGeometry args={[11.04, 0.52, 7.54]} /><meshStandardMaterial color="#333733" roughness={0.84} /></mesh>
    <mesh position={[0, -0.13, 0]}><boxGeometry args={[10.92, 0.27, 7.42]} /><meshStandardMaterial color="#50574f" roughness={0.88} /></mesh>
  </>;
}

function Cohort({ children, generation, reducedMotion }: {
  children: ReactNode; generation: number; reducedMotion: boolean;
}) {
  const group = useRef<Group>(null);
  const lastGeneration = useRef(generation);
  const exchange = useRef<{ start: number; direction: number } | null>(null);
  const invalidate = useThree(state => state.invalidate);
  useLayoutEffect(() => {
    const previous = lastGeneration.current;
    lastGeneration.current = generation;
    if (reducedMotion) {
      exchange.current = null;
      group.current?.position.set(0, 0, 0);
      group.current?.rotation.set(0, 0, 0);
      group.current?.scale.set(1, 1, 1);
    } else if (previous !== generation) {
      const direction = Math.sign(generation - previous);
      exchange.current = { start: performance.now(), direction };
      group.current?.position.set(direction * -0.34, 0.28, 0);
      group.current?.scale.set(0.93, 0.8, 0.93);
    }
    invalidate();
  }, [generation, reducedMotion, invalidate]);

  useFrame(() => {
    const active = exchange.current;
    const cohort = group.current;
    if (!active || !cohort) return;
    const time = Math.min(1, (performance.now() - active.start) / exchangeDuration);
    const remaining = (1 - time) ** 3;
    const sway = Math.sin(time * Math.PI * 2) * (1 - time);
    cohort.position.set(active.direction * -0.34 * remaining, 0.28 * remaining, 0);
    cohort.scale.set(1 - 0.07 * remaining, 1 - 0.2 * remaining + sway * 0.065, 1 - 0.07 * remaining);
    cohort.rotation.z = sway * active.direction * 0.025;
    if (time < 1) invalidate();
    else exchange.current = null;
  });
  return <group ref={group}>{children}</group>;
}

function CreatureStage({ individuals, selected, onSelect, generation, reducedMotion }: Omit<SceneProps, 'onFailure'>) {
  const positions = useMemo(() => layout(individuals.length), [individuals.length]);
  const parts = useMemo(() => creatureParts(individuals), [individuals]);
  const current = positions[selected];
  const shadows = positions.map((position, individual): Part => ({
    individual, x: 0, y: 0.022 / position.scale, z: 0, sx: 0.72, sy: 0.014, sz: 0.63, angle: 0,
    color: '#424740',
  }));

  return <>
    <Camera />
    <ambientLight intensity={1.65} />
    <directionalLight position={[-4, 7, 3]} intensity={2.4} color="#e1ecff" />
    <directionalLight position={[5, 2, -4]} intensity={1.05} color="#e1ded1" />
    <Platform />
    <Instances parts={shadows} positions={positions} shape="sphere" />
    <Cohort generation={generation} reducedMotion={reducedMotion}>
      {current && <mesh position={[current.x, 0.035, current.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[current.scale * 0.72, current.scale * 0.83, 28]} />
        <meshBasicMaterial color="#f7fcff" />
      </mesh>}
      <Instances parts={parts.body} positions={positions} shape="sphere" onSelect={onSelect} />
      <Instances parts={parts.details} positions={positions} shape="sphere" />
      <Instances parts={parts.stems} positions={positions} shape="stem" />
      <Instances parts={parts.circle} positions={positions} shape="sphere" />
      <Instances parts={parts.diamond} positions={positions} shape="diamond" />
    </Cohort>
  </>;
}

function ContextWatcher({ onFailure }: { onFailure: () => void }) {
  const { gl } = useThree();
  useLayoutEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => {
      event.preventDefault();
      onFailure();
    };
    canvas.addEventListener('webglcontextlost', lost);
    return () => canvas.removeEventListener('webglcontextlost', lost);
  }, [gl, onFailure]);
  return null;
}

export default function CreatureScene({ fallback, ...props }: SceneProps & { fallback: ReactNode }) {
  return <Canvas orthographic frameloop="demand" camera={{ position: [0, 13, 11], near: 0.1, far: 55 }}
    dpr={[1, 1.5]} fallback={fallback} gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}>
    <ContextWatcher onFailure={props.onFailure} />
    <CreatureStage {...props} />
  </Canvas>;
}
