import { getCategory } from './categories.js';

// CelesTrak serves TLE data with `Access-Control-Allow-Origin: *`, so the browser
// can fetch it directly — no backend needed. We cache per group (in memory and in
// localStorage) so we don't re-poll CelesTrak, matching their usage guidance.
const BASE = 'https://celestrak.org/NORAD/elements/gp.php';
const TTL_MS = 3 * 60 * 60 * 1000; // 3 hours — TLEs update ~daily
const mem = new Map(); // group -> { data, fetchedAt }

const lsKey = (group) => `st_tle_${group}`;

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

async function fetchGroup(group) {
  const now = Date.now();

  const cached = mem.get(group);
  if (cached && now - cached.fetchedAt < TTL_MS) return cached.data;

  // Fall back to a persisted copy from a previous visit.
  try {
    const raw = localStorage.getItem(lsKey(group));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (now - parsed.fetchedAt < TTL_MS) {
        mem.set(group, parsed);
        return parsed.data;
      }
    }
  } catch {
    /* ignore malformed / unavailable storage */
  }

  try {
    const res = await fetch(`${BASE}?GROUP=${encodeURIComponent(group)}&FORMAT=tle`);
    if (!res.ok) throw new Error(`CelesTrak "${group}" responded ${res.status}`);
    const text = await res.text();
    const data = text.includes('No GP data found') ? [] : parseTle(text);
    const entry = { data, fetchedAt: Date.now() };
    mem.set(group, entry);
    // Best-effort persistence; large groups may exceed the localStorage quota,
    // in which case we just keep the in-memory copy for this session.
    try {
      localStorage.setItem(lsKey(group), JSON.stringify(entry));
    } catch {
      /* quota exceeded — fine */
    }
    return data;
  } catch (err) {
    if (cached) return cached.data; // serve stale rather than fail
    throw err;
  }
}

// Fetch a category (one or more groups), merged and deduped by NORAD id.
export async function getCategoryData(categoryId) {
  const category = getCategory(categoryId);
  if (!category) throw new Error(`Unknown category "${categoryId}"`);

  const results = await Promise.all(category.groups.map((g) => fetchGroup(g).catch(() => [])));

  const byId = new Map();
  for (const list of results) {
    for (const rec of list) {
      if (!byId.has(rec.noradId)) byId.set(rec.noradId, rec);
    }
  }
  return [...byId.values()];
}
