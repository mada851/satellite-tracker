import { Router } from 'express';
import { getCategory } from '../categories.js';
import { getCategoryData } from '../cache.js';

const router = Router();

router.get('/', async (req, res) => {
  const category = getCategory(req.query.category);
  if (!category) {
    return res.status(400).json({ error: 'Unknown category', category: req.query.category ?? null });
  }
  try {
    const satellites = await getCategoryData(category);
    res.json({ category: category.id, label: category.label, count: satellites.length, satellites });
  } catch (err) {
    res.status(502).json({ error: 'Failed to fetch TLE data', detail: err.message });
  }
});

export default router;
