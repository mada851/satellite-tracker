# 🛰️ Satellite Tracker

Track satellites overhead in **real time** on a live map — pick your location, choose a
category (all, geostationary, Starlink, navigation, comms…), see what's flying over you, and when
it will pass next.

**It's a pure static site** — no backend, no server, no API key. The browser fetches free orbital
data straight from [CelesTrak](https://celestrak.org) (which allows cross-origin requests) and
does all the orbital math locally with [satellite.js](https://github.com/shashwatak/satellite-js).
So it deploys free to Cloudflare Pages, Netlify, Vercel or GitHub Pages.

---

## Features

- **Live 2D map** with every satellite in the chosen category drawn as a moving dot (one canvas
  with viewport culling — handles 16k+ satellites smoothly).
- **Your location** via geolocation, a click on the map, or manual lat/lon (saved locally).
- **Overhead now** — a live, sorted list of satellites above your horizon, with a
  minimum-elevation filter, plus **route lines** for the ones passing over you.
- **Categories** — All Active, Geostationary, Starlink, OneWeb, Space Stations, Navigation
  (GPS/Galileo/GLONASS/BeiDou), Weather, Communications.
- **Pass predictions** — select a satellite for its upcoming passes (time, peak elevation,
  direction, duration), live telemetry, and ground track.
- **Time controls** — pause, fast-forward (10× / 60× / 300×), reset to now.

---

## Run locally

Requires **Node 18+**.

```bash
cd satellite-tracker
npm install
npm run dev
```

Open **http://localhost:5173**. `npm run build` produces the static site in `client/dist`.

---

## Deploy for free

The whole app is the static folder `client/dist`. Any static host works. **Push the repo to
GitHub first**, then connect one of these:

### Cloudflare Pages
1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → connect your GitHub repo.
2. Build settings:
   - **Framework preset:** None
   - **Build command:** `npm run build`
   - **Build output directory:** `client/dist`
   - (Root directory stays `/`.)
3. Deploy. That's it.

> **Why your earlier Cloudflare upload was "too big":** you were uploading the whole project
> (including `node_modules`, ~hundreds of MB) or pushing it through a Worker. Point Cloudflare at
> the repo and let it build — the actual site is **~240 KB**.

### Netlify
Connect the repo — `netlify.toml` already sets build = `npm run build`, publish = `client/dist`.
(Netlify only ran the static part before because the old Express backend can't run on it — there
is no backend now, so it just works.)

### Vercel
Connect the repo — `vercel.json` already sets the build command and output directory.

### GitHub Pages
Works too, but if the site is served from `username.github.io/repo/` you must set Vite's base
path. Build with `npm run build -- --base=/<repo>/` and publish `client/dist` (e.g. via the
`actions/deploy-pages` workflow). Cloudflare Pages / Netlify are simpler.

---

## How it works

```
Browser (Svelte SPA)
────────────────────
category picked ──► fetch TLEs directly from celestrak.org (CORS-enabled, cached in localStorage)
satellite.js propagates every satellite each second
  ├─► positions       → map dots
  ├─► look angles      → "overhead now" list
  └─► pass prediction  → upcoming passes for the selected satellite
```

Everything runs client-side. TLEs are cached in `localStorage` for a few hours (CelesTrak asks
clients not to re-poll frequently), and served from cache on repeat visits.

### Project layout

```
satellite-tracker/
  client/        Vite + Svelte SPA — the whole app (deploy client/dist)
    src/lib/     celestrak.js (fetch+cache), propagate.js, passes.js, tracker.js, satLayer.js
  server/        OPTIONAL legacy Express proxy — not needed; kept for a self-hosted caching setup
```

> **`server/` is optional.** The app no longer calls it. Keep it only if you want to run a shared
> caching proxy instead of each browser fetching CelesTrak directly (`npm run dev:server`).

---

## Notes & attribution

- Orbital data © [CelesTrak](https://celestrak.org) (Dr. T.S. Kelso). The app caches TLEs to avoid
  frequent polling, per their guidance.
- Map tiles © OpenStreetMap contributors, © CARTO.
- Propagation via [satellite.js](https://github.com/shashwatak/satellite-js) (SGP4/SDP4).
- Positions are predictions from the latest published TLEs; accuracy degrades as elements age.
