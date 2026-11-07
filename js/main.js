import * as THREE from'three';
import { Timer } from 'three/addons/misc/Timer.js';
import {createSurface} from './surface.js'; 
import {createDiya} from './diya.js'; 
import {createFlame} from './flame.js';
import {createFlowers} from './flowers.js';
import {createPostProcess} from './postprocess.js';
import {playIgnite} from './sound.js';
const LIGHT_POWER = 16; //flame brightness 
/* 1. renderer, scene, camera */
const renderer = new THREE.WebGLRenderer(
  {powerPreference:
  'high-performance'
});
renderer.setPixelRatio(Math.min(
  devicePixelRatio, 2));
renderer.toneMapping= THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure= 1.2;
renderer.shadowMap.enabled= true;
renderer.shadowMap.type= THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate=false;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background= new THREE.Color('#150a05');
scene.fog= new THREE.FogExp2('#150a05', 0.02);
const camera= new THREE.PerspectiveCamera(30, 1, 1,
   200);
const lookAt = new THREE.Vector3(0, 0.4, 0);

{
  const c = document.createElement('canvas');
  c.width = 512; c.height= 256;
  const g = c.getContext('2d'), 
  grad = g.createLinearGradient(
    0,0,0, 256
  );
  grad.addColorStop(0, '#6a4426');
   grad.addColorStop(
    0.5, '#2a170b'
  ); grad.addColorStop(1, '#120804');
  g.fillStyle= grad; g.fillRect(0, 0, 512, 256);
  [[90, 40, 90, 50, '#ffd9a0'], 
  [330, 30, 120,40, '#ffc27a'],
[220, 90, 60, 30, '#ff9d4a']].forEach((
  [x, y, w,h, col]) => {
  g.fillStyle = col; g.fillRect(x, y, w, h);
});
const tex = new THREE.CanvasTexture(c);
tex.mapping = THREE.EquirectangularReflectionMapping;
tex.colorSpace= THREE.SRGBColorSpace;
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromEquirectangular(
  tex).texture;
pmrem.dispose(); tex.dispose();
}

/* 2. Light: dim "moonlight" that fades when the flame is lit */
const key = new THREE.DirectionalLight('#ffd3a0', 2.2);
key.position.set(-5, 9, 7);
scene.add(key);

/* 3. Build the scene */
createSurface(scene);
const {diya, hit, tipMat} = createDiya(scene); 
const {flame, light: flameLight, halo, wide, timeU, powerU,
  flickU} = createFlame(diya);
createFlowers(scene); 
const post = createPostProcess(renderer);


/* 4. Responsive camera (fixed position, refits on resize) */
function resize() {
  const w = innerWidth, h = innerHeight, aspect = w/h;
  renderer.setSize(w, h);
  const elev= THREE.MathUtils.degToRad(aspect<1?58:40);
  const tanV= Math.tan(THREE.MathUtils.degToRad(
    camera.fov/2));
  const halfW= aspect<1? 4.3:4.5, 
  halfH= aspect<1?4.4:3.3;
  const dist = Math.max(halfW/ (tanV*aspect), 
  halfH/tanV);
  camera.aspect = aspect;
  camera.near= dist*0.4;
  camera.far= dist*3;
  camera.position.set(0, Math.sin(elev)*dist,
   Math.cos(elev)*dist).add(
    lookAt
  );
  camera.lookAt(lookAt);
  camera.updateProjectionMatrix();
  post.resize(w,h, camera, dist); 
}
addEventListener('resize', resize);
resize();

/* ================= 5. Tap to light / extinguish ================= */
let lit = false;
const hint = document.getElementById('hint');
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();

const overDiya = e => {
  ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / 
    innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  return ray.intersectObject(hit).length > 0;
};
const toggle = () => {
  lit = !lit;
  if (lit) playIgnite();
  hint.textContent = lit ? 'Tap the diya again to put it out' : 
  'Tap the diya to light it';
};
addEventListener('click', e => { if (overDiya(e)) toggle(); });
addEventListener('pointermove', e => {document.body.style.cursor 
  = overDiya(e) ? 'pointer' : 'default'; });
addEventListener('keydown', e => { if (e.key === 'Enter' ||
   e.key === ' ') { e.preventDefault(); toggle(); } });

/* ================= 6. Animation loop ================= */
const timer = new Timer();
const charred = new THREE.Color('#2a1a10');
let power = 0, ember = 0, frame = 0;

renderer.setAnimationLoop(() => {
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.05), 
  t = timer.getElapsed();

  power += ((lit ? 1 : 0) - power) * 
  (1 - Math.exp(-dt * (lit ? 1.4 : 4.5)));  // flame grows slowly, dies quickly
  ember += ((lit ? 1 : 0) - ember) * (1 - Math.exp(-dt * 
    (lit ? 0.8 : 0.5)));   // wick tip stays warm a little longer
  const g = power * power * (3 - 2 * power);
  const fl = 0.55 * Math.sin(t * 11.3) + 0.3 * 
  Math.sin(t * 17.9 + 1.7) + 0.15 * Math.sin(t * 29.1 + 0.4);      // flicker, -1..1
  const pulse = Math.sin(t * 2.2) * 0.5 + 0.5;                                    // slow glow pulse, 0..1

  flame.visible = power > 0.003;
  flame.scale.setScalar(Math.max(g, 0.001));
  timeU.value = t; powerU.value = power; 
  flickU.value = 1 + 0.1 * fl;

  flameLight.intensity = LIGHT_POWER * g * (
    1 + 0.16 * fl + (Math.random() - 0.5) * 0.05
  );
  flameLight.position.set(1.45 + 0.03 * Math.sin(t * 9), 
  1.25, 0.03 * Math.cos(t * 7));

  halo.material.opacity = power *(0.5 + 0.1 * pulse + 0.05 * fl);
  halo.scale.setScalar(3.2 * (1 + 0.05 * pulse));
  wide.material.opacity = power * (0.28 + 0.07 * pulse);
  wide.scale.setScalar(8);

  tipMat.emissiveIntensity = ember * 2.2;
  tipMat.color.set('#f2e6cb').lerp(charred, ember);

  key.intensity = THREE.MathUtils.lerp(2.2, 0.5, power);
  scene.environmentIntensity = THREE.MathUtils.lerp(
    0.9, 0.4, power);

  if ((frame < 4 || power > 0.01) && 
  frame % 3 === 0) renderer.shadowMap.needsUpdate = true;         // refresh shadows every 3rd frame
  frame++;

  post.render(scene, camera);
});