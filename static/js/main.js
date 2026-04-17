/* botoxx.github.io — Telemetry Console runtime */
(function () {
  "use strict";

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const safeStorage = {
    get: (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} },
  };

  // ---------- Theme toggle ----------
  // Smooth scroll + scroll-padding-top is handled in CSS (style.css :root),
  // so this file is only state + interactions, not navigation.
  const root = document.documentElement;
  const toggleBtn = $("#theme-toggle");

  const setTheme = (t, animated) => {
    const apply = () => {
      root.dataset.theme = t;
      safeStorage.set("theme", t);
      if (toggleBtn) toggleBtn.setAttribute("aria-pressed", String(t === "dark"));
    };
    if (animated && document.startViewTransition && !reduce.matches) {
      document.startViewTransition(apply);
    } else {
      apply();
    }
  };

  // Initialize aria-pressed from the pre-paint script's resolved theme.
  if (toggleBtn) {
    toggleBtn.setAttribute("aria-pressed", String(root.dataset.theme === "dark"));
    toggleBtn.addEventListener("click", () => {
      setTheme(root.dataset.theme === "dark" ? "light" : "dark", true);
    });
  }
  // React to OS changes only if user hasn't explicitly chosen via the toggle.
  matchMedia("(prefers-color-scheme: light)").addEventListener("change", (e) => {
    if (!safeStorage.get("theme")) setTheme(e.matches ? "light" : "dark", false);
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
          navLinks.forEach((l) => l.classList.remove("active"));
          linkFor(e.target.id)?.classList.add("active");
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
  // Replays the `whoami` keystrokes and shows a blinking caret. The terminal
  // markup ships with the final command pre-rendered for SR/no-JS users; this
  // only animates the visual layer. Skipped entirely under reduced-motion.
  const screen = $("#term-screen");
  const cmdEl  = screen?.querySelector(".t-cmd");
  if (cmdEl && !reduce.matches) {
    const finalCmd = cmdEl.textContent;
    cmdEl.textContent = "";
    const caret = document.createElement("span");
    caret.className = "t-caret";
    cmdEl.after(caret);

    const ac = new AbortController();
    let i = 0;
    const tick = () => {
      if (ac.signal.aborted) return;
      if (i >= finalCmd.length) {
        // Remove caret a beat after typing finishes, then unbind.
        setTimeout(() => { caret.remove(); ac.abort(); }, 1200);
        return;
      }
      cmdEl.textContent += finalCmd[i++];
      setTimeout(() => requestAnimationFrame(tick), 55 + Math.random() * 35);
    };
    setTimeout(() => requestAnimationFrame(tick), 350);

    // Tab-hide → finalize immediately so users returning don't see a half-typed
    // command, and so we drop the listener (AbortController, not a leak).
    document.addEventListener(
      "visibilitychange",
      () => {
        if (!document.hidden) return;
        ac.abort();
        cmdEl.textContent = finalCmd;
        caret.remove();
      },
      { signal: ac.signal }
    );
  }
})();
