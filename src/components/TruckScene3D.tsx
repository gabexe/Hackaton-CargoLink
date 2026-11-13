import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import {
  Camera,
  Cube,
  Truck,
  X,
} from '@phosphor-icons/react';
import { useSimulation } from '../context/SimulationContext';
import type { CameraPreset, PackagingFormat, PalletSlot, ThemeMode } from '../types/logistics';

const CAMERA_PRESETS: Record<
  CameraPreset,
  { label: string; position: [number, number, number]; target: [number, number, number]; fov: number }
> = {
  isometric: {
    label: '3D',
    position: [6.4, 3.9, 7.8],
    target: [0.55, 0.95, 0],
    fov: 34,
  },
  side: {
    label: 'Lateral',
    position: [0.55, 1.55, 10.6],
    target: [0.55, 1.05, 0],
    fov: 30,
  },
  top: {
    label: 'Planta',
    position: [0.55, 9.8, 1.35],
    target: [0.55, 0.7, 0],
    fov: 33,
  },
};

function WheelAssembly({
  position,
  isDark,
}: {
  position: [number, number, number];
  isDark: boolean;
}) {
  return (
    <group position={position}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.38, 0.38, 0.28, 24]} />
        <meshStandardMaterial color="#18181B" roughness={0.85} metalness={0.1} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.21, 0.21, 0.295, 18]} />
        <meshStandardMaterial
          color={isDark ? '#71717A' : '#D4D4D8'}
          roughness={0.28}
          metalness={0.75}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.31, 12]} />
        <meshStandardMaterial color="#27272A" roughness={0.4} metalness={0.6} />
      </mesh>
    </group>
  );
}

