import * as THREE from 'three';
import {createSurface} from './surface.js';
import {createDiya} from './diya.js'; 


/* ================= 1. Renderer, scene, camera ================= */
const renderer = new THREE.WebGLRenderer({ powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false;                 // we refresh shadows ourselves (cheaper)
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#150a05');
scene.fog = new THREE.FogExp2('#150a05', 0.02);
const camera = new THREE.PerspectiveCamera(30, 1, 1, 200);
const lookAt = new THREE.Vector3(0, 0.4, 0);

// A tiny warm "studio" painted on a canvas, used for reflections on brass and glaze
{
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d'), grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#6a4426'); grad.addColorStop(0.5, '#2a170b'); grad.addColorStop(1, '#120804');
  g.fillStyle = grad; g.fillRect(0, 0, 512, 256);
  [[90, 40, 90, 50, '#ffd9a0'], [330, 30, 120, 40, '#ffc27a'], [220, 90, 60, 30, '#ff9d4a']]
    .forEach(([x, y, w, h, col]) => { g.fillStyle = col; g.fillRect(x, y, w, h); });
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromEquirectangular(tex).texture;
  pmrem.dispose(); tex.dispose();
}

/* ================= 2. Light: dim "moonlight" that fades when the flame is lit ================= */
const key = new THREE.DirectionalLight('#ffd3a0', 2.2);
key.position.set(-5, 9, 7);
scene.add(key);

/* ================= 3. Build the scene (order matters a little: it uses seeded random numbers) ================= */
createSurface(scene);
const {diya, hit, tipMat} = createDiya(scene);
/* ================= 4. Responsive camera (fixed position, refits on resize) ================= */
function resize() {
  const w = innerWidth, h = innerHeight, aspect = w / h;
  renderer.setSize(w, h);
  const elev = THREE.MathUtils.degToRad(aspect < 1 ? 58 : 40);           // look down more steeply on phones
  const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const halfW = aspect < 1 ? 4.6 : 6.4, halfH = aspect < 1 ? 6 : 4.4;     // how much of the scene must fit
  const dist = Math.max(halfW / (tanV * aspect), halfH / tanV);
  camera.aspect = aspect;
  camera.near = dist * 0.4;
  camera.far = dist * 3;
  camera.position.set(0, Math.sin(elev) * dist, Math.cos(elev) * dist).add(lookAt);
  camera.lookAt(lookAt);
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

/* ================= 5. Animation loop (draws the scene every frame) ================= */
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
});