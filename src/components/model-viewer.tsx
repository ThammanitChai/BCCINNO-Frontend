'use client';

import { useEffect, useRef, useState } from 'react';
import { Layers, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import type { Object3D } from 'three';

type ClipFn = (pct: number) => void;
type ResetFn = () => void;

export default function ModelViewer({ file }: { file: File | null }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const clipFnRef = useRef<ClipFn | null>(null);
  const resetFnRef = useRef<ResetFn | null>(null);
  const [layerPct, setLayerPct] = useState(100);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    if (!file || !mountRef.current) return;
    const mount = mountRef.current;
    let cancelled = false;
    let animId = 0;
    let canvas: HTMLCanvasElement | null = null;

    setStatus('loading');
    setLayerPct(100);
    setInfo('');
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
      camera.position.set(0, 2, 5);

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h);
      renderer.localClippingEnabled = true;
      canvas = renderer.domElement;
      mount.appendChild(canvas);

      // Lights
      scene.add(new THREE.AmbientLight(0xffffff, 0.8));
      const sun = new THREE.DirectionalLight(0xffffff, 1.2);
      sun.position.set(5, 10, 5);
      scene.add(sun);
      const fill = new THREE.DirectionalLight(0xc084fc, 0.4);
      fill.position.set(-3, -3, -3);
      scene.add(fill);

      // Grid
      const grid = new THREE.GridHelper(200, 40, 0xddd6fe, 0xede9fe);
      scene.add(grid);

      // Clipping plane: show where y <= constant
      const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e6);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.minDistance = 0.1;
      controls.maxDistance = 10000;

      const material = new THREE.MeshStandardMaterial({
        color: 0x9333ea,
        roughness: 0.45,
        metalness: 0.1,
        clippingPlanes: [clipPlane],
        clipShadows: true,
      });

      const ext = file.name.split('.').pop()?.toLowerCase();
      const url = URL.createObjectURL(file);

      const setupObject = (obj: Object3D) => {
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

        const finalBbox = new THREE.Box3().setFromObject(obj);
        const minY = finalBbox.min.y;
        const maxY = finalBbox.max.y;

        grid.position.y = minY - 0.02;
        clipPlane.constant = maxY;

        const camDist = maxDim * scaleFactor * 1.8;
        camera.position.set(camDist * 0.7, camDist * 0.5, camDist);
        controls.target.set(0, (minY + maxY) / 2, 0);
        controls.update();

        clipFnRef.current = (pct: number) => {
          clipPlane.constant = minY + (maxY - minY) * (pct / 100);
        };
        resetFnRef.current = () => {
          controls.reset();
          camera.position.set(camDist * 0.7, camDist * 0.5, camDist);
          controls.target.set(0, (minY + maxY) / 2, 0);
          controls.update();
        };

        const verts = size.x * size.y * size.z > 0
          ? `${size.x.toFixed(1)} × ${size.y.toFixed(1)} × ${size.z.toFixed(1)} mm`
          : '';
        setInfo(verts);
        setStatus('ready');
        URL.revokeObjectURL(url);
      };

      const onError = (label: string) => () => {
        if (cancelled) return;
        setErrorMsg(`Failed to load ${label}`);
        setStatus('error');
        URL.revokeObjectURL(url);
      };

      if (ext === 'stl') {
        const loader = new STLLoader();
        loader.load(url, (geo) => {
          if (cancelled) { URL.revokeObjectURL(url); return; }
          geo.computeVertexNormals();
          setupObject(new THREE.Mesh(geo, material));
        }, undefined, onError('STL'));
      } else if (ext === 'obj') {
        const loader = new OBJLoader();
        loader.load(url, (group) => {
          group.traverse((child) => {
            if ((child as any).isMesh) (child as any).material = material;
          });
          setupObject(group);
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
    })().then((cleanup) => {
      if (cancelled) cleanup?.();
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(animId);
      clipFnRef.current = null;
      resetFnRef.current = null;
      if (canvas && mount.contains(canvas)) mount.removeChild(canvas);
    };
  }, [file]);

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pct = +e.target.value;
    setLayerPct(pct);
    clipFnRef.current?.(pct);
  };

  if (!file) return null;

  return (
    <div className="rounded-xl border border-purple-200 overflow-hidden bg-purple-50/30">
      <div
        ref={mountRef}
        className="relative w-full"
        style={{ height: 320, touchAction: 'none' }}
      >
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
        <div className="px-4 py-3 border-t border-purple-100 space-y-2 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-purple-500" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Layer slice · {layerPct}%
              </span>
              {info && (
                <span className="font-mono text-[10px] text-muted-foreground/60">{info}</span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => resetFnRef.current?.()}
              title="Reset view"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={layerPct}
            onChange={handleSlider}
            className="w-full h-1.5 accent-purple-600 cursor-pointer"
          />
          <p className="font-mono text-[10px] text-muted-foreground/50">
            คลิกลาก: หมุน · Scroll: ซูม · คลิกขวาลาก: เลื่อน
          </p>
        </div>
      )}
    </div>
  );
}
