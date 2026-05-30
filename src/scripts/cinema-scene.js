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

const soundButtons = document.querySelectorAll(".sound-switch");
let audioContext;
let gainNode;
let musicBus;
let audioTimer;
let nextBeatTime = 0;
let beatIndex = 0;
const activeSources = new Set();

const tempo = 88;
const beatLength = 60 / tempo;
const lookahead = 0.18;
const chordProgression = [
  [43, 47, 50, 55, 59],
  [48, 52, 55, 60, 64],
  [50, 54, 57, 62, 66],
  [43, 47, 50, 55, 62],
];
const rollPattern = [0, 2, 4, 7, 9, 7, 4, 2, 0, 4, 7, 11, 9, 7, 4, 2];

const midiToFrequency = (note) => 440 * 2 ** ((note - 69) / 12);

const trackSource = (source) => {
  activeSources.add(source);
  source.addEventListener("ended", () => activeSources.delete(source), { once: true });
};

const envelopeGain = (time, peak, attack, decay, sustain, release, duration) => {
  const node = audioContext.createGain();
  node.gain.setValueAtTime(0.0001, time);
  node.gain.exponentialRampToValueAtTime(peak, time + attack);
  node.gain.exponentialRampToValueAtTime(Math.max(sustain, 0.0001), time + attack + decay);
  node.gain.setValueAtTime(Math.max(sustain, 0.0001), time + Math.max(duration - release, attack + decay));
  node.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  return node;
};

const playTone = ({ note, time, duration, type = "sine", volume = 0.08, detune = 0, destination = musicBus || gainNode }) => {
  const oscillator = audioContext.createOscillator();
  const amp = envelopeGain(time, volume, 0.018, 0.12, volume * 0.42, 0.22, duration);
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(midiToFrequency(note), time);
  oscillator.detune.setValueAtTime(detune, time);
  oscillator.connect(amp);
  amp.connect(destination);
  oscillator.start(time);
  oscillator.stop(time + duration + 0.04);
  trackSource(oscillator);
};

const playPluck = ({ note, time, duration = 0.18, volume = 0.04, pan = 0, detune = 0 }) => {
  const oscillator = audioContext.createOscillator();
  const bright = audioContext.createBiquadFilter();
  const panner = audioContext.createStereoPanner();
  const amp = envelopeGain(time, volume, 0.006, 0.075, volume * 0.08, duration * 0.84, duration);
  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(midiToFrequency(note), time);
  oscillator.detune.setValueAtTime(detune, time);
  bright.type = "bandpass";
  bright.frequency.setValueAtTime(1800, time);
  bright.Q.value = 1.15;
  panner.pan.setValueAtTime(pan, time);
  oscillator.connect(bright);
  bright.connect(amp);
  amp.connect(panner);
  panner.connect(musicBus || gainNode);
  oscillator.start(time);
  oscillator.stop(time + duration + 0.04);
  trackSource(oscillator);
};

const playNoise = ({ time, duration, volume, band = 4200, destination = musicBus || gainNode }) => {
  const length = Math.max(1, Math.floor(audioContext.sampleRate * duration));
  const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) {
    data[index] = Math.random() * 2 - 1;
  }

  const source = audioContext.createBufferSource();
  const filter = audioContext.createBiquadFilter();
  const amp = envelopeGain(time, volume, 0.004, 0.03, volume * 0.18, 0.06, duration);
  source.buffer = buffer;
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(band, time);
  filter.Q.value = 0.72;
  source.connect(filter);
  filter.connect(amp);
  amp.connect(destination);
  source.start(time);
  source.stop(time + duration + 0.02);
  trackSource(source);
};

const scheduleBeat = (time, index) => {
  const chord = chordProgression[Math.floor(index / 8) % chordProgression.length];
  const step = index % 8;
  const sixteenth = beatLength / 2;

  if (step === 0 || step === 4) {
    chord.slice(1, 4).forEach((note, chordIndex) => {
      playTone({
        note: note + 12,
        time: time + chordIndex * 0.018,
        duration: beatLength * 1.38,
        type: chordIndex % 2 ? "triangle" : "sine",
        volume: 0.014,
        detune: chordIndex % 2 ? -4 : 4,
      });
    });
  }

  if (step === 0 || step === 3 || step === 5 || step === 7) {
    playTone({
      note: step === 5 ? chord[0] - 7 : chord[0] - 12,
      time,
      duration: beatLength * 0.56,
      type: "sine",
      volume: 0.052,
    });
  }

  for (let pick = 0; pick < 2; pick += 1) {
    const rollIndex = (index * 2 + pick) % rollPattern.length;
    playPluck({
      note: chord[1] + 12 + rollPattern[rollIndex],
      time: time + pick * sixteenth,
      duration: 0.16,
      volume: pick === 0 ? 0.03 : 0.024,
      pan: pick === 0 ? -0.18 : 0.18,
      detune: pick === 0 ? -3 : 3,
    });
  }

  if (step === 2 || step === 6) {
    playPluck({
      note: chord[2] + 19,
      time: time + beatLength * 0.18,
      duration: 0.22,
      volume: 0.022,
      pan: 0.28,
      detune: -5,
    });
    playNoise({ time, duration: 0.12, volume: 0.012, band: 1800 });
  }

  playNoise({
    time: time + beatLength * 0.48,
    duration: 0.05,
    volume: step % 2 === 0 ? 0.007 : 0.005,
    band: 5400,
  });
};

const scheduleLoop = () => {
  while (nextBeatTime < audioContext.currentTime + lookahead) {
    scheduleBeat(nextBeatTime, beatIndex);
    nextBeatTime += beatLength;
    beatIndex = (beatIndex + 1) % 32;
  }
};

const stopAudio = () => {
  if (!gainNode) return;
  window.clearInterval(audioTimer);
  audioTimer = undefined;
  const now = audioContext.currentTime;
  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setValueAtTime(gainNode.gain.value, now);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
  window.setTimeout(() => {
    activeSources.forEach((source) => {
      try {
        source.stop();
      } catch {
        // Some short one-shot sources may have already ended.
      }
    });
    activeSources.clear();
    audioContext.close();
    audioContext = undefined;
    gainNode = undefined;
    musicBus = undefined;
  }, 520);
};

const startAudio = () => {
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) return;
  audioContext = new Context();
  gainNode = audioContext.createGain();
  gainNode.gain.value = 0.0001;

  const filter = audioContext.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 2350;
  filter.Q.value = 0.78;
  filter.connect(gainNode);
  musicBus = filter;

  const compressor = audioContext.createDynamicsCompressor();
  compressor.threshold.value = -28;
  compressor.knee.value = 26;
  compressor.ratio.value = 5;
  compressor.attack.value = 0.02;
  compressor.release.value = 0.24;

  gainNode.connect(compressor);
  compressor.connect(audioContext.destination);

  const now = audioContext.currentTime;
  nextBeatTime = now + 0.05;
  beatIndex = 0;
  scheduleLoop();
  audioTimer = window.setInterval(scheduleLoop, 80);
  gainNode.gain.exponentialRampToValueAtTime(0.26, now + 0.8);
};

soundButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const active = button.getAttribute("aria-pressed") === "true";
    if (active && !audioContext) {
      startAudio();
    } else if (!active && audioContext) {
      stopAudio();
    }
  });
});