function TruckChassisAndCab({ isDark }: { isDark: boolean }) {
  const bodyColor = isDark ? '#5A5A66' : '#ECECEF';
  const accentBodyColor = isDark ? '#686875' : '#DFDFE4';
  const chassisColor = isDark ? '#27272F' : '#26262A';
  const glassColor = '#111827';
  const chromeColor = isDark ? '#B4B4BE' : '#D4D4D8';

  return (
    <group>
      {/* Main tractor + trailer steel chassis rails */}
      <mesh position={[0.45, 0.56, 0.34]} castShadow receiveShadow>
        <boxGeometry args={[9.4, 0.14, 0.1]} />
        <meshStandardMaterial color={chassisColor} roughness={0.5} metalness={0.55} />
      </mesh>
      <mesh position={[0.45, 0.56, -0.34]} castShadow receiveShadow>
        <boxGeometry args={[9.4, 0.14, 0.1]} />
        <meshStandardMaterial color={chassisColor} roughness={0.5} metalness={0.55} />
      </mesh>

      {/* Cab sleeper & lower body */}
      <mesh position={[-2.62, 1.24, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.52, 1.32, 1.94]} />
        <meshStandardMaterial color={bodyColor} roughness={0.36} metalness={0.12} />
      </mesh>

      {/* Cab upper roof fairing */}
      <mesh position={[-2.54, 2.02, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.38, 0.28, 1.88]} />
        <meshStandardMaterial color={accentBodyColor} roughness={0.38} metalness={0.12} />
      </mesh>

      {/* Aerodynamic hood */}
      <mesh position={[-3.74, 1.06, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.96, 0.78, 1.78]} />
        <meshStandardMaterial color={bodyColor} roughness={0.34} metalness={0.14} />
      </mesh>

      {/* Front bumper */}
      <mesh position={[-4.24, 0.58, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.18, 0.28, 1.96]} />
        <meshStandardMaterial color={chassisColor} roughness={0.45} metalness={0.35} />
      </mesh>

      {/* Front grille */}
      <mesh position={[-4.23, 1.02, 0]}>
        <boxGeometry args={[0.04, 0.52, 1.05]} />
        <meshStandardMaterial color={chromeColor} roughness={0.25} metalness={0.8} />
      </mesh>

      {/* LED headlights */}
      <mesh position={[-4.23, 0.82, 0.68]}>
        <boxGeometry args={[0.04, 0.12, 0.22]} />
        <meshStandardMaterial color="#FEFEFE" emissive="#FEFEFE" emissiveIntensity={0.65} />
      </mesh>
      <mesh position={[-4.23, 0.82, -0.68]}>
        <boxGeometry args={[0.04, 0.12, 0.22]} />
        <meshStandardMaterial color="#FEFEFE" emissive="#FEFEFE" emissiveIntensity={0.65} />
      </mesh>

      {/* Windshield */}
      <mesh position={[-3.38, 1.62, 0]} rotation={[0, 0, -0.18]}>
        <boxGeometry args={[0.08, 0.58, 1.72]} />
        <meshStandardMaterial color={glassColor} roughness={0.1} metalness={0.5} />
      </mesh>

      {/* Side cab windows */}
      <mesh position={[-2.86, 1.62, 0.975]}>
        <boxGeometry args={[0.68, 0.46, 0.02]} />
        <meshStandardMaterial color={glassColor} roughness={0.12} metalness={0.45} />
      </mesh>
      <mesh position={[-2.86, 1.62, -0.975]}>
        <boxGeometry args={[0.68, 0.46, 0.02]} />
        <meshStandardMaterial color={glassColor} roughness={0.12} metalness={0.45} />
      </mesh>

      {/* Side fuel tanks */}
      <mesh position={[-2.35, 0.56, 0.84]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.21, 0.21, 0.96, 16]} />
        <meshStandardMaterial color={chromeColor} roughness={0.3} metalness={0.7} />
      </mesh>
      <mesh position={[-2.35, 0.56, -0.84]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.21, 0.21, 0.96, 16]} />
        <meshStandardMaterial color={chromeColor} roughness={0.3} metalness={0.7} />
      </mesh>

      {/* Exhaust stacks */}
      <mesh position={[-1.82, 1.68, 0.82]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 1.55, 10]} />
        <meshStandardMaterial color={chromeColor} roughness={0.25} metalness={0.85} />
      </mesh>
      <mesh position={[-1.82, 1.68, -0.82]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 1.55, 10]} />
        <meshStandardMaterial color={chromeColor} roughness={0.25} metalness={0.85} />
      </mesh>

      {/* Landing gear legs under trailer nose */}
      <mesh position={[-0.35, 0.42, 0.68]} castShadow>
        <boxGeometry args={[0.1, 0.52, 0.1]} />
        <meshStandardMaterial color={chassisColor} roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[-0.35, 0.42, -0.68]} castShadow>
        <boxGeometry args={[0.1, 0.52, 0.1]} />
        <meshStandardMaterial color={chassisColor} roughness={0.6} metalness={0.4} />
      </mesh>

      {/* Tractor wheels: steer + tandem drive */}
      <WheelAssembly position={[-3.68, 0.38, 0.88]} isDark={isDark} />
      <WheelAssembly position={[-3.68, 0.38, -0.88]} isDark={isDark} />
      <WheelAssembly position={[-2.22, 0.38, 0.88]} isDark={isDark} />
      <WheelAssembly position={[-2.22, 0.38, -0.88]} isDark={isDark} />
      <WheelAssembly position={[-1.38, 0.38, 0.88]} isDark={isDark} />
      <WheelAssembly position={[-1.38, 0.38, -0.88]} isDark={isDark} />

      {/* Trailer tandem axles */}
      <WheelAssembly position={[3.45, 0.38, 0.88]} isDark={isDark} />
      <WheelAssembly position={[3.45, 0.38, -0.88]} isDark={isDark} />
      <WheelAssembly position={[4.35, 0.38, 0.88]} isDark={isDark} />
      <WheelAssembly position={[4.35, 0.38, -0.88]} isDark={isDark} />

      {/* Rear trailer safety bumper */}
      <mesh position={[5.35, 0.48, 0]} castShadow>
        <boxGeometry args={[0.14, 0.16, 1.98]} />
        <meshStandardMaterial color={chassisColor} roughness={0.5} metalness={0.5} />
      </mesh>
    </group>
  );
}

