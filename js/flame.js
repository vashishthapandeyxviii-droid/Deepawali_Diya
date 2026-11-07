import * as THREE from 'three';
import { canvasTex } from './utils.js';

// Vertex shader: bends and ripples the flame shape every frame
const flameVS = `
  uniform float uTime, uSeed; 
  varying float vH; varying vec3 vN, vV;
  void main() {
    vec3 p = position; float h = position.y; 
    vH = h; float w = h * h;
    float ang = atan(position.z, position.x);
    p.x += (sin(uTime*7.0 + h*4.0 + uSeed)*0.30 + 
    sin(uTime*13.0 + h*7.0 + uSeed*2.0)*0.12) * w; // sway
    p.z += (cos(uTime*6.0 + h*3.5 + uSeed*1.3)*0.22 + 
    sin(uTime*11.0 + uSeed)*0.08) * w;
    p.xz *= 1.0 + 0.12*sin(uTime*9.0 + h*10.0 + 
    ang*3.0 + uSeed) * (0.3 + h);              // ripples
    p.y *= 1.0 + 0.07*sin(uTime*8.0 + uSeed) +
     0.05*sin(uTime*19.0 + uSeed*3.0);                     // stretch
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vN = normalize(normalMatrix * normal); 
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`;

// Fragment shader: colours the flame (blue base -> yellow -> orange) with soft, see-through edges
const flameFS = `
  uniform vec3 uBottom, uTop; uniform float uAlpha, 
  uBlue, uPower, uFlick; varying float vH; varying vec3 vN,
   vV;
  void main() {
    float f = abs(dot(normalize(vN), normalize(vV)));
    vec3 col = mix(uBottom, uTop, smoothstep(0.05, 0.95, 
    vH));
    col = mix(col, vec3(0.12, 0.32, 1.0), 
    (1.0 - smoothstep(0.0, 0.3, vH)) * uBlue);
    float a = uAlpha * pow(f, 0.8) * 
    (1.0 - smoothstep(0.78, 1.0, vH)) * uPower;
    gl_FragColor = vec4(col * uFlick, a);
  }`;

export function createFlame(diya) {
  // Teardrop shape, height 0 -> 1, spun around the Y axis
  const pts = [];
  for (let i = 0; i <= 28; i++) {
    const h = i / 28;
    pts.push(new THREE.Vector2(0.5 * Math.pow(
        Math.sin(Math.PI * Math.pow(h, 0.62)), 0.85) *
         (1 - 0.25 * h), h));
  }
  const geometry = new THREE.LatheGeometry(pts, 24);

  // Values shared by all flame layers; main.js updates these every frame
  const timeU = { value: 0 };    // time
  const powerU = { value: 0 };   // 0 = out, 1 = fully lit
  const flickU = { value: 1 };   // brightness flicker

  function layer(sx, sy, bottom, top, alpha, blue, seed) {
    const mesh = new THREE.Mesh(geometry, 
        new THREE.ShaderMaterial({
      vertexShader: flameVS, fragmentShader: flameFS,
      transparent: true, depthWrite: false, 
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: timeU, uPower: powerU, uFlick: flickU,
        uSeed: { value: seed }, uAlpha: { value: alpha },
         uBlue: { value: blue },
        uBottom: { value: new THREE.Color(...bottom) }, 
        uTop: { value: new THREE.Color(...top) }
      }
    }));
    mesh.scale.set(sx, sy, sx);
    mesh.renderOrder = 5;
    return mesh;
  }

  const flame = new THREE.Group();
  flame.position.set(1.45, 0.8, 0);          // sits on the wick tip
  flame.visible = false;
  flame.add(
    layer(0.36, 0.95, [1, 0.42, 0.04], [1, 0.16, 0], 
        0.55, 0.9, 0),      // orange outer
    layer(0.27, 0.72, [1, 0.78, 0.2], [1, 0.5, 0.08], 
        0.75, 0.5, 2),     // yellow middle
    layer(0.13, 0.45, [1, 0.97, 0.75], [1, 0.8, 0.35], 
        0.9, 0, 4)        // pale core
  );
  diya.add(flame);

  // Warm point light that lights the diya and flowers and casts shadows
  const light = new THREE.PointLight('#ff9a40',
     0, 0, 1.2);
  light.position.set(1.45, 1.25, 0);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.bias = -0.0006;
  light.shadow.normalBias = 0.03;
  light.shadow.camera.near = 0.15;
  light.shadow.camera.far = 16;
  diya.add(light);

  // Soft glow: two additive sprites that always face the camera
  const glowTex = canvasTex(256, (g, s) => {
    const gr = g.createRadialGradient(s / 2, s / 2, 0, 
        s / 2, s / 2, s / 2);
    gr.addColorStop(0, 'rgba(255,225,160,1)');
    gr.addColorStop(0.12, 'rgba(255,180,80,.55)');
    gr.addColorStop(0.4, 'rgba(255,120,30,.14)');
    gr.addColorStop(1, 'rgba(255,90,10,0)');
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
  }, { color: true });

  const glowSprite = () => {
    const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
      map: glowTex, color: new THREE.Color(1, 0.8, 0.5),
       blending: THREE.AdditiveBlending,
      transparent: true, depthTest: false, 
      depthWrite: false, opacity: 0, fog: false
    }));
    sprite.renderOrder = 10;
    sprite.position.y = 0.4;
    return sprite;
  };
  const halo = glowSprite();   // bright, pulses
  const wide = glowSprite();   // big and faint
  flame.add(wide, halo);

  return { flame, light, halo, wide, 
    timeU, powerU, flickU };
}