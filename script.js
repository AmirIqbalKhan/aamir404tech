/* AMIR — scrapbook portfolio: staggered reveals + dismissible sticky note */
(() => {
  "use strict";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ——— staggered float-up reveals ——— */
  const revealEls = document.querySelectorAll(".rv");
  if (reduced || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("in"));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  }

  /* ——— dismissible "currently learning" sticky note ——— */
  const note = document.querySelector(".learn");
  const close = document.querySelector(".learn-x");
  if (note && close) {
    close.addEventListener("click", () => {
      note.style.transition = "opacity .35s ease, transform .35s ease";
      note.style.opacity = "0";
      note.style.transform = "translateY(-8px) rotate(4deg)";
      window.setTimeout(() => note.remove(), 380);
    });
  }

  /* ——— nav: scrolled state, scroll-spy, mobile menu ——— */
  const bar = document.querySelector(".bar");
  const burger = document.querySelector(".burger");
  const navLinks = Array.from(document.querySelectorAll(".bar-nav a"));
  const spyTargets = navLinks
    .map((a) => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);

  if (bar && burger) {
    burger.addEventListener("click", () => {
      const open = bar.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    navLinks.forEach((a) =>
      a.addEventListener("click", () => {
        bar.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
      })
    );
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") bar.classList.remove("is-open");
    });
    document.addEventListener("click", (e) => {
      if (bar.classList.contains("is-open") && !bar.contains(e.target)) {
        bar.classList.remove("is-open");
      }
    });
  }

  const spy = () => {
    if (bar) bar.classList.toggle("is-scrolled", window.scrollY > 8);
    let current = spyTargets[0];
    const line = window.innerHeight * 0.35;
    spyTargets.forEach((t) => {
      if (t.getBoundingClientRect().top <= line) current = t;
    });
    navLinks.forEach((a) => {
      const on = current && a.getAttribute("href") === "#" + current.id;
      a.classList.toggle("is-active", on);
      if (on) a.setAttribute("aria-current", "location");
      else a.removeAttribute("aria-current");
    });
  };
  let ticking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          spy();
          ticking = false;
        });
        ticking = true;
      }
    },
    { passive: true }
  );
  spy();
})();
