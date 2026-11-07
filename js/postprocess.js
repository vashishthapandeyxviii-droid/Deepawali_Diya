import * as THREE from 'three';

/* Instead of drawing straight to the screen, 
we draw the scene into a hidden image
 (with depth information), then draw that image 
 to the screen through a shader that adds a subtle depth-
 of-field blur, a vignette and tone mapping.*/
export function createPostProcess(renderer) {
  const dof = new THREE.ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    uniforms: {
      tColor: { value: null }, tDepth: { value: null },
      uNear: { value: 1 }, uFar: { value: 100 }, 
      uFocus: { value: 20 }, uAspect: { value: 1 }
    },
    vertexShader: 'varying vec2 vUv; void main(){vUv = uv;gl_Position = vec4(position.xy, 0.0, 1.0);}',
    fragmentShader: `
      uniform sampler2D tColor, tDepth; uniform float uNear, uFar, uFocus, uAspect; varying vec2 vUv;
      void main() {
        float z = (2.0*uNear*uFar) / (uFar + uNear - (texture2D(tDepth, vUv).x*2.0 - 1.0)*(uFar - uNear));   // distance from camera
        float coc = clamp(abs(z - uFocus) / z * 0.008, 0.0, 0.004);        // blur amount: more when further from the diya
        vec3 sum = texture2D(tColor, vUv).rgb;
        for (int i = 0; i < 12; i++) {
          float a = float(i) * 2.39996, r = sqrt((float(i) + 0.5) / 12.0);
          sum += texture2D(tColor, vUv + vec2(cos(a) / uAspect, sin(a)) * r * coc).rgb;
        }
        vec3 col = sum / 13.0;
        col *= mix(0.5, 1.0, smoothstep(1.15, 0.25, length((vUv - 0.5) * vec2(uAspect, 1.0))));   // vignette
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        gl_FragColor.rgb += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;   // anti-banding
      }`
  });

  // A flat full-screen square that shows the hidden image
  const quadScene = new THREE.Scene();
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), dof);
  quad.frustumCulled = false;
  quadScene.add(quad);

  const hdr = renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float');
  let target;

  return {
    // Call whenever the screen size or camera changes. focus = distance from camera to the diya.
    resize(width, height, camera, focus) {
      const ss = Math.min(Math.max(devicePixelRatio, 1.5), 2);   // draw a bit larger, then shrink = smoother edges
      const w = Math.round(width * ss), h = Math.round(height * ss);
      if (target) { target.depthTexture.dispose(); target.dispose(); }
      target = new THREE.WebGLRenderTarget(w, h, {
        type: hdr ? THREE.HalfFloatType : THREE.UnsignedByteType,
        depthTexture: new THREE.DepthTexture(w, h)
      });
      dof.uniforms.tColor.value = target.texture;
      dof.uniforms.tDepth.value = target.depthTexture;
      dof.uniforms.uNear.value = camera.near;
      dof.uniforms.uFar.value = camera.far;
      dof.uniforms.uFocus.value = focus;
      dof.uniforms.uAspect.value = width / height;
    },

    render(scene, camera) {
      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(quadScene, quadCam);
    }
  };
}