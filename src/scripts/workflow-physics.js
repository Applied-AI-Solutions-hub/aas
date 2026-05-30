import * as THREE from "three";

const ITEMS = [
  { label: "Intake", color: 0x24e6ff, target: [-1.85, 0.82, 0.2] },
  { label: "Docs", color: 0xff2e9f, target: [-0.92, -1.1, -0.1] },
  { label: "Memory", color: 0x8a5cff, target: [0.72, 1.08, 0.1] },
  { label: "Approval", color: 0xff625f, target: [1.82, -0.62, 0.0] },
  { label: "Report", color: 0xbff3ff, target: [0.12, -1.78, 0.15] },
];

function textTexture(label, color) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(5, 3, 14, 0.82)";
  ctx.strokeStyle = `#${color.toString(16).padStart(6, "0")}`;
  ctx.lineWidth = 3;
  roundRect(ctx, 16, 28, 480, 112, 22);
  ctx.fill();
  ctx.globalAlpha = 0.5;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#f5fbff";
  ctx.font = "700 42px Segoe UI, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, canvas.width / 2, 84);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

export function mountWorkflowPhysics(selector) {
  const host = document.querySelector(selector);
  if (!(host instanceof HTMLElement)) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (window.matchMedia("(max-width: 640px)").matches) return;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(0, 0, 7.6);

  const ambient = new THREE.AmbientLight(0xffffff, 1.3);
  const key = new THREE.PointLight(0x24e6ff, 18, 9);
  key.position.set(-2.6, 2.4, 3.6);
  const fill = new THREE.PointLight(0xff2e9f, 9, 8);
  fill.position.set(2.6, -1.8, 2.8);
  scene.add(ambient, key, fill);

  const group = new THREE.Group();
  scene.add(group);

  const loader = new THREE.TextureLoader();
  const markTexture = loader.load("/assets/retrowave/aas-retrowave-mark.png");
  markTexture.colorSpace = THREE.SRGBColorSpace;
  const mark = new THREE.Mesh(
    new THREE.PlaneGeometry(1.38, 1.38),
    new THREE.MeshBasicMaterial({ map: markTexture, transparent: true, opacity: 0.94 })
  );
  mark.position.z = 0.24;
  group.add(mark);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.18, 0.012, 16, 96),
    new THREE.MeshBasicMaterial({ color: 0x24e6ff, transparent: true, opacity: 0.34 })
  );
  group.add(ring);

  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x8eeeff, transparent: true, opacity: 0.22 });
  const nodes = ITEMS.map((item, index) => {
    const texture = textTexture(item.label, item.color);
    const card = new THREE.Mesh(
      new THREE.PlaneGeometry(1.08, 0.4),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.96 })
    );
    const angle = index * 1.26 + 0.4;
    card.position.set(Math.cos(angle) * 2.7, Math.sin(angle) * 1.6, (index % 2) * 0.22);
    card.userData.velocity = new THREE.Vector3((Math.random() - 0.5) * 0.012, (Math.random() - 0.5) * 0.012, 0);
    card.userData.target = new THREE.Vector3(...item.target);
    card.userData.phase = angle;
    card.userData.homeScale = 1;
    group.add(card);

    const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), card.position.clone()]);
    const line = new THREE.Line(geometry, lineMaterial.clone());
    group.add(line);

    return { card, line };
  });

  const pointer = new THREE.Vector2(9, 9);
  const bounds = host.getBoundingClientRect();
  const setPointer = (event) => {
    const rect = host.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 5.2;
    pointer.y = -((event.clientY - rect.top) / rect.height - 0.5) * 3.7;
  };
  const clearPointer = () => pointer.set(9, 9);
  host.addEventListener("pointermove", setPointer);
  host.addEventListener("pointerleave", clearPointer);

  function resize() {
    const rect = host.getBoundingClientRect();
    const width = Math.max(320, Math.floor(rect.width));
    const height = Math.max(320, Math.floor(rect.height));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  let frame = 0;
  let raf = 0;
  function tick() {
    frame += 0.016;
    group.rotation.y = Math.sin(frame * 0.22) * 0.12;
    group.rotation.x = Math.sin(frame * 0.18) * 0.04;
    mark.rotation.z = Math.sin(frame * 0.5) * 0.035;
    ring.rotation.z += 0.003;

    for (const { card, line } of nodes) {
      const velocity = card.userData.velocity;
      const target = card.userData.target;
      const spring = target.clone().sub(card.position).multiplyScalar(0.018);
      velocity.add(spring);

      const pointerVector = new THREE.Vector3(pointer.x, pointer.y, card.position.z);
      const away = card.position.clone().sub(pointerVector);
      const pointerDistance = Math.max(away.length(), 0.001);
      if (pointerDistance < 1.35) {
        velocity.add(away.normalize().multiplyScalar((1.35 - pointerDistance) * 0.028));
      }

      const centerDistance = Math.max(card.position.length(), 0.001);
      if (centerDistance < 1.12) {
        velocity.add(card.position.clone().normalize().multiplyScalar((1.12 - centerDistance) * 0.036));
      }

      velocity.multiplyScalar(0.925);
      card.position.add(velocity);
      card.rotation.z = velocity.x * -1.8;
      card.position.z = Math.sin(frame + card.userData.phase) * 0.14;

      const points = [new THREE.Vector3(0, 0, 0.05), card.position.clone()];
      line.geometry.setFromPoints(points);
      line.material.opacity = 0.16 + Math.min(velocity.length() * 7, 0.16);
    }

    renderer.render(scene, camera);
    raf = window.requestAnimationFrame(tick);
  }

  resize();
  tick();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);

  host.addEventListener("workflow-stage:destroy", () => {
    window.cancelAnimationFrame(raf);
    resizeObserver.disconnect();
    host.removeEventListener("pointermove", setPointer);
    host.removeEventListener("pointerleave", clearPointer);
    renderer.dispose();
  }, { once: true });

  if (bounds.width < 420) {
    group.scale.setScalar(0.86);
  }
}
