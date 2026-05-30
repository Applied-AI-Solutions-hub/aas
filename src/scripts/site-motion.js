const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.documentElement.classList.add("motion-ready");
if (reducedMotion) {
  document.documentElement.classList.add("reduce-motion");
}

if (document.querySelector("[data-cinema-scene]")) {
  import("./cinema-scene.js");
}

const progress = document.createElement("div");
progress.className = "scroll-progress";
progress.setAttribute("aria-hidden", "true");
document.body.append(progress);

const updateProgress = () => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const amount = max > 0 ? window.scrollY / max : 0;
  progress.style.setProperty("--progress", amount.toFixed(4));
};

updateProgress();
window.addEventListener("scroll", updateProgress, { passive: true });
window.addEventListener("resize", updateProgress);

document.querySelectorAll(".sound-switch").forEach((button) => {
  button.addEventListener("click", () => {
    const active = button.getAttribute("aria-pressed") === "true";
    button.setAttribute("aria-pressed", String(!active));
    const label = button.querySelector("strong");
    if (label) {
      label.textContent = active ? "Off" : "On";
    }
  });
});

if (!reducedMotion) {
  const revealTargets = [
    ".hero-copy",
    ".cinema-copy",
    ".system-panel",
    ".identity-panel",
    ".route-card",
    ".section-copy-block",
    ".tile-grid article",
    ".process-lanes article",
    ".brand-plate",
    ".name-stack a",
    ".proof-list article",
    ".case-card",
    ".media-frame",
    ".cta-band",
  ];

  const motionItems = document.querySelectorAll(revealTargets.join(","));
  motionItems.forEach((item, index) => {
    item.classList.add("motion-reveal");
    item.style.setProperty("--stagger", `${Math.min(index % 8, 7) * 54}ms`);
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
  );

  motionItems.forEach((item) => observer.observe(item));

  document.querySelectorAll(".hero").forEach((hero) => {
    hero.addEventListener(
      "pointermove",
      (event) => {
        const rect = hero.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        hero.style.setProperty("--mx", x.toFixed(3));
        hero.style.setProperty("--my", y.toFixed(3));
      },
      { passive: true },
    );
  });

  const stage = document.querySelector(".cinema-stage");
  const panels = document.querySelectorAll("[data-stage]");

  if (stage && panels.length) {
    stage.setAttribute("data-active-stage", panels[0].getAttribute("data-stage") || "system");

    const stageObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visible) return;

        const activeStage = visible.target.getAttribute("data-stage");
        if (activeStage) {
          stage.setAttribute("data-active-stage", activeStage);
        }
      },
      { rootMargin: "-35% 0px -35% 0px", threshold: [0.16, 0.32, 0.48, 0.64] },
    );

    panels.forEach((panel) => stageObserver.observe(panel));
  }
}