function SemiTrailerCutaway({ isDark }: { isDark: boolean }) {
  const wallColor = isDark ? '#42424C' : '#F4F4F6';
  const frameColor = isDark ? '#686875' : '#D4D4D8';
  const deckColor = isDark ? '#2A2A32' : '#E4E4E7';

  return (
    <group>
      {/* Trailer floor deck (6.5m box representing 13.5m scale) */}
      <mesh position={[2.05, 0.72, 0]} receiveShadow castShadow>
        <boxGeometry args={[6.6, 0.12, 2.08]} />
        <meshStandardMaterial color={deckColor} roughness={0.65} metalness={0.15} />
      </mesh>

      {/* Front bulkhead wall */}
      <mesh position={[-1.2, 1.66, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.1, 1.78, 2.08]} />
        <meshStandardMaterial color={wallColor} roughness={0.45} metalness={0.1} />
      </mesh>

      {/* Far back wall (-Z) kept solid for studio cutaway */}
      <mesh position={[2.05, 1.66, -1.01]} castShadow receiveShadow>
        <boxGeometry args={[6.6, 1.78, 0.06]} />
        <meshStandardMaterial color={wallColor} roughness={0.45} metalness={0.08} />
      </mesh>

      {/* Rear portal frame columns */}
      <mesh position={[5.31, 1.66, -1.0]} castShadow>
        <boxGeometry args={[0.09, 1.8, 0.09]} />
        <meshStandardMaterial color={frameColor} roughness={0.35} metalness={0.45} />
      </mesh>
      <mesh position={[5.31, 1.66, 1.0]} castShadow>
        <boxGeometry args={[0.09, 1.8, 0.09]} />
        <meshStandardMaterial color={frameColor} roughness={0.35} metalness={0.45} />
      </mesh>

      {/* Top cutaway structural frame rails */}
      <mesh position={[2.05, 2.55, 1.0]} castShadow>
        <boxGeometry args={[6.6, 0.07, 0.07]} />
        <meshStandardMaterial color={frameColor} roughness={0.35} metalness={0.5} />
      </mesh>
      <mesh position={[2.05, 2.55, -1.0]} castShadow>
        <boxGeometry args={[6.6, 0.07, 0.07]} />
        <meshStandardMaterial color={frameColor} roughness={0.35} metalness={0.5} />
      </mesh>
      <mesh position={[5.31, 2.55, 0]} castShadow>
        <boxGeometry args={[0.08, 0.08, 2.08]} />
        <meshStandardMaterial color={frameColor} roughness={0.35} metalness={0.5} />
      </mesh>

      {/* Translucent roof glass/polycarbonate hint */}
      <mesh position={[2.05, 2.57, 0]}>
        <boxGeometry args={[6.5, 0.02, 1.98]} />
        <meshStandardMaterial
          color={isDark ? '#3F3F46' : '#FEFEFE'}
          transparent
          opacity={0.14}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
}

interface PalletMeshProps {
  slot: PalletSlot;
  isSelectedDraft: boolean;
  draftFormat: PackagingFormat;
  draftWeightKg: number;
  isInspected: boolean;
  canSelect: boolean;
  canInspect: boolean;
  isDark: boolean;
  onSelect: () => void;
}

function PalletMesh({
  slot,
  isSelectedDraft,
  draftFormat,
  draftWeightKg,
  isInspected,
  canSelect,
  canInspect,
  isDark,
  onSelect,
}: PalletMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  // Map col (1..6) along X [-0.6 .. +4.75] and row (1..2) along Z [-0.46, +0.46]
  const posX = -0.58 + (slot.col - 1) * 1.05;
  const posZ = slot.row === 1 ? -0.46 : 0.46;

  const isAvailable = slot.status === 'available';
  const isUserBooked = slot.status === 'user_booked';
  const isInteractive = isAvailable ? canSelect : canInspect;

  const format: PackagingFormat = isSelectedDraft
    ? draftFormat
    : slot.packagingFormat ?? (slot.cargoLabel?.toLowerCase().includes('pet') || slot.cargoLabel?.toLowerCase().includes('plástic') ? 'bigbag' : slot.cargoLabel?.toLowerCase().includes('corrugad') || slot.cargoLabel?.toLowerCase().includes('cartón') ? 'boxes' : 'pallet');

  const effectiveWeight = isSelectedDraft ? draftWeightKg : slot.weightKg;

  const boxHeight = useMemo(() => {
    if (isAvailable && !isSelectedDraft) return 0.56;
    const ratio = Math.max(0.45, Math.min(1, effectiveWeight / 850));
    return 0.52 + ratio * 0.62;
  }, [isAvailable, isSelectedDraft, effectiveWeight]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const targetY = isSelectedDraft || isInspected ? 0.9 : hovered && isInteractive ? 0.84 : 0.79;
    groupRef.current.position.y = THREE.MathUtils.damp(
      groupRef.current.position.y,
      targetY,
      14,
      delta
    );
  });

  const cargoColor = useMemo(() => {
    if (isSelectedDraft || isUserBooked || isInspected) {
      return '#276EF1';
    }
    if (isAvailable) {
      return hovered && canSelect ? '#276EF1' : isDark ? '#52525B' : '#A1A1AA';
    }
    return hovered && canInspect
      ? isDark
        ? '#71717A'
        : '#B4B4BC'
      : isDark
        ? '#585864'
        : '#D4D4D8';
  }, [isSelectedDraft, isUserBooked, isInspected, isAvailable, hovered, canSelect, canInspect, isDark]);

  const palletWoodColor = isDark ? '#52525B' : '#C4A882';
  const drumMetalColor = isSelectedDraft || isUserBooked || isInspected ? '#1D4ED8' : isDark ? '#4B5563' : '#6B7280';

  return (
    <group
      ref={groupRef}
      position={[posX, 0.79, posZ]}
      onClick={(e) => {
        if (!isInteractive) return;
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        if (!isInteractive) return;
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'default';
      }}
    >
      {/* Base pallet skid standard Arlog */}
      <mesh position={[0, 0.03, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.88, 0.06, 0.8]} />
        <meshStandardMaterial
          color={isAvailable && !isSelectedDraft ? (isDark ? '#27272A' : '#E4E4E7') : palletWoodColor}
          roughness={0.75}
          metalness={0.05}
        />
      </mesh>

      {isAvailable && !isSelectedDraft ? (
        /* Translucent available footprint */
        <mesh position={[0, 0.28, 0]}>
          <boxGeometry args={[0.82, 0.44, 0.74]} />
          <meshStandardMaterial
            color={cargoColor}
            transparent
            opacity={hovered && canSelect ? 0.36 : 0.14}
            roughness={0.4}
            depthWrite={false}
          />
        </mesh>
      ) : format === 'boxes' ? (
        /* 2x2x2 stacked boxes */
        <group position={[0, 0.06, 0]}>
          {[-0.2, 0.2].map((bx, xi) =>
            [-0.18, 0.18].map((bz, zi) =>
              [0, boxHeight * 0.48].map((by, yi) => (
                <mesh
                  key={`box-${xi}-${zi}-${yi}`}
                  position={[bx, by + (boxHeight * 0.46) / 2, bz]}
                  castShadow
                  receiveShadow
                >
                  <boxGeometry args={[0.37, boxHeight * 0.44, 0.33]} />
                  <meshStandardMaterial
                    color={cargoColor}
                    roughness={0.65}
                    metalness={0.05}
                  />
                </mesh>
              ))
            )
          )}
          {/* Packaging tape strip on top */}
          <mesh position={[0, boxHeight * 0.96, 0]}>
            <boxGeometry args={[0.78, 0.015, 0.14]} />
            <meshStandardMaterial color={isDark ? '#E4E4E7' : '#27272A'} roughness={0.3} />
          </mesh>
        </group>
      ) : format === 'bigbag' ? (
        /* Octagonal industrial flexible bulk container (Big Bag FIBC) with lifting loops */
        <group position={[0, 0.06, 0]}>
          <mesh position={[0, boxHeight / 2, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.39, 0.38, boxHeight, 12]} />
            <meshStandardMaterial
              color={cargoColor}
              roughness={0.6}
              metalness={0.06}
            />
          </mesh>
          {/* Top filling spout */}
          <mesh position={[0, boxHeight + 0.05, 0]}>
            <cylinderGeometry args={[0.14, 0.16, 0.1, 10]} />
            <meshStandardMaterial color={isDark ? '#E4E4E7' : '#18181B'} roughness={0.4} />
          </mesh>
          {/* 4 Corner lifting sling loops */}
          {[-0.26, 0.26].map((lx, li) =>
            [-0.26, 0.26].map((lz, lzi) => (
              <mesh key={`loop-${li}-${lzi}`} position={[lx, boxHeight + 0.04, lz]}>
                <boxGeometry args={[0.04, 0.09, 0.04]} />
                <meshStandardMaterial color="#FEFEFE" roughness={0.3} />
              </mesh>
            ))
          )}
        </group>
      ) : format === 'drums' ? (
        /* 4 steel drums arranged 2x2 */
        <group position={[0, 0.06, 0]}>
          {[-0.2, 0.2].map((dx, di) =>
            [-0.18, 0.18].map((dz, dzi) => (
              <group key={`drum-${di}-${dzi}`} position={[dx, 0, dz]}>
                <mesh position={[0, boxHeight / 2, 0]} castShadow receiveShadow>
                  <cylinderGeometry args={[0.18, 0.18, boxHeight, 16]} />
                  <meshStandardMaterial color={drumMetalColor} roughness={0.35} metalness={0.7} />
                </mesh>
                {/* Drum rolling chime rings */}
                <mesh position={[0, boxHeight * 0.35, 0]}>
                  <cylinderGeometry args={[0.186, 0.186, 0.02, 16]} />
                  <meshStandardMaterial color={isDark ? '#D4D4D8' : '#18181B'} roughness={0.3} metalness={0.8} />
                </mesh>
                <mesh position={[0, boxHeight * 0.7, 0]}>
                  <cylinderGeometry args={[0.186, 0.186, 0.02, 16]} />
                  <meshStandardMaterial color={isDark ? '#D4D4D8' : '#18181B'} roughness={0.3} metalness={0.8} />
                </mesh>
              </group>
            ))
          )}
        </group>
      ) : (
        /* Standard stretch-wrapped Arlog Pallet block */
        <group>
          <mesh position={[0, 0.06 + boxHeight / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.82, boxHeight, 0.74]} />
            <meshStandardMaterial
              color={cargoColor}
              roughness={isSelectedDraft || isUserBooked ? 0.3 : 0.48}
              metalness={0.08}
            />
          </mesh>
          {/* Strapping / top seal detail */}
          <mesh position={[0, 0.07 + boxHeight, 0]}>
            <boxGeometry args={[0.83, 0.025, 0.12]} />
            <meshStandardMaterial
              color={isSelectedDraft || isUserBooked ? '#FEFEFE' : '#18181B'}
              roughness={0.35}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}

function CameraRig({ preset }: { preset: CameraPreset }) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const { camera } = useThree();
  const desiredPos = useMemo(() => new THREE.Vector3(), []);
  const desiredTarget = useMemo(() => new THREE.Vector3(), []);
  const animTimerRef = useRef<number>(0);

  useEffect(() => {
    animTimerRef.current = 0.85;
  }, [preset]);

  useFrame((_, delta) => {
    if (animTimerRef.current <= 0) return;
    animTimerRef.current -= delta;
    const cfg = CAMERA_PRESETS[preset];
    desiredPos.set(...cfg.position);
    desiredTarget.set(...cfg.target);

    camera.position.x = THREE.MathUtils.damp(camera.position.x, desiredPos.x, 7, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, desiredPos.y, 7, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, desiredPos.z, 7, delta);

    if (controlsRef.current) {
      controlsRef.current.target.x = THREE.MathUtils.damp(
        controlsRef.current.target.x,
        desiredTarget.x,
        7,
        delta
      );
      controlsRef.current.target.y = THREE.MathUtils.damp(
        controlsRef.current.target.y,
        desiredTarget.y,
        7,
        delta
      );
      controlsRef.current.target.z = THREE.MathUtils.damp(
        controlsRef.current.target.z,
        desiredTarget.z,
        7,
        delta
      );
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      minDistance={5.2}
      maxDistance={15}
      minPolarAngle={0.22}
      maxPolarAngle={Math.PI / 2 - 0.06}
      onStart={() => {
        animTimerRef.current = 0;
      }}
    />
  );
}

class CanvasErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallback: ReactNode; children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export function TruckScene3D({ theme }: { theme: ThemeMode }) {
  const {
    activeRoute,
    activeRole,
    selectedSlotIds,
    draftPackagingFormat,
    draftPalletWeightKg,
    toggleDraftSlot,
    inspectedSlotId,
    setInspectedSlotId,
  } = useSimulation();

  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('isometric');
  const isDark = theme === 'dark';

  useEffect(() => {
    return () => {
      document.body.style.cursor = 'default';
    };
  }, []);

  const filledSlots = activeRoute.slots.filter(
    (slot) => slot.status === 'occupied' || slot.status === 'user_booked'
  );
  const totalLoadedKg = filledSlots.reduce((acc, slot) => acc + slot.weightKg, 0);
  const isDockedForShipper = activeRole === 'shipper' && activeRoute.tripStatus === 'docked';

  const inspectedSlot =
    inspectedSlotId !== null
      ? activeRoute.slots.find((slot) => slot.id === inspectedSlotId) ?? null
      : null;

  const handleSlotClick = (slot: PalletSlot) => {
    if (slot.status === 'available') {
      if (!isDockedForShipper) return;
      setInspectedSlotId(null);
      toggleDraftSlot(slot.id);
      return;
    }

    const canInspect = activeRole !== 'shipper' || slot.status === 'user_booked';
    if (!canInspect) return;
    setInspectedSlotId(inspectedSlotId === slot.id ? null : slot.id);
  };

  const bgCanvasHex = isDark ? '#141417' : '#F4F4F6';

  const webglFallback = (
    <div className="flex h-64 items-center justify-center rounded-xl bg-[var(--bg-canvas)] text-xs text-[var(--text-secondary)]">
      Vista 3D no disponible en este navegador.
    </div>
  );

  return (
    <div className="space-y-2.5">
      {/* Interactive 3D Viewport */}
      <div className="relative h-[280px] sm:h-[340px] lg:h-[420px] w-full overflow-hidden rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)]">
        <CanvasErrorBoundary fallback={webglFallback}>
          <Suspense fallback={webglFallback}>
            <Canvas
              shadows="percentage"
              dpr={[1, 2]}
              camera={{
                position: CAMERA_PRESETS.isometric.position,
                fov: CAMERA_PRESETS.isometric.fov,
              }}
              gl={{ antialias: true, powerPreference: 'high-performance' }}
            >
              <color attach="background" args={[bgCanvasHex]} />
              <ambientLight intensity={isDark ? 0.65 : 0.85} />
              <hemisphereLight
                args={[isDark ? '#D4D4D8' : '#FFFFFF', isDark ? '#18181B' : '#D4D4D8', 0.65]}
              />
              <directionalLight
                position={[7, 11, 8]}
                intensity={isDark ? 1.55 : 1.75}
                castShadow
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
                shadow-camera-near={1}
                shadow-camera-far={28}
                shadow-camera-left={-7}
                shadow-camera-right={7}
                shadow-camera-top={7}
                shadow-camera-bottom={-7}
              />
              <directionalLight position={[-6, 5, -6]} intensity={0.45} />

              {/* Studio floor plane */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.4, 0, 0]} receiveShadow>
                <planeGeometry args={[30, 20]} />
                <meshStandardMaterial color={bgCanvasHex} roughness={0.95} metalness={0} />
              </mesh>

              {/* Subtle floor guide lines */}
              <gridHelper
                args={[18, 18, isDark ? '#2A2A32' : '#E2E2E6', isDark ? '#1F1F25' : '#EAEAEF']}
                position={[0.4, 0.005, 0]}
              />

              <group>
                <TruckChassisAndCab isDark={isDark} />
                <SemiTrailerCutaway isDark={isDark} />
                {activeRoute.slots.map((slot) => {
                  const isSelectedDraft =
                    isDockedForShipper && selectedSlotIds.includes(slot.id);
                  const isInspected = inspectedSlotId === slot.id;
                  const canInspect = activeRole !== 'shipper' || slot.status === 'user_booked';

                  return (
                    <PalletMesh
                      key={slot.id}
                      slot={slot}
                      isSelectedDraft={isSelectedDraft}
                      draftFormat={draftPackagingFormat}
                      draftWeightKg={draftPalletWeightKg}
                      isInspected={isInspected}
                      canSelect={isDockedForShipper}
                      canInspect={canInspect}
                      isDark={isDark}
                      onSelect={() => handleSlotClick(slot)}
                    />
                  );
                })}
              </group>

              <CameraRig preset={cameraPreset} />
            </Canvas>
          </Suspense>
        </CanvasErrorBoundary>

        {/* Top-right camera preset selector */}
        <div
          role="group"
          aria-label="Ángulos de cámara 3D"
          className="absolute right-2.5 top-2.5 inline-flex items-center rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)]/90 p-0.5 backdrop-blur-sm"
        >
          {(Object.keys(CAMERA_PRESETS) as CameraPreset[]).map((key) => {
            const active = cameraPreset === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setCameraPreset(key)}
                className={`cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  active
                    ? 'bg-[#141414] text-[#F6F6F6] dark:bg-[#F5F5F7] dark:text-[#111112]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {CAMERA_PRESETS[key].label}
              </button>
            );
          })}
        </div>

        {/* Bottom-left module & capacity HUD */}
        <div className="pointer-events-none absolute bottom-5 sm:bottom-3 left-2.5 right-2.5 flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)]/90 px-2.5 py-1 text-[11px] font-mono text-[var(--text-primary)] backdrop-blur-sm">
            <Cube size={12} weight="regular" className="text-[#276EF1]" aria-hidden="true" />
            <span>{filledSlots.length}/12 mód. (1,2×1,0 m) · {totalLoadedKg.toLocaleString('es-AR')} kg</span>
          </div>

          <div className="hidden items-center gap-1 rounded-full bg-[var(--bg-surface)]/85 px-2.5 py-1 text-[11px] text-[var(--text-secondary)] backdrop-blur-sm sm:inline-flex">
            <Camera size={12} weight="regular" aria-hidden="true" />
            <span>
              {isDockedForShipper ? 'Tocá un módulo libre o rotá' : 'Tocá un módulo o rotá'}
            </span>
          </div>
        </div>
      </div>

      {/* Single-line Slot Inspector (only visible on tap) */}
      {inspectedSlot && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3 py-2 text-xs">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="inline-flex items-center gap-1 font-mono font-semibold text-[var(--text-primary)]">
              <Truck size={13} weight="regular" className="text-[#276EF1]" aria-hidden="true" />
              <span>{inspectedSlot.id}</span>
            </span>
            <span className="text-[var(--text-primary)]">
              {inspectedSlot.shipperName ?? 'Carga consolidada'}
            </span>
            <span className="text-[var(--text-secondary)]">
              ({inspectedSlot.cargoLabel ?? 'Pallet'} - {inspectedSlot.weightKg} kg · orden {inspectedSlot.col <= 2 ? 'fondo' : inspectedSlot.col <= 4 ? 'medio' : 'puerta'})
            </span>
            {inspectedSlot.bookingCode && (
              <span className="rounded bg-[var(--bg-subtle)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--text-primary)]">
                {inspectedSlot.bookingCode}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setInspectedSlotId(null)}
            aria-label="Cerrar detalle"
            className="inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <X size={13} weight="regular" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
