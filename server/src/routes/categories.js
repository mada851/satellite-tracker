import { Router } from 'express';
import { CATEGORIES } from '../categories.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(
    CATEGORIES.map(({ id, label, description, groups }) => ({
      id,
      label,
      description,
      groupCount: groups.length,
    }))
  );
});

export default router;
