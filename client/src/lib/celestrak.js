import { getCategory } from './categories.js';

// CelesTrak serves TLE data with `Access-Control-Allow-Origin: *`, so the browser
// fetches it directly — no backend needed.
//
// Important: CelesTrak updates each group every ~2 hours and returns HTTP 403
// ("GP data has not updated since your last successful download") if you refetch
// before then. So clients MUST cache. We cache in IndexedDB (localStorage is too
// small for the ~16k "active" set) and, on a 403, keep serving the cached copy.
const BASE = 'https://celestrak.org/NORAD/elements/gp.php';
const TTL_MS = 2 * 60 * 60 * 1000; // 2 hours — matches CelesTrak's update cadence
const mem = new Map(); // group -> { data, fetchedAt }

// ---- tiny IndexedDB key/value cache (falls back to memory-only if unavailable) ----
const DB_NAME = 'satellite-tracker';
const STORE = 'tle';
let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (e) {
      reject(e);
    }
  }).catch(() => null);
  return dbPromise;
}

async function idbGet(key) {
  const db = await openDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbSet(key, value) {
  const db = await openDB();
  if (!db) return;
  try {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
  } catch {
    /* ignore */
  }
}

// Parse standard 3-line TLE blocks into { name, noradId, line1, line2 }.
export function parseTle(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+$/, ''))
    .filter((l) => l.length > 0);

  const records = [];
  let i = 0;
  while (i < lines.length) {
    const name = lines[i];
    const line1 = lines[i + 1];
    const line2 = lines[i + 2];
    if (line1 && line2 && line1.startsWith('1 ') && line2.startsWith('2 ')) {
      records.push({
        name: name.replace(/^0 /, '').trim(),
        noradId: line1.substring(2, 7).trim(),
        line1,
        line2,
      });
      i += 3;
    } else {
      i += 1;
    }
  }
  return records;
}

async function loadCached(group) {
  if (mem.has(group)) return mem.get(group);
  const stored = await idbGet(group);
  if (stored) mem.set(group, stored);
  return stored;
}

async function fetchGroup(group) {
  const now = Date.now();
  const cached = await loadCached(group);
  if (cached && now - cached.fetchedAt < TTL_MS) return cached.data;

  try {
    const res = await fetch(`${BASE}?GROUP=${encodeURIComponent(group)}&FORMAT=tle`);

    if (!res.ok) {
      // 403 = "no newer data since your last download" → our cache is still current.
      if (cached) {
        const refreshed = { data: cached.data, fetchedAt: now };
        mem.set(group, refreshed);
        idbSet(group, refreshed);
        return cached.data;
      }
      if (res.status === 403) {
        throw new Error('CelesTrak has no newer data yet (it updates every 2 h). Try again shortly.');
      }
      throw new Error(`CelesTrak "${group}" responded ${res.status}`);
    }

    const text = await res.text();
    const data = text.includes('No GP data found') ? [] : parseTle(text);
    const entry = { data, fetchedAt: Date.now() };
    mem.set(group, entry);
    idbSet(group, entry);
    return data;
  } catch (err) {
    if (cached) return cached.data; // serve stale rather than fail
    throw err;
  }
}

// Fetch a category (one or more groups), merged and deduped by NORAD id.
// Throws only if every group failed with nothing cached to fall back on.
export async function getCategoryData(categoryId) {
  const category = getCategory(categoryId);
  if (!category) throw new Error(`Unknown category "${categoryId}"`);

  const settled = await Promise.allSettled(category.groups.map((g) => fetchGroup(g)));

  const byId = new Map();
  let anyOk = false;
  for (const s of settled) {
    if (s.status === 'fulfilled') {
      anyOk = true;
      for (const rec of s.value) if (!byId.has(rec.noradId)) byId.set(rec.noradId, rec);
    }
  }
  if (!anyOk) {
    throw new Error(settled.find((s) => s.status === 'rejected')?.reason?.message || 'Could not load satellite data.');
  }
  return [...byId.values()];
}
