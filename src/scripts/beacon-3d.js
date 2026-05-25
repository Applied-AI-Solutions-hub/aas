import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const MODEL_URL = "/models/beacon-rig.glb";

export function mountBeaconStage(host, options = {}) {
  const prefersReducedMotion = Boolean(options.reducedMotion);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 1.35, 7.5);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);

  const rig = createProceduralBeacon();
  scene.add(rig.root);

  const mixerState = { mixer: null, actions: [], model: null };
  loadBlenderRig(scene, rig.root, mixerState);

  const ambient = new THREE.HemisphereLight(0xbff3ff, 0x06111a, 2.1);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xffffff, 2.5);
  key.position.set(-3, 5, 5);
  key.castShadow = true;
  scene.add(key);

  const rim = new THREE.PointLight(0x27d9ff, 4.2, 8);
  rim.position.set(2.4, 1.8, 2.4);
  scene.add(rim);

  const floorGlow = new THREE.Mesh(
    new THREE.CircleGeometry(1.85, 64),
    new THREE.MeshBasicMaterial({ color: 0x27d9ff, transparent: true, opacity: 0.14 })
  );
  floorGlow.rotation.x = -Math.PI / 2;
  floorGlow.position.y = -1.55;
  floorGlow.scale.set(1.4, 0.5, 1);
  scene.add(floorGlow);

  const pointer = { x: 0, y: 0, active: false, state: "idle" };
  const clock = new THREE.Clock();
  let frame = 0;

  function resize() {
    const rect = host.getBoundingClientRect();
    const width = Math.max(320, rect.width);
    const height = Math.max(420, rect.height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  resize();

  const hero = host.closest("[data-beacon-hero]");
  if (hero) {
    hero.addEventListener("pointermove", (event) => {
      const rect = hero.getBoundingClientRect();
      pointer.x = THREE.MathUtils.clamp(((event.clientX - rect.left) / rect.width - 0.5) * 2, -1, 1);
      pointer.y = THREE.MathUtils.clamp(((event.clientY - rect.top) / rect.height - 0.5) * 2, -1, 1);
      pointer.active = true;
    });
    hero.addEventListener("pointerleave", () => {
      pointer.x = 0;
      pointer.y = 0;
      pointer.active = false;
      pointer.state = "idle";
    });
  }

  document.querySelectorAll("[data-beacon-state]").forEach((trigger) => {
    trigger.addEventListener("pointerenter", () => {
      if (trigger instanceof HTMLElement) {
        pointer.state = trigger.dataset.beaconState || "ready";
      }
    });
    trigger.addEventListener("pointerleave", () => {
      pointer.state = pointer.active ? "listening" : "idle";
    });
  });

  function tick() {
    const delta = clock.getDelta();
    const elapsed = clock.elapsedTime;

    if (mixerState.mixer) {
      mixerState.mixer.update(delta);
      if (mixerState.model) {
        mixerState.model.rotation.y = THREE.MathUtils.lerp(mixerState.model.rotation.y, pointer.x * 0.22, 0.08);
        mixerState.model.rotation.x = THREE.MathUtils.lerp(mixerState.model.rotation.x, -pointer.y * 0.04, 0.08);
      }
    } else {
      animateProceduralBeacon(rig, elapsed, pointer, prefersReducedMotion);
    }

    floorGlow.material.opacity = 0.11 + Math.sin(elapsed * 1.8) * 0.025;
    renderer.render(scene, camera);
    frame = requestAnimationFrame(tick);
  }

  options.onReady?.();
  tick();

  window.addEventListener("pagehide", () => {
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    renderer.dispose();
  }, { once: true });
}

function loadBlenderRig(scene, fallbackRoot, mixerState) {
  const loader = new GLTFLoader();
  loader.load(
    MODEL_URL,
    (gltf) => {
      fallbackRoot.visible = false;
      const model = gltf.scene;
      model.position.set(0.5, -1.45, 0);
      model.scale.setScalar(1.35);
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      scene.add(model);
      mixerState.model = model;

      if (gltf.animations.length) {
        mixerState.mixer = new THREE.AnimationMixer(model);
        mixerState.actions = gltf.animations.map((clip) => mixerState.mixer.clipAction(clip));
        mixerState.actions[0]?.reset().fadeIn(0.2).play();
      }
    },
    undefined,
    () => {
      fallbackRoot.visible = true;
    }
  );
}

function createProceduralBeacon() {
  const root = new THREE.Group();
  root.position.set(0.7, -1.32, 0);

  const materials = {
    blue: material(0x0d4db8, 0.55, 0.55),
    dark: material(0x07111f, 0.4, 0.68),
    light: material(0x79e7ff, 0.85, 0.25),
    glow: new THREE.MeshBasicMaterial({ color: 0x27d9ff, transparent: true, opacity: 0.82 }),
    green: new THREE.MeshBasicMaterial({ color: 0x65e5ad, transparent: true, opacity: 0.86 }),
  };

  const body = mesh(new THREE.CapsuleGeometry(0.54, 0.76, 6, 16), materials.blue);
  body.scale.set(0.9, 1, 0.5);
  body.position.y = 0.6;
  root.add(body);

  const logo = mesh(new THREE.TorusGeometry(0.23, 0.025, 8, 48, Math.PI * 1.55), materials.glow);
  logo.position.set(0, 0.73, 0.43);
  logo.rotation.z = -0.7;
  body.add(logo);

  const head = mesh(new THREE.SphereGeometry(0.44, 32, 18), materials.dark);
  head.scale.set(0.92, 1.04, 0.75);
  head.position.y = 1.42;
  root.add(head);

  const crest = mesh(new THREE.BoxGeometry(0.36, 0.08, 0.06), materials.light);
  crest.position.set(0, 0.26, 0.34);
  head.add(crest);

  const eyes = [];
  for (const x of [-0.16, 0.16]) {
    const eye = mesh(new THREE.SphereGeometry(0.072, 16, 8), materials.glow);
    eye.scale.set(1.65, 0.72, 0.28);
    eye.position.set(x, 0.03, 0.39);
    eye.userData.baseX = x;
    head.add(eye);
    eyes.push(eye);
  }

  const leftArm = limb(materials.blue, materials.dark);
  leftArm.shoulder.position.set(-0.58, 0.92, 0);
  root.add(leftArm.shoulder);

  const rightArm = limb(materials.blue, materials.dark);
  rightArm.shoulder.position.set(0.58, 0.92, 0);
  root.add(rightArm.shoulder);

  const leftLeg = leg(materials.blue, materials.dark);
  leftLeg.hip.position.set(-0.24, 0.02, 0);
  root.add(leftLeg.hip);

  const rightLeg = leg(materials.blue, materials.dark);
  rightLeg.hip.position.set(0.24, 0.02, 0);
  root.add(rightLeg.hip);

  return { root, body, head, eyes, leftArm, rightArm, leftLeg, rightLeg, materials };
}

function material(color, metalness, roughness) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness, emissive: color, emissiveIntensity: 0.08 });
}

