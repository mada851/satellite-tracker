import { Router } from 'express';
import { predictPasses } from '../passes.js';

const router = Router();

// POST because the client already holds the satellite's TLE lines (which contain
// spaces and are awkward as query params). Body: { line1, line2, lat, lon, alt?, days?, minEl? }
router.post('/', (req, res) => {
  const { line1, line2, lat, lon, alt = 0, days = 2, minEl = 10 } = req.body || {};
  if (!line1 || !line2 || typeof lat !== 'number' || typeof lon !== 'number') {
    return res.status(400).json({ error: 'Require line1, line2 and numeric lat, lon' });
  }
  try {
    const passes = predictPasses({
      line1,
      line2,
      lat,
      lon,
      alt,
      days: Math.min(Number(days) || 2, 5),
      minEl: Number(minEl) || 0,
    });
    res.json({ count: passes.length, passes });
  } catch (err) {
    res.status(500).json({ error: 'Pass prediction failed', detail: err.message });
  }
});

export default router;
