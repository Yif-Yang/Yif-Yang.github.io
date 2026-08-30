(() => {
  "use strict";

  const root = document.documentElement;
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
  const mobileQuery = window.matchMedia("(max-width: 820px)");
  let reduceMotion = motionQuery.matches;

  const pointer = {
    x: window.innerWidth / 2,
    y: window.innerHeight * 0.18,
    active: false,
  };

  const clamp = (value, minimum = 0, maximum = 1) =>
    Math.min(maximum, Math.max(minimum, value));

  const addMediaListener = (query, listener) => {
    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", listener);
    } else if (typeof query.addListener === "function") {
      query.addListener(listener);
    }
  };

  /* Theme --------------------------------------------------------------- */

  const themeToggle = document.querySelector(".theme-toggle");
  const themeColor = document.querySelector('meta[name="theme-color"]');
  let refreshFieldTheme = () => {};

  const applyTheme = (requestedTheme, persist = false) => {
    const theme = requestedTheme === "light" ? "light" : "dark";
    root.dataset.theme = theme;

    if (themeToggle) {
      const nextTheme = theme === "dark" ? "light" : "dark";
      themeToggle.setAttribute("aria-label", `Switch to ${nextTheme} theme`);
      themeToggle.setAttribute("aria-pressed", String(theme === "light"));
    }

    if (themeColor) {
      themeColor.setAttribute("content", theme === "dark" ? "#070b14" : "#f3f5f8");
    }

    if (persist) {
      try {
        localStorage.setItem("yifan-theme", theme);
      } catch (_) {
        // The visual switch still works when storage is unavailable.
      }
    }

    refreshFieldTheme(theme);
  };

  applyTheme(root.dataset.theme);

  themeToggle?.addEventListener("click", () => {
    applyTheme(root.dataset.theme === "light" ? "dark" : "light", true);
  });

  /* Mobile navigation --------------------------------------------------- */

  const navToggle = document.querySelector(".nav-toggle");
  const navLinks = document.querySelector(".nav-links");
  const navToggleLabel = navToggle?.querySelector(".sr-only");

  const setMenuOpen = (open, returnFocus = false) => {
    if (!navToggle || !navLinks) return;

    const isOpen = mobileQuery.matches && open;
    const isClosedMobileMenu = mobileQuery.matches && !isOpen;

    navToggle.setAttribute("aria-expanded", String(isOpen));
    navLinks.classList.toggle("is-open", isOpen);

    // Move focus before hiding a link that currently owns it. This avoids
    // leaving focus inside an inert/aria-hidden subtree after Escape or after
    // activating one of the mobile navigation links.
    if (
      isClosedMobileMenu &&
      (returnFocus || navLinks.contains(document.activeElement))
    ) {
      navToggle.focus({ preventScroll: true });
    }

    navLinks.toggleAttribute("inert", isClosedMobileMenu);
    navLinks.inert = isClosedMobileMenu;

    if (isClosedMobileMenu) navLinks.setAttribute("aria-hidden", "true");
    else navLinks.removeAttribute("aria-hidden");

    if (navToggleLabel) {
      navToggleLabel.textContent = isOpen ? "Close menu" : "Open menu";
    }
  };

  // Keep the visually hidden mobile navigation out of the accessibility and
  // keyboard-focus trees from the first frame. On desktop it remains a normal
  // navigation list, regardless of its previous mobile state.
  setMenuOpen(false);

  navToggle?.addEventListener("click", () => {
    setMenuOpen(navToggle.getAttribute("aria-expanded") !== "true");
  });

  navLinks?.addEventListener("click", (event) => {
    if (event.target.closest("a")) setMenuOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && navToggle?.getAttribute("aria-expanded") === "true") {
      setMenuOpen(false, true);
    }
  });

  document.addEventListener("pointerdown", (event) => {
    if (
      mobileQuery.matches &&
      navToggle?.getAttribute("aria-expanded") === "true" &&
      !navToggle.contains(event.target) &&
      !navLinks.contains(event.target)
    ) {
      setMenuOpen(false);
    }
  });

  addMediaListener(mobileQuery, () => setMenuOpen(false));

  /* Viewport state: progress, header, and active section ---------------- */

  const header = document.querySelector("[data-header]");
  const progressBar = document.querySelector(".page-progress span");
  const sectionLinks = Array.from(document.querySelectorAll('.nav-links a[href^="#"]'))
    .map((link) => {
      const id = link.getAttribute("href").slice(1);
      return { link, id, section: document.getElementById(id) };
    })
    .filter((item) => item.section);
  let scrollFrame = 0;

  const updateViewportState = () => {
    scrollFrame = 0;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollRange = Math.max(
      1,
      document.documentElement.scrollHeight - window.innerHeight,
    );

    if (progressBar) {
      progressBar.style.transform = `scaleX(${clamp(scrollTop / scrollRange)})`;
    }
    header?.classList.toggle("is-scrolled", scrollTop > 12);

    const marker = scrollTop + Math.min(window.innerHeight * 0.3, 210);
    let activeId = "";
    sectionLinks.forEach(({ id, section }) => {
      const sectionTop = section.getBoundingClientRect().top + scrollTop;
      if (marker >= sectionTop) activeId = id;
    });

    if (scrollTop + window.innerHeight >= document.documentElement.scrollHeight - 3) {
      activeId = sectionLinks.at(-1)?.id || activeId;
    }

    sectionLinks.forEach(({ id, link }) => {
      const active = id === activeId;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  };

  const scheduleViewportUpdate = () => {
    if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateViewportState);
  };

  window.addEventListener("scroll", scheduleViewportUpdate, { passive: true });
  window.addEventListener("resize", scheduleViewportUpdate, { passive: true });
  updateViewportState();

  /* Pointer glow -------------------------------------------------------- */

  let pointerFrame = 0;
  window.addEventListener(
    "pointermove",
    (event) => {
      if (reduceMotion || !finePointerQuery.matches) return;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;

      if (!pointerFrame) {
        pointerFrame = window.requestAnimationFrame(() => {
          root.style.setProperty("--pointer-x", `${pointer.x}px`);
          root.style.setProperty("--pointer-y", `${pointer.y}px`);
          pointerFrame = 0;
        });
      }
    },
    { passive: true },
  );

  window.addEventListener("pointerout", (event) => {
    if (!event.relatedTarget) pointer.active = false;
  });

  /* Scroll reveals ------------------------------------------------------ */

  const revealItems = Array.from(document.querySelectorAll(".reveal"));
  let revealObserver = null;

  const revealEverything = () => {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  };

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEverything();
  } else {
    revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -7% 0px", threshold: 0.08 },
    );
    revealItems.forEach((item) => revealObserver.observe(item));
  }

  /* Metric counters ----------------------------------------------------- */

  const counters = Array.from(document.querySelectorAll("[data-count]"));
  const completedCounters = new WeakSet();

  const formatCounter = (counter, value) => {
    const suffix = counter.dataset.suffix || "";
    if (counter.dataset.compact === "true" && value >= 1000) {
      const compactValue = (value / 1000).toFixed(1).replace(/\.0$/, "");
      return `${compactValue}K${suffix}`;
    }
    return `${Math.round(value).toLocaleString("en-US")}${suffix}`;
  };

  const finishCounter = (counter) => {
    const target = Number(counter.dataset.count) || 0;
    counter.textContent = formatCounter(counter, target);
    completedCounters.add(counter);
  };

  const animateCounter = (counter, index) => {
    if (completedCounters.has(counter)) return;
    if (reduceMotion) {
      finishCounter(counter);
      return;
    }

    const target = Number(counter.dataset.count) || 0;
    const duration = 1250;
    const delay = index * 75;
    let start = 0;

    const step = (time) => {
      if (reduceMotion) {
        finishCounter(counter);
        return;
      }
      if (!start) start = time + delay;
      if (time < start) {
        window.requestAnimationFrame(step);
        return;
      }

      const progress = clamp((time - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      counter.textContent = formatCounter(counter, target * eased);

      if (progress < 1) window.requestAnimationFrame(step);
      else finishCounter(counter);
    };

    window.requestAnimationFrame(step);
  };

  const startCounters = () => counters.forEach(animateCounter);
  const counterTrigger = document.querySelector(".impact-strip");

  if (reduceMotion || !("IntersectionObserver" in window) || !counterTrigger) {
    counters.forEach(finishCounter);
  } else {
    const counterObserver = new IntersectionObserver(
      (entries, observer) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        startCounters();
        observer.disconnect();
      },
      { threshold: 0.3 },
    );
    counterObserver.observe(counterTrigger);
  }

  /* Project filtering and research-map jumps --------------------------- */

  const filterButtons = Array.from(document.querySelectorAll("[data-filter]"));
  const projectGrid = document.querySelector("[data-project-grid]");
  const projectCards = Array.from(document.querySelectorAll(".project-card[data-topics]"));
  const resultCount = document.querySelector("[data-result-count]");
  const emptyState = document.querySelector("[data-empty-state]");
  const availableFilters = new Set(filterButtons.map((button) => button.dataset.filter));
  let currentFilter = "all";
  let filterTimer = 0;
  let filterGeneration = 0;

  const cardMatches = (card, filter) =>
    filter === "all" || card.dataset.topics.split(/\s+/).includes(filter);

  const updateFilterControls = (filter, count) => {
    filterButtons.forEach((button) => {
      const active = button.dataset.filter === filter;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    if (resultCount) resultCount.textContent = String(count);
    if (emptyState) emptyState.hidden = count !== 0;
  };

  const setFilter = (requestedFilter, options = {}) => {
    const filter = availableFilters.has(requestedFilter) ? requestedFilter : "all";
    const animate = options.animate !== false && !reduceMotion;
    const force = options.force === true;
    const matchingCards = projectCards.filter((card) => cardMatches(card, filter));

    updateFilterControls(filter, matchingCards.length);
    if (!force && filter === currentFilter) return;
    currentFilter = filter;
    filterGeneration += 1;
    const generation = filterGeneration;
    window.clearTimeout(filterTimer);

    if (!animate) {
      projectCards.forEach((card) => {
        card.hidden = !cardMatches(card, filter);
        card.classList.remove("is-filtering");
        card.style.removeProperty("opacity");
      });
      projectGrid?.removeAttribute("aria-busy");
      scheduleViewportUpdate();
      return;
    }

    projectGrid?.setAttribute("aria-busy", "true");
    projectCards.forEach((card) => {
      if (cardMatches(card, filter) && card.hidden) card.hidden = false;
      if (!card.hidden) {
        card.classList.add("is-filtering");
        card.style.opacity = "0";
      }
    });

    filterTimer = window.setTimeout(() => {
      if (generation !== filterGeneration) return;

      projectCards.forEach((card) => {
        card.hidden = !cardMatches(card, filter);
      });

      window.requestAnimationFrame(() => {
        if (generation !== filterGeneration) return;
        projectCards.forEach((card) => {
          card.classList.remove("is-filtering");
          card.style.removeProperty("opacity");
        });
        projectGrid?.removeAttribute("aria-busy");
        scheduleViewportUpdate();
      });
    }, 180);
  };

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => setFilter(button.dataset.filter));
  });

  document.querySelectorAll("[data-topic-jump]").forEach((link) => {
    link.addEventListener("click", () => {
      setFilter(link.dataset.topicJump);
    });
  });

  /* Restrained project-card tilt --------------------------------------- */

  const tiltFrames = new WeakMap();

  projectCards.forEach((card) => {
    card.addEventListener(
      "pointermove",
      (event) => {
        if (reduceMotion || !finePointerQuery.matches || event.pointerType === "touch") return;
        if (tiltFrames.get(card)) return;

        const frame = window.requestAnimationFrame(() => {
          const rect = card.getBoundingClientRect();
          const x = clamp((event.clientX - rect.left) / rect.width);
          const y = clamp((event.clientY - rect.top) / rect.height);
          const rotateX = (0.5 - y) * 2.4;
          const rotateY = (x - 0.5) * 2.8;

          card.style.setProperty("--rx", `${rotateX.toFixed(2)}deg`);
          card.style.setProperty("--ry", `${rotateY.toFixed(2)}deg`);
          card.style.setProperty("--card-x", `${(x * 100).toFixed(1)}%`);
          card.style.setProperty("--card-y", `${(y * 100).toFixed(1)}%`);
          tiltFrames.delete(card);
        });
        tiltFrames.set(card, frame);
      },
      { passive: true },
    );

    card.addEventListener("pointerleave", () => {
      const frame = tiltFrames.get(card);
      if (frame) window.cancelAnimationFrame(frame);
      tiltFrames.delete(card);
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
      card.style.setProperty("--card-x", "50%");
      card.style.setProperty("--card-y", "25%");
    });
  });

  const resetCardTilt = () => {
    projectCards.forEach((card) => {
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
    });
  };

  /* Ambient research constellation ------------------------------------- */

  const createResearchField = () => {
    const canvas = document.getElementById("research-field");
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return { start() {}, stop() {}, resize() {}, setTheme() {} };
    }

    const palettes = {
      dark: {
        primary: [99, 164, 255],
        secondary: [93, 228, 199],
        line: [99, 164, 255],
        pointer: [155, 140, 255],
      },
      light: {
        primary: [40, 107, 215],
        secondary: [8, 124, 109],
        line: [40, 107, 215],
        pointer: [104, 86, 217],
      },
    };

    let palette = palettes[root.dataset.theme === "light" ? "light" : "dark"];
    let particles = [];
    let width = 0;
    let height = 0;
    let animationFrame = 0;
    let resizeFrame = 0;
    let lastTime = 0;
    let running = false;

    const makeParticle = () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.24,
      vy: (Math.random() - 0.5) * 0.24,
      radius: 0.65 + Math.random() * 1.25,
      phase: Math.random() * Math.PI * 2,
      secondary: Math.random() < 0.32,
    });

    const resize = () => {
      const nextWidth = window.innerWidth;
      const nextHeight = window.innerHeight;
      const previousWidth = width || nextWidth;
      const previousHeight = height || nextHeight;
      width = nextWidth;
      height = nextHeight;

      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      particles.forEach((particle) => {
        particle.x *= width / previousWidth;
        particle.y *= height / previousHeight;
      });

      const densityTarget = Math.floor((width * height) / 26000);
      const maximum = width < 700 ? 44 : 74;
      const targetCount = clamp(densityTarget, 30, maximum);
      while (particles.length < targetCount) particles.push(makeParticle());
      if (particles.length > targetCount) particles.length = targetCount;
    };

    const rgba = (rgb, alpha) => `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;

    const draw = (time) => {
      if (!running) return;
      const delta = clamp((time - lastTime) / 16.667, 0.3, 2.2);
      lastTime = time;
      context.clearRect(0, 0, width, height);

      particles.forEach((particle) => {
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;
        if (particle.x < -8) particle.x = width + 8;
        else if (particle.x > width + 8) particle.x = -8;
        if (particle.y < -8) particle.y = height + 8;
        else if (particle.y > height + 8) particle.y = -8;
      });

      const connectionDistance = width < 700 ? 105 : 132;
      const connectionDistanceSquared = connectionDistance * connectionDistance;
      context.lineWidth = 0.65;

      for (let index = 0; index < particles.length; index += 1) {
        const first = particles[index];
        for (let otherIndex = index + 1; otherIndex < particles.length; otherIndex += 1) {
          const second = particles[otherIndex];
          const dx = first.x - second.x;
          const dy = first.y - second.y;
          const distanceSquared = dx * dx + dy * dy;
          if (distanceSquared >= connectionDistanceSquared) continue;

          const strength = 1 - Math.sqrt(distanceSquared) / connectionDistance;
          context.strokeStyle = rgba(palette.line, strength * 0.16);
          context.beginPath();
          context.moveTo(first.x, first.y);
          context.lineTo(second.x, second.y);
          context.stroke();
        }
      }

      if (pointer.active && finePointerQuery.matches) {
        const pointerDistance = 165;
        particles.forEach((particle) => {
          const dx = particle.x - pointer.x;
          const dy = particle.y - pointer.y;
          const distance = Math.hypot(dx, dy);
          if (distance >= pointerDistance) return;
          context.strokeStyle = rgba(
            palette.pointer,
            (1 - distance / pointerDistance) * 0.2,
          );
          context.beginPath();
          context.moveTo(pointer.x, pointer.y);
          context.lineTo(particle.x, particle.y);
          context.stroke();
        });
      }

      particles.forEach((particle) => {
        const shimmer = 0.38 + Math.sin(time * 0.0007 + particle.phase) * 0.13;
        context.fillStyle = rgba(
          particle.secondary ? palette.secondary : palette.primary,
          shimmer,
        );
        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fill();
      });

      animationFrame = window.requestAnimationFrame(draw);
    };

    const start = () => {
      if (running || reduceMotion || document.hidden) return;
      if (!width || !height) resize();
      running = true;
      lastTime = performance.now();
      animationFrame = window.requestAnimationFrame(draw);
    };

    const stop = () => {
      running = false;
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      context.clearRect(0, 0, width, height);
    };

    window.addEventListener(
      "resize",
      () => {
        if (resizeFrame) return;
        resizeFrame = window.requestAnimationFrame(() => {
          resizeFrame = 0;
          resize();
        });
      },
      { passive: true },
    );

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop();
      else start();
    });

    return {
      start,
      stop,
      resize,
      setTheme(theme) {
        palette = palettes[theme === "light" ? "light" : "dark"];
      },
    };
  };

  const researchField = createResearchField();
  refreshFieldTheme = researchField.setTheme;
  researchField.setTheme(root.dataset.theme);
  researchField.start();

  /* Live preference changes -------------------------------------------- */

  addMediaListener(motionQuery, (event) => {
    reduceMotion = event.matches;
    if (reduceMotion) {
      revealObserver?.disconnect();
      revealEverything();
      counters.forEach(finishCounter);
      researchField.stop();
      resetCardTilt();
      setFilter(currentFilter, { animate: false, force: true });
      pointer.active = false;
    } else {
      researchField.start();
    }
  });

  document.querySelectorAll("[data-year]").forEach((year) => {
    year.textContent = String(new Date().getFullYear());
  });
})();
