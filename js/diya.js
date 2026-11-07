import * as THREE from 'three';
import { randNum, smooth, canvasTex } from './utils.js';

// Pulls the lip outward on one side to make the traditional pinched spout.
// y = height, a = angle around the bowl. Returns a multiplier for the radius.
const spout = (y, a) => {
  const t = smooth(0.38, 0.72, y);
  const w = Math.atan2(Math.sin(a), Math.cos(a));
  return 1 + 0.5 * t * Math.exp(-w * w / 0.14) - 
  0.07 * t * Math.exp(-Math.pow(Math.abs(w) - 0.6, 2) 
  / 0.05);
};

export function createDiya(scene) {
  const diya = new THREE.Group();
  diya.rotation.y = Math.PI * 1.3;            // turns the spout toward the camera (front-left)
  scene.add(diya);

  /* ---- Bowl: a side profile (radius, height) spun around the Y axis ---- */
  // Goes up the outside, over the lip, then down the inside
  const profile = new THREE.SplineCurve([
    [0, 0], [0.4, 0], [0.55, 0.02], [0.62, 0.06], 
    [0.85, 0.16], [1.05, 0.3], [1.15, 0.45], [1.14, 0.58],
    [1.08, 0.68], [1.02, 0.72], [0.95, 0.7], [0.92, 0.62],
     [0.95, 0.5], [0.88, 0.36], [0.7, 0.26],
    [0.4, 0.22], [0, 0.21]
  ].map(p => new THREE.Vector2(...p))).getPoints(110).map(
    p => new THREE.Vector2(Math.max(0, p.x), p.y));

  const SEG = 96;
  const lathe = new THREE.LatheGeometry(profile, SEG);
  const P = lathe.attributes.position;
  for (let i = 0; i < P.count; i++) {         // stretch the spout
    const f = spout(P.getY(i), Math.atan2(P.getZ(i), 
    P.getX(i)));
    P.setX(i, P.getX(i) * f);
    P.setZ(i, P.getZ(i) * f);
  }
  lathe.computeVertexNormals();

  // Make the seam (where the spin starts and ends) shade smoothly
  const N = lathe.attributes.normal, n = profile.length;
  for (let j = 0; j < n; j++) {
    const a = j, b = SEG * n + j;
    const x = (N.getX(a) + N.getX(b)) / 2, y = (N.getY(a) 
    + N.getY(b)) / 2, z = (N.getZ(a) + N.getZ(b)) / 2;
    N.setXYZ(a, x, y, z);
    N.setXYZ(b, x, y, z);
  }

  /* ---- Clay material: colour texture + bump texture ---- */
  const clayMap = canvasTex(512, (g, s) => {            // mottling + speckles
    g.fillStyle = '#b4592b'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 700; i++) {
      const x = randNum() * s, y = randNum() * s, 
      r = 6 + randNum() * 34;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, randNum() > 0.5 ? 
      'rgba(235,150,95,.13)' : 'rgba(70,25,10,.16)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, 
        r * 2);
    }
    for (let i = 0; i < 9000; i++) {
      g.fillStyle = randNum() > 0.5 ? 'rgba(60,20,8,.25)'
       : 'rgba(240,170,120,.22)';
      g.fillRect(randNum() * s, randNum() * s, 1.5, 1.5);
    }
  }, { color: true });

  const clayBump = canvasTex(512, (g, s) => {           // rough grain + potter's-wheel ridges
    g.fillStyle = '#808080'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 14000; i++) {
      g.fillStyle = randNum() > 0.5 ? 
      'rgba(255,255,255,.18)' : 'rgba(0,0,0,.18)';
      g.fillRect(randNum() * s, randNum() * s, 2, 2);
    }
    for (let y = 0; y < s; y += 8) {
      g.fillStyle = 'rgba(255,255,255,.12)';
      g.fillRect(0, y, s, 2);
      g.fillStyle = 'rgba(0,0,0,.12)'; 
      g.fillRect(0, y + 3, s, 2);
    }
  });

  const clay = new THREE.MeshPhysicalMaterial({
    map: clayMap, bumpMap: clayBump, bumpScale: 2.5, 
    roughness: 0.78,
    sheen: 0.4, sheenColor: new THREE.Color('#ffb27a'),
     sheenRoughness: 0.7
  });
  const body = new THREE.Mesh(lathe, clay);
  body.castShadow = body.receiveShadow = true;
  diya.add(body);

  /* ---- Oil inside the bowl ---- */
  const oil = new THREE.Mesh(
    new THREE.CircleGeometry(0.86, 48).rotateX(-Math.PI / 2),
    new THREE.MeshPhysicalMaterial({ color: '#4a2a08', 
        roughness: 0.05, clearcoat: 1, clearcoatRoughness:
         0.05 })
  );
  oil.position.y = 0.335;
  diya.add(oil);

  /* ---- Gold painted dots around the belly ---- */
  const dots = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.036, 10, 8),
    new THREE.MeshStandardMaterial({ color: '#f1c45a',
         metalness: 1, roughness: 0.3 }),
    40
  );
  for (let i = 0; i < 40; i++) {
    const a = i / 40 * Math.PI * 2, r = 1.15 * spout(
        0.5, a);
    dots.setMatrixAt(i, new THREE.Matrix4().setPosition(
        r * Math.cos(a), 0.5, r * Math.sin(a)));
  }
  diya.add(dots);

  /* ---- Cotton wick: a twisted tube resting on the spout, with a charred tip ---- */
  const twist = canvasTex(128, (g, s) => {
    g.fillStyle = '#f2e6cb'; g.fillRect(0, 0, s, s);
    g.strokeStyle = 'rgba(150,120,80,.55)'; 
    g.lineWidth = 6;
    for (let k = -s; k <= s * 2; k += s / 4) { 
        g.beginPath(); g.moveTo(k, 0); g.lineTo(k + s, s);
         g.stroke(); }
  }, { color: true });
  twist.repeat.set(10, 1);

  const wickMat = new THREE.MeshStandardMaterial(
    { map: twist, bumpMap: twist, bumpScale: 1,
         roughness: 1 });
  const wickPath = new THREE.CatmullRomCurve3(
    [[0.5, 0.35, 0], [0.9, 0.4, 0], [1.1, 0.53, 0], 
    [1.28, 0.665, 0], [1.45, 0.775, 0]].map(
        p => new THREE.Vector3(...p))
  );
  diya.add(new THREE.Mesh(new THREE.TubeGeometry(
    wickPath, 24, 0.05, 8), wickMat));

  // The tip glows like an ember after lighting (main.js animates this material)
  const tipMat = new THREE.MeshStandardMaterial(
    { color: '#f2e6cb', roughness: 1,
         emissive: '#ff5a10', emissiveIntensity: 0 });
  const tip = new THREE.Mesh(new THREE.SphereGeometry(
    0.058, 12, 10), tipMat);
  tip.position.set(1.45, 0.775, 0);
  diya.add(tip);

  /* ---- Invisible sphere that makes the diya easy to tap ---- */
  const hit = new THREE.Mesh(new THREE.SphereGeometry(
    1.7, 16, 12), new THREE.MeshBasicMaterial(
        { visible: false }));
  hit.position.y = 0.8;
  diya.add(hit);

  return { diya, hit, tipMat };
}