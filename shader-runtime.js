import { createShader, getWebGPUSupport, createSharedDevice } from "shaders/js";

const terminalErrors = new Set([
  "unsupported",
  "no-adapter",
  "no-device",
  "init-failed",
  "device-lost",
  "out-of-memory",
  "gpu-error",
  "render-failed",
  "limit-exceeded",
  "unrecoverable",
  "rebuild_failed",
]);

export function createComposition(name, pointerEnabled) {
  if (name === "hero")
    return {
      components: [
        {
          id: "hero-mesh",
          type: "MeshGradient",
          props: {
            stops: [
              { color: "#090b10", position: 0 },
              { color: "#101a31", position: 0.42 },
              { color: "#223e73", position: 0.7 },
              { color: "#0b101c", position: 1 },
            ],
            speed: 0.18,
            count: 4,
            drift: 0.25,
            seed: 4,
          },
        },
        {
          id: "hero-metal",
          type: "LiquidMetal",
          props: {
            shape: {
              type: "torus3D",
              radius: 0.27,
              tube: 0.115,
              rotX: 33,
              rotY: -22,
              rotZ: -28,
            },
            lightColor: "#e5eeff",
            darkColor: "#10182b",
            turbulence: 0.28,
            ripple: 2,
            warp: 0.35,
            speed: 0.18,
            dispersion: 0.08,
            sharpness: 0.55,
            environment: 1.5,
            scale: 1.04,
          },
        },
      ],
    };
  if (name === "creative") {
    const gradient = {
      id: "creative-flow",
      type: "FlowingGradient",
      props: {
        colorA: "#111b37",
        colorB: "#466dd2",
        colorC: "#726489",
        colorD: "#cd9180",
        speed: 0.25,
      },
    };
    return {
      components: pointerEnabled
        ? [
            {
              id: "creative-ripples",
              type: "CursorRipples",
              props: {
                intensity: 2.5,
                decay: 13,
                radius: 0.35,
                chromaticSplit: 0.15,
              },
              children: [gradient],
            },
          ]
        : [gradient],
    };
  }
  return {
    components: [
      {
        id: "contact-mesh",
        type: "MeshGradient",
        props: {
          stops: [
            { color: "#090d16", position: 0 },
            { color: "#132447", position: 0.5 },
            { color: "#203b6c", position: 0.8 },
            { color: "#0c1323", position: 1 },
          ],
          speed: 0.12,
          count: 3,
          drift: 0.2,
          seed: 8,
        },
      },
    ],
  };
}

