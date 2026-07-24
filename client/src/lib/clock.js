import { clock } from './stores.js';

// Drives the simulation clock. At speed 1 (and not paused) it tracks the real
// wall clock; at higher speeds it accumulates simulated time for fast-forward.
let rafId = null;
let last = 0;

export function startClock() {
  last = performance.now();
  const loop = (t) => {
    const dt = t - last;
    last = t;
    clock.update((c) => {
      if (c.paused) return c;
      if (c.speed === 1) return { ...c, time: Date.now() };
      return { ...c, time: c.time + dt * c.speed };
    });
    rafId = requestAnimationFrame(loop);
  };
  rafId = requestAnimationFrame(loop);
}

export function stopClock() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
}
