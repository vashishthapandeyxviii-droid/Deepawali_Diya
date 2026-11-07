import * as THREE from 'three';
import { randNum, canvasTex } from './utils.js';

// Dark ground + the hammered brass plate (thali) everything sits on
export function createSurface(scene) {
  // Ground
  const grain = canvasTex(256, (g, s) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 9000; i++) {
      g.fillStyle = randNum() > 0.5 ? 
      'rgba(255,255,255,.14)' : 'rgba(0,0,0,.14)';
      g.fillRect(randNum() * s, randNum() * s, 2, 2);
    }
  }, { repeat: 40 });

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: '#2b160a', 
      roughness: 0.6, bumpMap: grain, bumpScale: 1.5 })
  );
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  scene.add(ground);

  // Hammered-metal dimples (used as a bump map)
  const hammer = canvasTex(512, (g, s) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 500; i++) {
      const x = randNum() * s, y = randNum() * s, 
      r = 8 + randNum() * 14;
      const gr = g.createRadialGradient(x - r * 0.3, 
        y - r * 0.3, 0, x, y, r);
      gr.addColorStop(0, 'rgba(255,255,255,.35)');
      gr.addColorStop(1, 'rgba(0,0,0,.3)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7);
       g.fill();
    }
  });
  hammer.repeat.set(12, 3);

  const brass = new THREE.MeshStandardMaterial({
    color: '#c9953c', metalness: 1, roughness: 0.38, 
    bumpMap: hammer, bumpScale: 0.6, side: THREE.DoubleSide
  });

  // Plate: a flat middle that curves up into a rim (side profile spun around the Y axis)
  const dishPts = new THREE.SplineCurve(
    [[0, 0], [3.2, 0], [3.6, 0.05], [3.85, 0.2], 
    [4.0, 0.38], [4.08, 0.55]].map(p => new THREE.Vector2(...p))
  ).getPoints(40);
  const dish = new THREE.Mesh(new THREE.LatheGeometry(
    dishPts, 96), brass);
  dish.receiveShadow = true;

  const rim = new THREE.Mesh(new THREE.TorusGeometry(
    4.08, 0.08, 12, 96).rotateX(Math.PI / 2), brass);
  rim.position.y = 0.56;

  scene.add(dish, rim);
}