import * as THREE from "three";

const canvas = document.querySelector("[data-cinema-scene]");
const stage = document.querySelector(".cinema-stage");
const stateLabel = document.querySelector("[data-scene-state]");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (canvas && stage && !reducedMotion) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });

  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
  camera.position.set(0, 0, 13);

  const particleCount = 620;
  const positions = new Float32Array(particleCount * 3);
  const seeds = new Float32Array(particleCount);

  for (let index = 0; index < particleCount; index += 1) {
    const lane = index % 5;
    const turn = index / particleCount;
    const angle = turn * Math.PI * 14 + lane * 0.72;
    const radius = 1.2 + lane * 0.56 + Math.sin(turn * Math.PI * 8) * 0.28;
    const side = index % 2 === 0 ? -1 : 1;

    positions[index * 3] = Math.cos(angle) * radius + side * (lane * 0.12);
    positions[index * 3 + 1] = Math.sin(angle * 0.74) * radius * 0.56 + (turn - 0.5) * 5.8;
    positions[index * 3 + 2] = Math.sin(angle) * 1.7 + Math.cos(turn * Math.PI * 10) * 0.55;
    seeds[index] = Math.random();
  }

  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  particleGeometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));

  const uniforms = {
    uTime: { value: 0 },
    uScroll: { value: 0 },
    uStage: { value: 0 },
    uPointer: { value: new THREE.Vector2(0, 0) },
  };

  const particleMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms,
    vertexShader: `
      attribute float aSeed;
      uniform float uTime;
      uniform float uScroll;
      uniform float uStage;
      uniform vec2 uPointer;
      varying float vSeed;

      void main() {
        vSeed = aSeed;
        vec3 p = position;
        float wave = sin(uTime * 0.65 + aSeed * 18.0 + p.y * 0.72);
        float scrollBend = (uScroll - 0.5) * 3.2;
        p.x += wave * 0.32 + uPointer.x * (0.8 + aSeed);
        p.y += cos(uTime * 0.42 + aSeed * 12.0) * 0.18 - scrollBend;
        p.z += sin(uTime * 0.5 + p.x * 0.7) * 0.46 + uPointer.y * 0.8;
        p.xy *= 1.0 + uStage * 0.055;

        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (2.4 + aSeed * 3.8) * (12.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      precision highp float;
      varying float vSeed;

      void main() {
        vec2 point = gl_PointCoord - 0.5;
        float d = length(point);
        float alpha = smoothstep(0.5, 0.0, d);
        vec3 cyan = vec3(0.10, 0.92, 1.0);
        vec3 magenta = vec3(1.0, 0.16, 0.62);
        vec3 violet = vec3(0.56, 0.36, 1.0);
        vec3 color = mix(cyan, magenta, smoothstep(0.12, 0.92, vSeed));
        color = mix(color, violet, sin(vSeed * 24.0) * 0.24 + 0.24);
        gl_FragColor = vec4(color, alpha * 0.72);
      }
    `,
  });

  const particles = new THREE.Points(particleGeometry, particleMaterial);
  particles.position.set(2.6, 0.08, -1.2);
  particles.rotation.z = -0.08;
  scene.add(particles);

  const linePositions = [];
  for (let index = 0; index < particleCount - 8; index += 8) {
    const next = index + 5 + (index % 17);
    if (next >= particleCount) continue;
    linePositions.push(
      positions[index * 3],
      positions[index * 3 + 1],
      positions[index * 3 + 2],
      positions[next * 3],
      positions[next * 3 + 1],
      positions[next * 3 + 2],
    );
  }

  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));

  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x23e7ff,
    transparent: true,
    opacity: 0.16,
    blending: THREE.AdditiveBlending,
  });

  const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
  lines.position.copy(particles.position);
  lines.rotation.copy(particles.rotation);
  scene.add(lines);

  const ridgeGroup = new THREE.Group();
  const ridgeMaterials = [
    new THREE.LineBasicMaterial({ color: 0x23e7ff, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending }),
    new THREE.LineBasicMaterial({ color: 0xff2e9f, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending }),
    new THREE.LineBasicMaterial({ color: 0xb9f6ff, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending }),
  ];

  for (let ridge = 0; ridge < 3; ridge += 1) {
    const ridgePositions = [];
    const segments = 140;
    for (let step = 0; step < segments; step += 1) {
      const xA = -8.5 + (step / segments) * 17;
      const xB = -8.5 + ((step + 1) / segments) * 17;
      const yA =
        -3.4 +
        ridge * 0.62 +
        Math.sin(step * 0.075 + ridge * 1.8) * 0.28 +
        Math.sin(step * 0.021 + ridge) * 0.74;
      const yB =
        -3.4 +
        ridge * 0.62 +
        Math.sin((step + 1) * 0.075 + ridge * 1.8) * 0.28 +
        Math.sin((step + 1) * 0.021 + ridge) * 0.74;
      ridgePositions.push(xA, yA, -1.8 - ridge * 0.28, xB, yB, -1.8 - ridge * 0.28);
    }

    const ridgeGeometry = new THREE.BufferGeometry();
    ridgeGeometry.setAttribute("position", new THREE.Float32BufferAttribute(ridgePositions, 3));
    const ridgeLine = new THREE.LineSegments(ridgeGeometry, ridgeMaterials[ridge]);
    ridgeLine.userData.baseY = ridgeLine.position.y;
    ridgeGroup.add(ridgeLine);
  }

  ridgeGroup.position.set(0, -0.34, 0);
  ridgeGroup.rotation.x = -0.18;
  scene.add(ridgeGroup);

  const pointer = { x: 0, y: 0 };
  const clock = new THREE.Clock();

  const getScrollAmount = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    return max > 0 ? window.scrollY / max : 0;
  };

  const stageMap = {
    roots: 0,
    system: 1,
    mark: 2,
    beacon: 3,
  };

  const stageNames = {
    roots: "origin",
    system: "route",
    mark: "remember",
    beacon: "companion",
  };

  const syncStage = () => {
    const active = stage.getAttribute("data-active-stage") || "roots";
    uniforms.uStage.value = stageMap[active] ?? 0;
    if (stateLabel) {
      stateLabel.textContent = stageNames[active] || "origin";
    }
  };

  const resize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const animate = () => {
    const time = clock.getElapsedTime();
    uniforms.uTime.value = time;
    uniforms.uScroll.value = getScrollAmount();
    uniforms.uPointer.value.lerp(new THREE.Vector2(pointer.x, pointer.y), 0.08);

    particles.rotation.y = Math.sin(time * 0.11) * 0.08 + uniforms.uScroll.value * 0.48;
    lines.rotation.y = particles.rotation.y;
    particles.rotation.x = Math.cos(time * 0.09) * 0.06;
    lines.rotation.x = particles.rotation.x;
    lineMaterial.opacity = 0.1 + Math.sin(time * 0.7) * 0.035 + uniforms.uStage.value * 0.025;
    ridgeGroup.position.y = -0.34 + Math.sin(time * 0.21) * 0.08 - uniforms.uScroll.value * 0.7;
    ridgeGroup.rotation.z = Math.sin(time * 0.13) * 0.012 + pointer.x * 0.04;
    ridgeMaterials.forEach((material, index) => {
      material.opacity = 0.1 + index * 0.035 + Math.sin(time * 0.32 + index) * 0.035;
    });

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  };

  window.addEventListener(
    "pointermove",
    (event) => {
      pointer.x = (event.clientX / window.innerWidth - 0.5) * 0.7;
      pointer.y = -(event.clientY / window.innerHeight - 0.5) * 0.7;
    },
    { passive: true },
  );

  window.addEventListener("resize", resize);
  new MutationObserver(syncStage).observe(stage, { attributes: true, attributeFilter: ["data-active-stage"] });

  resize();
  syncStage();
  animate();
}
