import { get } from 'svelte/store';
import { computeState, observerGd as toObserverGd, gstime, groundTrack } from './propagate.js';
import {
  overhead,
  overheadTotal,
  clock,
  minElevation,
  observer,
  selected,
  selectedState,
  records,
} from './stores.js';

const MAX_OVERHEAD = 120; // cap the live list so the DOM stays light
const TICK_MS = 1000; // recompute positions once per second
const PASS_ROUTES = 8; // how many overhead satellites get a route drawn
const ROUTE_REFRESH_MS = 4000;

// View-agnostic ~1 Hz propagation loop, shared by the 2D map and the 3D globe.
// `renderer` implements:
//   setData(positions)      positions: [{ id, name, lat, lon, altKm }]
//   setPassRoutes(routes)   routes: [{ points: [[lat, lon], ...] }]
//   setTrack(points|null)   selected satellite ground track
//   setObserver(o|null)     { lat, lon }
//   setSelected(id|null)
export function createTracker(renderer) {
  let recs = [];
  let positions = []; // reused [{ id, name, lat, lon, altKm }]
  let selectedId = null;
  let trackFor = null; // id whose track is currently drawn
  let passIds = []; // ids of the top overhead satellites (for route drawing)

  function currentDate() {
    return new Date(get(clock).time);
  }

  function updateTrack() {
    if (!selectedId) {
      renderer.setTrack(null);
      trackFor = null;
      return;
    }
    const rec = recs.find((r) => r.noradId === selectedId);
    if (!rec) {
      renderer.setTrack(null);
      trackFor = null;
      return;
    }
    renderer.setTrack(groundTrack(rec.satrec, currentDate(), 100, 30));
    trackFor = selectedId;
  }

  function computePassRoutes() {
    if (!get(observer) || passIds.length === 0) {
      renderer.setPassRoutes([]);
      return;
    }
    const date = currentDate();
    const routes = [];
    for (const id of passIds) {
      const rec = recs.find((r) => r.noradId === id);
      if (rec) routes.push({ points: groundTrack(rec.satrec, date, 90, 45) });
    }
    renderer.setPassRoutes(routes);
  }

  function tick() {
    const date = currentDate();
    const gmst = gstime(date);
    const o = get(observer);
    const obsGd = o ? toObserverGd(o.lat, o.lon, o.alt || 0) : null;
    const minEl = get(minElevation);

    const over = [];
    let selState = null;

    for (let i = 0; i < recs.length; i++) {
      const rec = recs[i];
      const st = computeState(rec.satrec, date, gmst, obsGd);
      const pos = positions[i];
      if (!st) {
        pos.lat = null;
        pos.lon = null;
        continue;
      }
      pos.lat = st.lat;
      pos.lon = st.lon;
      pos.altKm = st.altKm;

      if (obsGd && st.elevation >= minEl) {
        over.push({
          name: rec.name,
          noradId: rec.noradId,
          lat: st.lat,
          lon: st.lon,
          altKm: st.altKm,
          elevation: st.elevation,
          azimuth: st.azimuth,
          rangeKm: st.rangeKm,
          line1: rec.line1,
          line2: rec.line2,
        });
      }

      if (rec.noradId === selectedId) {
        selState = { name: rec.name, noradId: rec.noradId, line1: rec.line1, line2: rec.line2, ...st };
      }
    }

    over.sort((a, b) => b.elevation - a.elevation);
    overhead.set(over.slice(0, MAX_OVERHEAD));
    overheadTotal.set(over.length);
    passIds = over.slice(0, PASS_ROUTES).map((s) => s.noradId);
    selectedState.set(selState);
    renderer.setData(positions);

    if (selectedId && trackFor !== selectedId) updateTrack();
  }

  const unsubRecords = records.subscribe((r) => {
    recs = r || [];
    positions = recs.map((x) => ({ id: x.noradId, name: x.name, lat: null, lon: null, altKm: 0 }));
    passIds = [];
    renderer.setPassRoutes([]);
    updateTrack();
    tick();
  });

  const unsubObserver = observer.subscribe((o) => {
    renderer.setObserver(o ? { lat: o.lat, lon: o.lon } : null);
    tick();
    computePassRoutes();
  });

  const unsubSelected = selected.subscribe((id) => {
    selectedId = id;
    renderer.setSelected(id);
    updateTrack();
    tick();
  });

  const intervalId = setInterval(tick, TICK_MS);
  const trackInterval = setInterval(() => {
    if (selectedId) updateTrack();
  }, 15000);
  const routeInterval = setInterval(computePassRoutes, ROUTE_REFRESH_MS);

  return {
    destroy() {
      clearInterval(intervalId);
      clearInterval(trackInterval);
      clearInterval(routeInterval);
      unsubRecords();
      unsubObserver();
      unsubSelected();
    },
  };
}
