const BASE = 'https://celestrak.org/NORAD/elements/gp.php';

// Fetch one CelesTrak GROUP as TLE text and parse it into records.
// FORMAT=tle is requested explicitly because CelesTrak's default became CSV in 2026.
export async function fetchGroup(group) {
  const url = `${BASE}?GROUP=${encodeURIComponent(group)}&FORMAT=tle`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'satellite-tracker/1.0 (educational project)' },
  });
  if (!res.ok) throw new Error(`CelesTrak "${group}" responded ${res.status}`);
  const text = await res.text();
  // CelesTrak returns the literal string below when a group has no data / is unknown.
  if (text.includes('No GP data found')) return [];
  return parseTle(text);
}

// Parse standard 3-line TLE blocks into { name, noradId, line1, line2 }.
// Robust to stray blank lines: it scans for a "1 ..." / "2 ..." pair.
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
