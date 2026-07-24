import express from 'express';
import cors from 'cors';
import categoriesRoute from './routes/categories.js';
import tlesRoute from './routes/tles.js';
import passesRoute from './routes/passes.js';
import overheadRoute from './routes/overhead.js';
import { cacheStats } from './cache.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), cache: cacheStats() });
});

app.use('/api/categories', categoriesRoute);
app.use('/api/tles', tlesRoute);
app.use('/api/passes', passesRoute);
app.use('/api/overhead', overheadRoute);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(PORT, () => {
  console.log(`🛰  Satellite tracker backend listening on http://localhost:${PORT}`);
});
