import { writable } from 'svelte/store';

// A writable store backed by localStorage so location / category / settings persist.
function persisted(key, initial) {
  let start = initial;
  try {
    const saved = localStorage.getItem(key);
    if (saved !== null) start = JSON.parse(saved);
  } catch {
    /* ignore malformed storage */
  }
  const store = writable(start);
  store.subscribe((v) => {
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {
      /* ignore quota / privacy-mode errors */
    }
  });
  return store;
}

// Persisted user settings
export const observer = persisted('st_observer', null); // { lat, lon, alt(m), label } | null
export const minElevation = persisted('st_minEl', 10); // horizon threshold, degrees

// Category is intentionally NOT persisted: every visit opens on the full global
// view ("All Active") so you immediately see everything passing.
export const category = writable('all');

// Which renderer is active: '2d' (Leaflet map) or '3d' (globe.gl globe).
export const viewMode = persisted('st_view', '2d');

// Runtime state
export const categories = writable([]); // [{ id, label, description }] from API
export const records = writable([]); // [{ name, noradId, line1, line2, satrec }]
export const overhead = writable([]); // satellites above the horizon right now (sorted, capped)
export const overheadTotal = writable(0); // total above the horizon (before the display cap)
export const selected = writable(null); // selected NORAD id | null
export const selectedState = writable(null); // live position/look-angles for selected sat
export const status = writable({ loading: false, error: null, count: 0 });
export const clock = writable({ time: Date.now(), speed: 1, paused: false });
export const pickMode = writable(false); // true while user is clicking the map to set location
export const focusRequest = writable(null); // { lat, lon, zoom } | null — request map re-center
