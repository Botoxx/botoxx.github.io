/* botoxx.github.io — Telemetry Console runtime */
(function () {
  "use strict";

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");

  // ---------- Theme toggle ----------
  const root = document.documentElement;
  const setTheme = (t, animated) => {
    const apply = () => {
      root.dataset.theme = t;
      try { localStorage.setItem("theme", t); } catch (_) {}
    };
    if (animated && document.startViewTransition && !reduce.matches) {
      document.startViewTransition(apply);
    } else {
      apply();
    }
  };

  const toggleBtn = $("#theme-toggle");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const next = root.dataset.theme === "dark" ? "light" : "dark";
      setTheme(next, true);
    });
  }
  // React to OS changes only if user hasn't explicitly chosen
  matchMedia("(prefers-color-scheme: light)").addEventListener("change", (e) => {
    if (!localStorage.getItem("theme")) setTheme(e.matches ? "light" : "dark", false);
  });

  // ---------- Smooth scroll for in-page anchors ----------
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href").slice(1);
      if (!id) return;
      const el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      const navH = $(".main-nav")?.offsetHeight || 0;
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.scrollY - navH - 16,
        behavior: reduce.matches ? "auto" : "smooth",
      });
    });
  });

  // ---------- Active section in nav ----------
  const sections = $$(".section[id]");
  const navLinks = $$(".main-nav a[href*='#']");
  const linkFor = (id) => navLinks.find((l) => l.getAttribute("href").endsWith("#" + id));
  if (sections.length && navLinks.length && "IntersectionObserver" in window) {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const id = e.target.id;
          navLinks.forEach((l) => l.classList.remove("active"));
          linkFor(id)?.classList.add("active");
        });
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 }
    );
    sections.forEach((s) => obs.observe(s));
  }

  // ---------- Back to top ----------
  const back = $(".back-to-top");
  if (back) {
    back.addEventListener("click", (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduce.matches ? "auto" : "smooth" });
    });
    let ticking = false;
    window.addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          back.classList.toggle("show", window.scrollY > 400);
          ticking = false;
        });
      },
      { passive: true }
    );
  }

  // ---------- Terminal widget ----------
  // Re-types the `whoami` command and reveals the headline. Skips animation
  // entirely under reduced-motion. Cancels on tab hide.
  const term = $(".terminal");
  const screen = $("#term-screen");
  if (term && screen && !reduce.matches) {
    const cmdEl = screen.querySelector(".t-cmd");
    if (cmdEl) {
      const finalCmd = cmdEl.textContent;
      cmdEl.textContent = "";
      const caret = document.createElement("span");
      caret.className = "t-caret";
      cmdEl.after(caret);

      let i = 0;
      let cancelled = false;
      const tick = () => {
        if (cancelled) return;
        if (i >= finalCmd.length) {
          setTimeout(() => caret.remove(), 1200);
          return;
        }
        cmdEl.textContent += finalCmd[i++];
        setTimeout(() => requestAnimationFrame(tick), 55 + Math.random() * 35);
      };
      setTimeout(() => requestAnimationFrame(tick), 350);

      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          cancelled = true;
          cmdEl.textContent = finalCmd;
          caret.remove();
        }
      });
    }
  }
})();
