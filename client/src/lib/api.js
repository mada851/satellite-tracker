// The app is fully static: it talks directly to CelesTrak (which allows CORS) and
// does all orbital math in the browser. These wrappers keep the same shape the
// components already expect — there is no backend to call.
import { CATEGORIES } from './categories.js';
import { getCategoryData } from './celestrak.js';
import { predictPasses } from './passes.js';

export async function fetchCategories() {
  return CATEGORIES.map(({ id, label, description }) => ({ id, label, description }));
}

export async function fetchTles(category) {
  const satellites = await getCategoryData(category);
  return { category, count: satellites.length, satellites };
}

export async function fetchPasses({ line1, line2, lat, lon, alt = 0, days = 2, minEl = 10 }) {
  const passes = predictPasses({ line1, line2, lat, lon, alt, days, minEl });
  return { count: passes.length, passes };
}