function mesh(geometry, mat) {
  const item = new THREE.Mesh(geometry, mat);
  item.castShadow = true;
  item.receiveShadow = true;
  return item;
}

function limb(blue, dark) {
  const shoulder = new THREE.Group();
  const upper = mesh(new THREE.CapsuleGeometry(0.09, 0.44, 5, 12), blue);
  upper.position.y = -0.28;
  const forearm = mesh(new THREE.CapsuleGeometry(0.075, 0.38, 5, 12), dark);
  forearm.position.y = -0.72;
  const hand = mesh(new THREE.SphereGeometry(0.095, 14, 8), dark);
  hand.position.y = -0.98;
  shoulder.add(upper, forearm, hand);
  return { shoulder, upper, forearm, hand };
}

function leg(blue, dark) {
  const hip = new THREE.Group();
  const thigh = mesh(new THREE.CapsuleGeometry(0.105, 0.48, 5, 12), blue);
  thigh.position.y = -0.34;
  const shin = mesh(new THREE.CapsuleGeometry(0.092, 0.5, 5, 12), dark);
  shin.position.y = -0.86;
  const foot = mesh(new THREE.BoxGeometry(0.28, 0.11, 0.44), dark);
  foot.position.set(0, -1.18, 0.11);
  hip.add(thigh, shin, foot);
  return { hip, thigh, shin, foot };
}

function animateProceduralBeacon(rig, elapsed, pointer, reduced) {
  const intro = reduced ? 1 : THREE.MathUtils.clamp(elapsed / 3.1, 0, 1);
  const ease = 1 - Math.pow(1 - intro, 3);
  const walk = Math.sin(elapsed * 8.8);
  const walkActive = intro < 1;
  const idle = Math.sin(elapsed * 1.3);

  rig.root.position.x = THREE.MathUtils.lerp(4.3, 0.72, ease);
  rig.root.position.y = -1.32 + (walkActive ? Math.abs(walk) * 0.08 : idle * 0.035);
  rig.root.rotation.z = (walkActive ? Math.sin(elapsed * 8.8) * 0.08 : idle * 0.025) + pointer.x * 0.02;
  rig.root.rotation.y = pointer.x * 0.18;

  rig.head.rotation.y = pointer.x * 0.42;
  rig.head.rotation.x = -pointer.y * 0.18;

  const eyeColor = pointer.state === "ready" ? 0x65e5ad : 0x27d9ff;
  rig.eyes.forEach((eye) => {
    eye.material.color.setHex(eyeColor);
    eye.position.x = eye.userData.baseX + pointer.x * 0.026;
    eye.position.y = 0.03 - pointer.y * 0.018;
  });

  const swing = walkActive ? Math.sin(elapsed * 8.8) : Math.sin(elapsed * 1.1) * 0.18;
  rig.leftArm.shoulder.rotation.x = swing * 0.55 - 0.2;
  rig.rightArm.shoulder.rotation.x = -swing * 0.55 - 0.2;
  rig.leftArm.shoulder.rotation.z = 0.18;
  rig.rightArm.shoulder.rotation.z = -0.18;

  rig.leftLeg.hip.rotation.x = -swing * 0.5;
  rig.rightLeg.hip.rotation.x = swing * 0.5;
  rig.leftLeg.foot.rotation.x = walkActive ? Math.max(0, swing) * 0.35 : 0;
  rig.rightLeg.foot.rotation.x = walkActive ? Math.max(0, -swing) * 0.35 : 0;
}
