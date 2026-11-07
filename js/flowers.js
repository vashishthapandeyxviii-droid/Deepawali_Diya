import * as THREE from 'three';
import { randNum, smooth, canvasTex } from './utils.js';

// One curved, cupped, frilly petal. Every flower is built from many copies of it.
function makePetalGeometry() {
  const g = new THREE.PlaneGeometry(1, 1, 6, 6);
  const pos = g.attributes.position, 
  uv = g.attributes.uv;
  const shade = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const col = Math.round(uv.getX(i) * 6), 
    u = uv.getX(i) * 2 - 1, v = uv.getY(i);   // u: across, v: along the petal
    const half = 0.5 * (0.2 + 0.8 * smooth(0, 0.55, v)) * 
    (1 - 0.2 * smooth(0.8, 1, v));  // narrow base, broad tip
    const frill = (col % 2) * 0.07 * smooth(0.7, 1, v);                                    // zig-zag edge
    const z = 0.5 * u * u * half * smooth(0.1, 0.6, v)                                      // cupped sideways
            + 0.4 * v * v                                                                    // curled along its length
            + 0.04 * Math.sin(v * 10 + u * 3) * 
            smooth(0.5, 1, v);                           // gentle ripple
    pos.setXYZ(i, u * half, v - frill, z);
    const s = 0.4 + 0.6 * Math.pow(v, 0.7);                                                  // dark base = fake ambient occlusion
    shade.set([s, s * 0.95, s * 0.9], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute
    (shade, 3));
  g.computeVertexNormals();
  return g;
}

