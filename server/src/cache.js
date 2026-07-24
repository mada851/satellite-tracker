import { fetchGroup } from './celestrak.js';

// TLEs update roughly daily, so cache each group for a few hours. This also
// keeps us well within CelesTrak's request guidance (don't re-poll frequently).
const TTL_MS = (Number(process.env.TLE_TTL_MINUTES) || 180) * 60 * 1000;

const store = new Map(); // group -> { data, fetchedAt }
const inflight = new Map(); // group -> Promise (dedupe concurrent fetches)

async function getGroup(group) {
  const now = Date.now();
  const cached = store.get(group);
  if (cached && now - cached.fetchedAt < TTL_MS) return cached.data;

  if (inflight.has(group)) return inflight.get(group);

  const promise = (async () => {
    try {
      const data = await fetchGroup(group);
      store.set(group, { data, fetchedAt: Date.now() });
      return data;
    } catch (err) {
      if (cached) {
        console.warn(`Serving stale "${group}" after fetch error: ${err.message}`);
        return cached.data; // serve stale rather than fail
      }
      throw err;
    } finally {
      inflight.delete(group);
    }
  })();

  inflight.set(group, promise);
  return promise;
}

// Fetch a category (one or more groups), merged and deduped by NORAD id.
export async function getCategoryData(category) {
  const results = await Promise.all(
    category.groups.map((g) =>
      getGroup(g).catch((e) => {
        console.warn(`Group "${g}" failed: ${e.message}`);
        return [];
      })
    )
  );

  const byId = new Map();
  for (const list of results) {
    for (const rec of list) {
      if (!byId.has(rec.noradId)) byId.set(rec.noradId, rec);
    }
  }
  return [...byId.values()];
}

export function cacheStats() {
  return [...store.entries()].map(([group, v]) => ({
    group,
    count: v.data.length,
    ageMinutes: Math.round((Date.now() - v.fetchedAt) / 60000),
  }));
}
