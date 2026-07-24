import { Router } from 'express';
import * as satellite from 'satellite.js';
import { getCategory } from '../categories.js';
import { getCategoryData } from '../cache.js';

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const router = Router();

// Snapshot of satellites currently above the observer's horizon.
// The client normally computes this itself every second; this endpoint is a
// convenience / fallback for a one-shot server-side answer.
router.get('/', async (req, res) => {
  const category = getCategory(req.query.category);
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);
  const alt = parseFloat(req.query.alt || '0');
  const minEl = parseFloat(req.query.minEl || '0');

  if (!category || Number.isNaN(lat) || Number.isNaN(lon)) {
    return res.status(400).json({ error: 'Require valid category, lat, lon' });
  }

  try {
    const data = await getCategoryData(category);
    const now = new Date();
    const gmst = satellite.gstime(now);
    const observerGd = { longitude: lon * RAD, latitude: lat * RAD, height: alt / 1000 };
    const overhead = [];

    for (const sat of data) {
      try {
        const satrec = satellite.twoline2satrec(sat.line1, sat.line2);
        const pv = satellite.propagate(satrec, now);
        if (!pv || !pv.position) continue;
        const ecf = satellite.eciToEcf(pv.position, gmst);
        const la = satellite.ecfToLookAngles(observerGd, ecf);
        const el = la.elevation * DEG;
        if (el >= minEl) {
          overhead.push({
            name: sat.name,
            noradId: sat.noradId,
            elevation: Math.round(el * 10) / 10,
            azimuth: Math.round(la.azimuth * DEG),
            rangeKm: Math.round(la.rangeSat),
          });
        }
      } catch {
        /* skip un-propagatable record */
      }
    }

    overhead.sort((a, b) => b.elevation - a.elevation);
    res.json({ count: overhead.length, overhead });
  } catch (err) {
    res.status(502).json({ error: 'Failed to compute overhead', detail: err.message });
  }
});

export default router;
