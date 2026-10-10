import services from "./service-data.json";
document.documentElement.classList.add("enhanced");
const menu = document.querySelector(".main-nav");
const menuButton = document.querySelector(".menu-toggle");
const mobile = window.matchMedia("(max-width: 640px)");
function setMenu(open, restoreFocus = false) {
  menu.classList.toggle("is-open", open);
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  if (restoreFocus) menuButton.focus();
}
menuButton.addEventListener("click", () =>
  setMenu(menuButton.getAttribute("aria-expanded") !== "true"),
);
menu.addEventListener("click", (event) => {
  if (event.target.closest("a")) setMenu(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menu.classList.contains("is-open"))
    setMenu(false, true);
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".site-header")) setMenu(false);
});
document.addEventListener("focusin", (event) => {
  if (!event.target.closest(".site-header")) setMenu(false);
});
mobile.addEventListener("change", () => setMenu(false));
const tabs = [...document.querySelectorAll("[data-service]")];
const panels = [...document.querySelectorAll("[data-service-panel]")];
document.querySelector(".service-tabs").setAttribute("role", "tablist");
tabs.forEach((tab) => {
  tab.setAttribute("role", "tab");
  tab.setAttribute("aria-controls", "panel-" + tab.dataset.service);
});
panels.forEach((panel) => {
  panel.setAttribute("role", "tabpanel");
  panel.setAttribute("aria-labelledby", "tab-" + panel.dataset.servicePanel);
  panel.tabIndex = 0;
});
function selectService(id, focus = false) {
  if (!services.some((service) => service.id === id)) return;
  tabs.forEach((tab) => {
    const selected = tab.dataset.service === id;
    tab.classList.toggle("is-active", selected);
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    if (selected && focus) tab.focus();
  });
  panels.forEach((panel) => {
    panel.hidden = panel.dataset.servicePanel !== id;
  });
  const service = services.find((item) => item.id === id);
  document.querySelector("#contact-email").href =
    "mailto:hello@404tech.dev?subject=" +
    encodeURIComponent("Project enquiry — " + service.label);
  document.dispatchEvent(new Event("servicechange"));
}
tabs.forEach((tab, index) => {
  tab.addEventListener("click", (event) => {
    event.preventDefault();
    selectService(tab.dataset.service);
  });
  tab.addEventListener("keydown", (event) => {
    let next;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    if (event.key === "ArrowLeft")
      next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = tabs.length - 1;
    if (event.key === " ") next = index;
    if (next !== undefined) {
      event.preventDefault();
      selectService(tabs[next].dataset.service, true);
    }
  });
});
function selectFromHash() {
  const id = location.hash.replace("#panel-", "");
  if (services.some((service) => service.id === id)) selectService(id);
}
selectService("products");
selectFromHash();
window.addEventListener("hashchange", selectFromHash);
const navLinks = [...menu.querySelectorAll("a")];
const navTargets = navLinks.map((link) =>
  document.querySelector(link.getAttribute("href")),
);
let scrollScheduled = false;
function updateNavigation() {
  const line = Math.min(window.innerHeight * 0.4, 300);
  let active = -1;
  navTargets.forEach((target, index) => {
    if (target.getBoundingClientRect().top <= line) active = index;
  });
  navLinks.forEach((link, index) => {
    if (index === active) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
  scrollScheduled = false;
}
window.addEventListener(
  "scroll",
  () => {
    if (!scrollScheduled) {
      scrollScheduled = true;
      requestAnimationFrame(updateNavigation);
    }
  },
  { passive: true },
);
updateNavigation();
const copy = document.querySelector(".copy-email");
const copyStatus = document.querySelector(".copy-status");
copy.hidden = false;
let messageTimeout;
copy.addEventListener("click", async () => {
  clearTimeout(messageTimeout);
  try {
    if (!navigator.clipboard?.writeText)
      throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText("hello@404tech.dev");
    copyStatus.textContent = "Email address copied.";
  } catch {
    copyStatus.textContent =
      "Couldn’t copy. Select hello@404tech.dev to copy it manually.";
  }
  messageTimeout = setTimeout(() => {
    copyStatus.textContent = "";
  }, 7000);
});
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let shaderModuleRequested = false;
function prepareShaders() {
  if (
    reducedMotion.matches ||
    navigator.connection?.saveData ||
    !navigator.gpu
  ) {
    document.querySelectorAll("[data-shader]").forEach((surface) => {
      surface.dataset.state = "fallback";
    });
    return;
  }
  if (shaderModuleRequested) return;
  shaderModuleRequested = true;
  import("./shader-runtime.js")
    .then((module) => module.startShaders())
    .catch(() => {
      document.querySelectorAll("[data-shader]").forEach((surface) => {
        surface.dataset.state = "fallback";
      });
    });
}
function scheduleShaders() {
  if ("requestIdleCallback" in window)
    window.requestIdleCallback(prepareShaders, { timeout: 2200 });
  else setTimeout(prepareShaders, 300);
}
if (document.readyState === "complete") scheduleShaders();
else window.addEventListener("load", scheduleShaders, { once: true });
reducedMotion.addEventListener("change", () => {
  if (!reducedMotion.matches) scheduleShaders();
});