export async function startShaders() {
  const surfaces = [...document.querySelectorAll("[data-shader]")];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const compact = matchMedia("(max-width: 767px)");
  const pointer = matchMedia("(hover: hover) and (pointer: fine)");
  const records = surfaces.map((surface) => ({
    surface,
    instance: null,
    pending: false,
    failed: false,
  }));
  const button = document.querySelector("[data-motion-toggle]");
  let userPaused = false;
  let disposed = false;
  let gpu;
  let reconcileQueued = false;
  let generation = 0;
  try {
    const support = await getWebGPUSupport();
    if (!support.supported) throw new Error("WebGPU unavailable");
    gpu = await createSharedDevice();
    if (!gpu) throw new Error("GPU device unavailable");
  } catch {
    surfaces.forEach((surface) => {
      surface.dataset.state = "fallback";
    });
    return;
  }
  const mayAnimate = () =>
    !disposed && !document.hidden && !reduced.matches && !userPaused;
  function visibleArea(surface) {
    if (surface.closest("[hidden]")) return 0;
    const rect = surface.getBoundingClientRect();
    if (!rect.width || !rect.height) return 0;
    return (
      Math.max(0, Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0)) *
      Math.max(0, Math.min(rect.right, innerWidth) - Math.max(rect.left, 0))
    );
  }
  function showFallback(record) {
    record.failed = true;
    record.surface.dataset.state = "fallback";
    record.surface.dataset.animating = "false";
    record.instance?.pause();
  }
  function updateButton() {
    button.hidden =
      reduced.matches ||
      records.every((record) => record.failed) ||
      !records.some((record) => record.instance);
    button.setAttribute("aria-pressed", String(userPaused));
    button.setAttribute(
      "aria-label",
      userPaused ? "Resume animated visuals" : "Pause animated visuals",
    );
  }
  function reconcile() {
    reconcileQueued = false;
    if (disposed) return;
    const selected = mayAnimate()
      ? records
          .filter((record) => !record.failed && visibleArea(record.surface) > 0)
          .sort((a, b) => visibleArea(b.surface) - visibleArea(a.surface))
          .slice(0, compact.matches ? 1 : 2)
      : [];
    for (const record of records) {
      const active = selected.includes(record);
      record.surface.dataset.animating = String(active && !!record.instance);
      if (record.instance) {
        if (active) record.instance.resume();
        else record.instance.pause();
      } else if (active && !record.pending) mount(record);
    }
    updateButton();
  }
  function schedule() {
    if (reconcileQueued || disposed) return;
    reconcileQueued = true;
    requestAnimationFrame(reconcile);
  }
  async function mount(record) {
    record.pending = true;
    const mountGeneration = generation;
    record.surface.dataset.state = "loading";
    const canvas = record.surface.querySelector("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    try {
      const instance = await createShader(
        canvas,
        createComposition(record.surface.dataset.shader, pointer.matches),
        {
          gpu,
          disableTelemetry: true,
          colorSpace: "srgb",
          observeElement: false,
          onReady: () => {
            if (
              mountGeneration === generation &&
              !record.failed &&
              !reduced.matches
            )
              record.surface.dataset.state = "ready";
            schedule();
          },
          onError: (reason) => {
            if (mountGeneration !== generation) return;
            if (terminalErrors.has(reason)) showFallback(record);
            schedule();
          },
        },
      );
      if (disposed || mountGeneration !== generation) {
        instance.destroy();
        return;
      }
      record.instance = instance;
      if (instance.getFailureReason()) showFallback(record);
      resize(record);
      instance.pause();
    } catch {
      if (mountGeneration === generation) showFallback(record);
    } finally {
      record.pending = false;
      schedule();
    }
  }
  function resize(record) {
    if (!record.instance || !visibleArea(record.surface)) return;
    const rect = record.surface.getBoundingClientRect();
    record.instance.resize(Math.round(rect.width), Math.round(rect.height));
  }
  const intersection = new IntersectionObserver(schedule, {
    threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
  });
  const resizeObserver = new ResizeObserver((entries) => {
    entries.forEach((entry) => {
      const record = records.find((item) => item.surface === entry.target);
      resize(record);
    });
    schedule();
  });
  records.forEach((record) => {
    intersection.observe(record.surface);
    resizeObserver.observe(record.surface);
  });
  button.addEventListener("click", () => {
    userPaused = !userPaused;
    reconcile();
  });
  document.addEventListener("visibilitychange", reconcile);
  document.addEventListener("servicechange", () => {
    records.forEach(resize);
    reconcile();
  });
  window.addEventListener("scroll", schedule, { passive: true });
  compact.addEventListener("change", reconcile);
  function reset() {
    generation++;
    records.forEach((record) => {
      record.instance?.destroy();
      record.instance = null;
      record.failed = false;
      record.surface.dataset.state = "fallback";
      record.surface.dataset.animating = "false";
    });
    reconcile();
  }
  reduced.addEventListener("change", reset);
  pointer.addEventListener("change", reset);
  window.addEventListener("pagehide", (event) => {
    if (event.persisted) {
      records.forEach((record) => record.instance?.pause());
      return;
    }
    disposed = true;
    generation++;
    intersection.disconnect();
    resizeObserver.disconnect();
    records.forEach((record) => record.instance?.destroy());
    gpu?.device.destroy();
  });
  window.addEventListener("pageshow", schedule);
  reconcile();
}