export function createFlowers(scene) {
  // Fine veins running along each petal
  const veins = canvasTex(128, (g, s) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, s, s);
    for (let x = 0; x < s; x += 4) {
      g.fillStyle = `rgba(120,50,0,${
        0.06 + randNum() * 0.1})`;
      g.fillRect(x + randNum() * 2, 0, 1.5, s);
    }
  }, { color: true });

  const petalMat = new THREE.MeshPhysicalMaterial({
    vertexColors: true, map: veins, bumpMap: veins, 
    bumpScale: 0.4, roughness: 0.7, 
    side: THREE.DoubleSide,
    sheen: 0.8, sheenRoughness: 0.55, 
    sheenColor: new THREE.Color('#ffb04a')
  });

  // One InstancedMesh draws ~2000 petals in a single go (fast!)
  const petals = new THREE.InstancedMesh(
    makePetalGeometry(), petalMat, 2200);
  petals.castShadow = petals.receiveShadow = true;
  petals.frustumCulled = false;
  scene.add(petals);

  const PALETTE = [
    [new THREE.Color('#d4500a'), 
        new THREE.Color('#f9a41c')],   // deep orange flowers (outer -> inner petals)
    [new THREE.Color('#f0a010'), 
        new THREE.Color('#ffdc4c')]    // golden yellow flowers
  ];

  // Petal rings, outside to inside: [count, angle up (deg), length, width, height, distance from centre]
  const LAYERS = [
    [22, 8, 1.0, 0.6, 0.0, 0.3], 
    [20, 22, 0.92, 0.55, 0.04, 0.26], 
    [17, 38, 0.8, 0.5, 0.08, 0.21],
    [14, 54, 0.66, 0.42, 0.12, 0.16], 
    [10, 68, 0.52, 0.34, 0.16, 0.11], 
    [6, 80, 0.36, 0.28, 0.19, 0.06],
    [5, 86, 0.22, 0.22, 0.2, 0.02]
  ];

  let used = 0;
  const M = new THREE.Matrix4(),
   RM = new THREE.Matrix4();
  const X = new THREE.Vector3(), 
  Y = new THREE.Vector3(), Z = new THREE.Vector3(), S = new THREE.Vector3();
  const C = new THREE.Color();

  // Places one petal. FM = the flower's transform, phi = angle around the flower,
  // alpha = how steeply the petal points up, kind = 0 orange / 1 yellow, t = 0 outer ... 1 inner
  function addPetal(FM, phi, alpha, rho, y0, L, W, roll, pitch, kind, t) {
    const cp = Math.cos(phi), sp = Math.sin(phi), ca = Math.cos(alpha), sa = Math.sin(alpha);
    X.set(-sp, 0, cp);                 // petal width direction
    Y.set(cp * ca, sa, sp * ca);       // petal length direction
    Z.set(-cp * sa, ca, -sp * sa);     // petal face direction
    M.makeBasis(X, Y, Z).setPosition(
        rho * cp, y0, rho * sp);
    M.multiply(RM.makeRotationY(roll)).multiply(
        RM.makeRotationX(pitch)).scale(
            S.set(W, L, L)).premultiply(FM);
    petals.setMatrixAt(used, M);
    petals.setColorAt(used, C.copy(PALETTE[
        kind][0]).lerp(PALETTE[kind][1], t).multiplyScalar(
            0.85 + randNum() * 0.3));
    used++;
  }

  const UP = new THREE.Vector3(0, 1, 0);
  const q1 = new THREE.Quaternion(), 
  q2 = new THREE.Quaternion(), FM = new THREE.Matrix4();
  const shadows = [{ x: 0, z: 0, d: 4.6 }];   // soft dark patches under the diya and each flower

  function addFlower(angle, radius, R, tilt, y, kind) {
    const x = radius * Math.cos(angle), 
    z = radius * Math.sin(angle);
    q1.setFromAxisAngle(new THREE.Vector3(Math.sin(angle),
     0, -Math.cos(angle)), tilt);   // lean outward
    q1.multiply(q2.setFromAxisAngle(UP, randNum() * 6.28));                                    // random spin
    FM.compose(new THREE.Vector3(x, y, z), q1, 
    new THREE.Vector3(R, R, R));

    LAYERS.forEach(([count, deg, L, W, y0, rho], k) => {
      for (let i = 0; i < count; i++) {
        const phi = (i + (k % 2) * 0.5 + (randNum() - 0.5) 
        * 0.5) / count * Math.PI * 2;
        addPetal(FM, phi, (deg + (randNum() - 0.5) * 14)
         * Math.PI / 180, rho, y0 + randNum() * 0.03,
          L * (0.9 + randNum() * 0.2), W * (0.9 + randNum()
           * 0.2),
          (randNum() - 0.5) * 0.5, (randNum() - 0.5) * 0.3, 
          kind, k / (LAYERS.length - 1));
      }
    });
    shadows.push({ x, z, d: R * 3.4 });
  }

  // Inner ring: 8 flowers. Outer ring: 14 bigger flowers, leaning outward.
  for (let i = 0; i < 8; i++)  addFlower(i / 8 * Math.PI *
     2, 2.55, 0.72 * (0.94 + randNum() * 0.12), 0.2, 0.14,
      i % 2);
  for (let i = 0; i < 14; i++) addFlower((i + 0.5) / 14 *
   Math.PI * 2, 4.3, 0.9 * (0.94 + randNum() * 0.12), 0.5,
    0.28, (i + 1) % 2);

  // Loose petals lying around the arrangement
  for (let i = 0; i < 40; i++) {
    const a = i * 2.39996, r = 1.75 + Math.pow(i / 40, 1.4)
     * 3.9, s = 0.5 + randNum() * 0.3;
    FM.compose(new THREE.Vector3(r * Math.cos(a), 0.03, 
    r * Math.sin(a)), q1.setFromAxisAngle(UP, randNum() * 
    6.28), new THREE.Vector3(s, s, s));
    addPetal(FM, 0, 0.05, 0, 0, 1, 0.6, (randNum() - 0.5) *
     0.6, randNum() * 0.35, randNum() > 0.5 ? 1 : 0, 
     randNum());
  }

  petals.count = used;
  petals.instanceMatrix.needsUpdate = true;
  petals.instanceColor.needsUpdate = true;

  // Dark soft patches on the plate under the diya and each flower (ambient-occlusion look)
  const aoTex = canvasTex(128, (g, s) => {
    const gr = g.createRadialGradient(s / 2, s / 2, 0, 
        s / 2, s / 2, s / 2);
    gr.addColorStop(0, 'rgba(0,0,0,.7)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
  });
  const ao = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: aoTex, 
        transparent: true, depthWrite: false, fog: false }),
    shadows.length
  );
  shadows.forEach((s, i) => ao.setMatrixAt(i,
    M.compose(new THREE.Vector3(s.x, 0.02, s.z), 
    new THREE.Quaternion(), 
    new THREE.Vector3(s.d, 1, s.d))));
  ao.renderOrder = 1;
  ao.frustumCulled = false;
  scene.add(ao);
}