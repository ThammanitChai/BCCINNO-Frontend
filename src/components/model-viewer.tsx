'use client';

import { useEffect, useRef, useState } from 'react';
import { Layers, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import type { Object3D, BufferGeometry, BufferAttribute } from 'three';

type ClipFn = (pct: number) => void;

export interface ModelStats {
  dims: { x: number; y: number; z: number };
  volumeMm3: number;
  surfaceAreaMm2: number;
}

// Signed-tetrahedra volume — works on any closed triangulated mesh
function computeGeometryStats(position: Float32Array, indices?: Uint16Array | Uint32Array | null) {
  let vol = 0, area = 0;

  const getV = (i: number) => ({
    x: position[i * 3], y: position[i * 3 + 1], z: position[i * 3 + 2],
  });

  const iter = (a: number, b: number, c: number) => {
    const v0 = getV(a), v1 = getV(b), v2 = getV(c);
    // Signed volume of tetrahedron with origin
    vol += (v0.x * (v1.y * v2.z - v2.y * v1.z)
           + v1.x * (v2.y * v0.z - v0.y * v2.z)
           + v2.x * (v0.y * v1.z - v1.y * v0.z)) / 6;
    // Triangle area via cross product
    const ex = v1.x - v0.x, ey = v1.y - v0.y, ez = v1.z - v0.z;
    const fx = v2.x - v0.x, fy = v2.y - v0.y, fz = v2.z - v0.z;
    area += Math.sqrt((ey*fz-ez*fy)**2 + (ez*fx-ex*fz)**2 + (ex*fy-ey*fx)**2) / 2;
  };

  if (indices) {
    for (let i = 0; i < indices.length; i += 3) iter(indices[i], indices[i+1], indices[i+2]);
  } else {
    const count = position.length / 3;
    for (let i = 0; i < count; i += 3) iter(i, i+1, i+2);
  }

  return { volumeMm3: Math.abs(vol), surfaceAreaMm2: area };
}

export default function ModelViewer({
  file,
  onLoad,
}: {
  file: File | null;
  onLoad?: (stats: ModelStats) => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const clipFnRef = useRef<ClipFn | null>(null);
  const resetFnRef = useRef<(() => void) | null>(null);
  const [layerPct, setLayerPct] = useState(100);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [dims, setDims] = useState<ModelStats['dims'] | null>(null);

  useEffect(() => {
    if (!file || !mountRef.current) return;
    const mount = mountRef.current;
    let cancelled = false;
    let animId = 0;
    let canvas: HTMLCanvasElement | null = null;

    setStatus('loading');
    setLayerPct(100);
    setDims(null);
    clipFnRef.current = null;
    resetFnRef.current = null;

    (async () => {
      const THREE = await import('three');
      const { STLLoader } = await import('three/examples/jsm/loaders/STLLoader.js');
      const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js');
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
      if (cancelled) return;

      const w = mount.clientWidth || 400;
      const h = 320;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf5f3ff);
      const camera = new THREE.PerspectiveCamera(45, w / h, 0.001, 100000);
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h);
      renderer.localClippingEnabled = true;
      canvas = renderer.domElement;
      mount.appendChild(canvas);

      scene.add(new THREE.AmbientLight(0xffffff, 0.8));
      const sun = new THREE.DirectionalLight(0xffffff, 1.2);
      sun.position.set(5, 10, 5);
      scene.add(sun);
      scene.add(Object.assign(new THREE.DirectionalLight(0xc084fc, 0.4), { position: { x: -3, y: -3, z: -3 } }));

      const grid = new THREE.GridHelper(200, 40, 0xddd6fe, 0xede9fe);
      scene.add(grid);

      const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e6);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;

      const material = new THREE.MeshStandardMaterial({
        color: 0x9333ea, roughness: 0.45, metalness: 0.1,
        clippingPlanes: [clipPlane], clipShadows: true,
      });

      const ext = file.name.split('.').pop()?.toLowerCase();
      const url = URL.createObjectURL(file);

      const setupScene = (obj: Object3D, stats: ModelStats) => {
        if (cancelled) { URL.revokeObjectURL(url); return; }

        scene.add(obj);
        const bbox = new THREE.Box3().setFromObject(obj);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        const size = new THREE.Vector3();
        bbox.getSize(size);

        const maxDim = Math.max(size.x, size.y, size.z);
        const scaleFactor = 4 / maxDim;
        obj.scale.setScalar(scaleFactor);
        obj.position.sub(center.multiplyScalar(scaleFactor));

        const fb = new THREE.Box3().setFromObject(obj);
        const minY = fb.min.y, maxY = fb.max.y;
        grid.position.y = minY - 0.02;
        clipPlane.constant = maxY;

        const camDist = maxDim * scaleFactor * 1.8;
        camera.position.set(camDist * 0.7, camDist * 0.5, camDist);
        controls.target.set(0, (minY + maxY) / 2, 0);
        controls.update();

        clipFnRef.current = (pct) => {
          clipPlane.constant = minY + (maxY - minY) * (pct / 100);
        };
        resetFnRef.current = () => {
          camera.position.set(camDist * 0.7, camDist * 0.5, camDist);
          controls.target.set(0, (minY + maxY) / 2, 0);
          controls.update();
        };

        setDims(stats.dims);
        onLoad?.(stats);
        setStatus('ready');
        URL.revokeObjectURL(url);
      };

      const onError = (label: string) => () => {
        if (!cancelled) { setErrorMsg(`โหลด ${label} ไม่ได้`); setStatus('error'); }
        URL.revokeObjectURL(url);
      };

      if (ext === 'stl') {
        const loader = new STLLoader();
        loader.load(url, (geo) => {
          if (cancelled) { URL.revokeObjectURL(url); return; }
          geo.computeVertexNormals();

          const pos = geo.attributes.position.array as Float32Array;
          const idx = geo.index
            ? (geo.index.array as Uint16Array | Uint32Array)
            : null;
          const { volumeMm3, surfaceAreaMm2 } = computeGeometryStats(pos, idx);

          const rawBbox = new THREE.Box3().setFromBufferAttribute(geo.attributes.position as BufferAttribute);
          const rawSize = new THREE.Vector3();
          rawBbox.getSize(rawSize);

          const stats: ModelStats = {
            dims: { x: +rawSize.x.toFixed(2), y: +rawSize.y.toFixed(2), z: +rawSize.z.toFixed(2) },
            volumeMm3,
            surfaceAreaMm2,
          };
          setupScene(new THREE.Mesh(geo, material), stats);
        }, undefined, onError('STL'));

      } else if (ext === 'obj') {
        const loader = new OBJLoader();
        loader.load(url, (group) => {
          let totalVol = 0, totalArea = 0;
          group.traverse((child) => {
            if ((child as any).isMesh) {
              (child as any).material = material;
              const geo = (child as any).geometry as BufferGeometry;
              const pos = geo.attributes.position.array as Float32Array;
              const idx = geo.index ? (geo.index.array as Uint16Array | Uint32Array) : null;
              const s = computeGeometryStats(pos, idx);
              totalVol += s.volumeMm3;
              totalArea += s.surfaceAreaMm2;
            }
          });
          const rawBbox = new THREE.Box3().setFromObject(group);
          const rawSize = new THREE.Vector3();
          rawBbox.getSize(rawSize);
          const stats: ModelStats = {
            dims: { x: +rawSize.x.toFixed(2), y: +rawSize.y.toFixed(2), z: +rawSize.z.toFixed(2) },
            volumeMm3: totalVol,
            surfaceAreaMm2: totalArea,
          };
          setupScene(group, stats);
        }, undefined, onError('OBJ'));
      } else {
        setErrorMsg('รองรับ .stl และ .obj เท่านั้น');
        setStatus('error');
        URL.revokeObjectURL(url);
        return;
      }

      const animate = () => {
        if (cancelled) return;
        animId = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      const onResize = () => {
        const w2 = mount.clientWidth || 400;
        camera.aspect = w2 / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w2, h);
      };
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    })().then((cleanup) => { if (cancelled) cleanup?.(); });

    return () => {
      cancelled = true;
      cancelAnimationFrame(animId);
      clipFnRef.current = null;
      resetFnRef.current = null;
      if (canvas && mount.contains(canvas)) mount.removeChild(canvas);
    };
  }, [file]);

  if (!file) return null;

  return (
    <div className="rounded-xl border border-purple-200 overflow-hidden bg-purple-50/30">
      <div ref={mountRef} className="relative w-full" style={{ height: 320, touchAction: 'none' }}>
        {status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-purple-50/60">
            <span className="font-mono text-xs text-purple-500 animate-pulse">กำลังโหลดโมเดล…</span>
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-purple-50/60">
            <span className="font-mono text-xs text-destructive">{errorMsg}</span>
          </div>
        )}
      </div>

      {status === 'ready' && (
        <div className="border-t border-purple-100 bg-white">
          {dims && (
            <div className="grid grid-cols-3 divide-x divide-purple-100 border-b border-purple-100">
              <DimBox label="W (X)" value={dims.x} />
              <DimBox label="D (Y)" value={dims.y} />
              <DimBox label="H (Z)" value={dims.z} />
            </div>
          )}
          <div className="px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-purple-500" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Layer slice · {layerPct}%
                </span>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6"
                onClick={() => resetFnRef.current?.()} title="Reset view">
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
            <input type="range" min={0} max={100} value={layerPct}
              onChange={(e) => { const p = +e.target.value; setLayerPct(p); clipFnRef.current?.(p); }}
              className="w-full h-1.5 accent-purple-600 cursor-pointer"
            />
            <p className="font-mono text-[10px] text-muted-foreground/50">
              คลิกลาก: หมุน · Scroll: ซูม · คลิกขวาลาก: เลื่อน
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function DimBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center py-2.5 px-3">
      <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className="font-mono text-base font-semibold text-purple-700 mt-0.5">{value}</span>
      <span className="font-mono text-[9px] text-muted-foreground/60">mm</span>
    </div>
  );
}
