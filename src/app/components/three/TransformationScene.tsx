// ============================================================
// Fit Tracker PRO — 3D Transformation Scene (Three.js)
// Renders a humanoid character morphing from fat → fit using
// scale interpolation. Male (blue) vs Female (pink) themes.
// ============================================================
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { Gender } from '../../types';

interface TransformationSceneProps {
  gender: Gender;
  isPlaying: boolean;
  className?: string;
}

const COLORS = {
  male:   { skin: 0x7aa8d4, cloth: 0x1a56db, hair: 0x2d3748, accent: 0x22c55e, glow: 0x3b82f6 },
  female: { skin: 0xf4b8b8, cloth: 0xdb1a7e, hair: 0x92400e, accent: 0xf0abfc, glow: 0xec4899 },
};

function lp(a: number, b: number, t: number) {
  return a * (1 - t) + b * t;
}

export function TransformationScene({ gender, isPlaying, className = '' }: TransformationSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const W = container.clientWidth || 400;
    const H = container.clientHeight || 400;
    const c = COLORS[gender];

    // ── Scene / camera / renderer ─────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050a14);
    scene.fog = new THREE.FogExp2(0x050a14, 0.045);

    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
    camera.position.set(0, 3.2, 11);
    camera.lookAt(0, 2, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // ── Lights ───────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x111133, 1.0));
    const dir = new THREE.DirectionalLight(0xffffff, 1.4);
    dir.position.set(5, 10, 5);
    dir.castShadow = true;
    scene.add(dir);
    const rim = new THREE.PointLight(c.accent, 2, 20);
    rim.position.set(-5, 4, -4);
    scene.add(rim);
    const glow = new THREE.PointLight(c.glow, 0, 12);
    glow.position.set(0, 3, 2);
    scene.add(glow);

    // ── Ground ────────────────────────────────────────────────────────────
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(5, 64),
      new THREE.MeshStandardMaterial({ color: 0x0a1628, metalness: 0.5, roughness: 0.4 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2.8;
    ground.receiveShadow = true;
    scene.add(ground);

    // ── Starfield ─────────────────────────────────────────────────────────
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(600);
    for (let i = 0; i < 600; i++) starPos[i] = (Math.random() - 0.5) * 80;
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x6688cc, size: 0.07 })));

    // ── Material helpers ──────────────────────────────────────────────────
    const skinMat  = () => new THREE.MeshStandardMaterial({ color: c.skin,  roughness: 0.7, metalness: 0.1 });
    const clothMat = () => new THREE.MeshStandardMaterial({ color: c.cloth, roughness: 0.6, metalness: 0.2 });
    const hairMat  = () => new THREE.MeshStandardMaterial({ color: c.hair,  roughness: 0.9 });

    // ── Build character (one group, parts animated by scale / position) ───
    const grp = new THREE.Group();
    scene.add(grp);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.58, 32, 32), skinMat());
    head.position.y = 3.9;
    head.castShadow = true;
    grp.add(head);

    // Hair
    if (gender === 'female') {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.63, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), hairMat());
      cap.position.y = 3.9;
      grp.add(cap);
      const long = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.08, 1.3, 16), hairMat());
      long.position.set(0, 3.35, -0.35);
      grp.add(long);
    } else {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.6, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), hairMat());
      cap.position.y = 3.9;
      grp.add(cap);
    }

    // Eyes
    const eyeM = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const le = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 16), eyeM);
    const re = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 16), eyeM);
    le.position.set(-0.2, 4.0, 0.52);
    re.position.set( 0.2, 4.0, 0.52);
    grp.add(le, re);

    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.38, 16), skinMat());
    neck.position.y = 3.22;
    grp.add(neck);

    // Body — fat: large sphere; fit: scale it down
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.9, 32, 32), clothMat());
    body.position.y = 2.0;
    body.scale.set(2.1, 1.35, 1.4);
    body.castShadow = true;
    grp.add(body);

    // Arms (left / right) — scale XZ for thickness, X pos for spread
    function makeArm(): THREE.Mesh {
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(1, 1.3, 8, 16), skinMat());
      m.castShadow = true;
      return m;
    }
    const la = makeArm();
    la.position.set(-1.85, 2.1, 0);
    la.scale.set(0.3, 1, 0.3);
    la.rotation.z = Math.PI / 8;
    const ra = makeArm();
    ra.position.set( 1.85, 2.1, 0);
    ra.scale.set(0.3, 1, 0.3);
    ra.rotation.z = -Math.PI / 8;
    grp.add(la, ra);

    // Legs (left / right)
    function makeLeg(): THREE.Mesh {
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(1, 1.5, 8, 16), clothMat());
      m.castShadow = true;
      return m;
    }
    const ll = makeLeg();
    ll.position.set(-0.55, -0.05, 0);
    ll.scale.set(0.37, 1, 0.37);
    const rl = makeLeg();
    rl.position.set( 0.55, -0.05, 0);
    rl.scale.set(0.37, 1, 0.37);
    grp.add(ll, rl);

    // Smile arc (torus) — flipped = frown
    const smile = new THREE.Mesh(
      new THREE.TorusGeometry(0.19, 0.035, 8, 16, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    smile.position.set(0, 3.7, 0.55);
    smile.rotation.z = Math.PI; // frown default
    grp.add(smile);

    // ── Particle burst ────────────────────────────────────────────────────
    const PC = 220;
    const pPos = new Float32Array(PC * 3);
    const pVel = new Float32Array(PC * 3);
    const pGeo = new THREE.BufferGeometry();
    const pAttr = new THREE.BufferAttribute(pPos.slice(), 3);
    pGeo.setAttribute('position', pAttr);
    const pMat = new THREE.PointsMaterial({ color: new THREE.Color(c.accent), size: 0.14, transparent: true, opacity: 0 });
    const pts = new THREE.Points(pGeo, pMat);
    scene.add(pts);

    // Pre-compute random velocities
    for (let i = 0; i < PC; i++) {
      const th = Math.random() * Math.PI * 2;
      const ph = Math.random() * Math.PI;
      const sp = 2 + Math.random() * 3.5;
      pVel[i * 3]     = Math.sin(ph) * Math.cos(th) * sp;
      pVel[i * 3 + 1] = Math.cos(ph) * sp;
      pVel[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * sp;
    }

    // ── Fat / fit target values ───────────────────────────────────────────
    const FAT = {
      bodyScaleX: 2.1, bodyScaleY: 1.35, bodyScaleZ: 1.4,
      bodyY: 2.0,
      armScaleXZ: 0.30, armX: 1.85,
      legScaleXZ: 0.37,
      headY: 3.9, eyeY: 4.0, smileY: 3.7, neckY: 3.22,
    };
    const FIT = {
      bodyScaleX: 0.9, bodyScaleY: 1.5, bodyScaleZ: 0.88,
      bodyY: 2.2,
      armScaleXZ: 0.18, armX: 1.2,
      legScaleXZ: 0.22,
      headY: 4.2, eyeY: 4.3, smileY: 4.0, neckY: 3.5,
    };

    // ── Animation state ───────────────────────────────────────────────────
    let morphProg = 0;
    let isTransforming = false;
    let particleTimer = 0;
    const timer = new THREE.Timer();

    // Reset particles to origin
    const resetParticles = () => {
      const arr = pAttr.array as Float32Array;
      for (let i = 0; i < PC; i++) {
        arr[i * 3]     = 0;
        arr[i * 3 + 1] = 2.5;
        arr[i * 3 + 2] = 0;
      }
      pAttr.needsUpdate = true;
      particleTimer = 0;
      pMat.opacity = 0;
    };

    // Expose trigger via closure captured by the ref
    (container as unknown as Record<string, unknown>)._fitTrigger = () => {
      isTransforming = true;
      morphProg = 0;
      resetParticles();
    };

    // ── Main render loop ──────────────────────────────────────────────────
    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      timer.update();
      const dt = timer.getDelta();
      const t  = timer.getElapsed();

      // Idle bob
      grp.position.y = Math.sin(t * 1.15) * 0.05;
      grp.rotation.y = Math.sin(t * 0.28) * 0.15;

      if (isTransforming) {
        morphProg = Math.min(1, morphProg + dt * 0.38);

        // Glow peak at mid-morph
        glow.intensity = Math.sin(morphProg * Math.PI) * 5;

        // Body
        body.scale.set(
          lp(FAT.bodyScaleX, FIT.bodyScaleX, morphProg),
          lp(FAT.bodyScaleY, FIT.bodyScaleY, morphProg),
          lp(FAT.bodyScaleZ, FIT.bodyScaleZ, morphProg),
        );
        body.position.y = lp(FAT.bodyY, FIT.bodyY, morphProg);

        // Arms
        const aXZ = lp(FAT.armScaleXZ, FIT.armScaleXZ, morphProg);
        const aX  = lp(FAT.armX,       FIT.armX,       morphProg);
        la.scale.set(aXZ, 1, aXZ); la.position.x = -aX;
        ra.scale.set(aXZ, 1, aXZ); ra.position.x =  aX;

        // Legs
        const lXZ = lp(FAT.legScaleXZ, FIT.legScaleXZ, morphProg);
        ll.scale.set(lXZ, 1, lXZ);
        rl.scale.set(lXZ, 1, lXZ);

        // Head / eyes / neck rise as character gets taller
        head.position.y  = lp(FAT.headY,  FIT.headY,  morphProg);
        le.position.y    = lp(FAT.eyeY,   FIT.eyeY,   morphProg);
        re.position.y    = lp(FAT.eyeY,   FIT.eyeY,   morphProg);
        smile.position.y = lp(FAT.smileY, FIT.smileY, morphProg);
        neck.position.y  = lp(FAT.neckY,  FIT.neckY,  morphProg);

        // Smile: frown (π) → smile (0)
        smile.rotation.z = lp(Math.PI, 0, morphProg);

        // Particles: active between 35% – 80% morph
        if (morphProg > 0.35 && morphProg < 0.82) {
          particleTimer += dt;
          const arr = pAttr.array as Float32Array;
          for (let i = 0; i < PC; i++) {
            arr[i * 3]     += pVel[i * 3]     * dt * 0.6;
            arr[i * 3 + 1] += pVel[i * 3 + 1] * dt * 0.6;
            arr[i * 3 + 2] += pVel[i * 3 + 2] * dt * 0.6;
            arr[i * 3 + 1] -= 2.5 * dt; // gravity
          }
          pAttr.needsUpdate = true;
          pMat.opacity = Math.min(1, particleTimer * 4);
        } else if (morphProg >= 0.82) {
          pMat.opacity = Math.max(0, pMat.opacity - dt * 2.5);
        }

        if (morphProg >= 1) isTransforming = false;
      }

      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animId);
      renderer.dispose();
      scene.traverse(obj => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m: THREE.Material) => m.dispose());
        }
      });
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      delete (container as unknown as Record<string, unknown>)._fitTrigger;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gender]);

  // Trigger morph when isPlaying becomes true
  useEffect(() => {
    if (isPlaying) {
      playRef.current = true;
      const trigger = (containerRef.current as unknown as Record<string, unknown>)?._fitTrigger;
      if (typeof trigger === 'function') trigger();
    }
  }, [isPlaying]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full ${className}`}
      style={{ background: '#050a14' }}
    />
  );
}
