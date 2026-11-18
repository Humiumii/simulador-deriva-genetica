import { Canvas, useThree } from '@react-three/fiber';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { Color, Object3D, type InstancedMesh, type OrthographicCamera } from 'three';
import type { Allele, Individual } from './individuals';

export const alleleColors: Record<Allele, string> = { A: '#49e9b9', B: '#ff8da8' };

type SceneProps = {
  individuals: Individual[];
  selected: number;
  onSelect: (index: number) => void;
  population: number;
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

const bodies = ['#8caaf5', '#b79bf5', '#a7c3fa', '#a9a2ef'];

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

function Platform({ population }: { population: number }) {
  const palette = population === 0 ? ['#294768', '#427598', '#569bb4'] : ['#3c386c', '#62538f', '#7d6bbb'];
  return <>
    <mesh position={[0, -0.46, 0]}><boxGeometry args={[11.04, 0.58, 7.54]} /><meshStandardMaterial color={palette[0]} roughness={0.73} /></mesh>
    <mesh position={[0, -0.13, 0]}><boxGeometry args={[10.82, 0.27, 7.3]} /><meshStandardMaterial color={palette[1]} roughness={0.88} /></mesh>
    {[-4, -2, 0, 2, 4].map(x => <mesh key={x} position={[x, 0.01, 0]}>
      <boxGeometry args={[0.015, 0.009, 7.22]} /><meshBasicMaterial color={palette[2]} />
    </mesh>)}
    {[-3, -2, -1, 0, 1, 2, 3].map(z => <mesh key={z} position={[0, 0.01, z]}>
      <boxGeometry args={[10.76, 0.009, 0.015]} /><meshBasicMaterial color={palette[2]} />
    </mesh>)}
    {[-4.9, 4.9].map(x => <mesh key={x} position={[x, -0.26, 3.8]}>
      <boxGeometry args={[0.51, 0.067, 0.028]} /><meshBasicMaterial color="#8df4df" />
    </mesh>)}
  </>;
}

function CreatureStage({ individuals, selected, onSelect, population }: Omit<SceneProps, 'onFailure'>) {
  const positions = layout(individuals.length);
  const parts = creatureParts(individuals);
  const current = positions[selected];
  const shadows = positions.map((position, individual): Part => ({
    individual, x: 0, y: 0.022 / position.scale, z: 0, sx: 0.72, sy: 0.014, sz: 0.63, angle: 0,
    color: population === 0 ? '#345578' : '#4c427c',
  }));

  return <>
    <Camera />
    <ambientLight intensity={1.65} />
    <directionalLight position={[-4, 7, 3]} intensity={2.4} color="#e1ecff" />
    <directionalLight position={[5, 2, -4]} intensity={1.05} color="#b395fc" />
    <Platform population={population} />
    <Instances parts={shadows} positions={positions} shape="sphere" />
    {current && <mesh position={[current.x, 0.035, current.z]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[current.scale * 0.72, current.scale * 0.83, 28]} />
      <meshBasicMaterial color="#f7fcff" />
    </mesh>}
    <Instances parts={parts.body} positions={positions} shape="sphere" onSelect={onSelect} />
    <Instances parts={parts.details} positions={positions} shape="sphere" />
    <Instances parts={parts.stems} positions={positions} shape="stem" />
    <Instances parts={parts.circle} positions={positions} shape="sphere" />
    <Instances parts={parts.diamond} positions={positions} shape="diamond" />
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
