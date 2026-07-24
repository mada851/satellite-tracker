<script>
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import LeafletMap from './components/Map.svelte';
  import CategoryFilter from './components/CategoryFilter.svelte';
  import LocationPicker from './components/LocationPicker.svelte';
  import OverheadList from './components/OverheadList.svelte';
  import PassPredictions from './components/PassPredictions.svelte';
  import SatelliteDetail from './components/SatelliteDetail.svelte';
  import { fetchCategories, fetchTles } from './lib/api.js';
  import { toSatrec } from './lib/propagate.js';
  import { categories, category, records, status, clock } from './lib/stores.js';
  import { startClock, stopClock } from './lib/clock.js';

  let loadedCategory = null;
  // Start open on desktop, collapsed on phones so the map is visible first.
  let sidebarOpen = typeof window === 'undefined' || window.innerWidth > 760;

  onMount(async () => {
    startClock();
    try {
      categories.set(await fetchCategories());
    } catch {
      status.set({ loading: false, error: 'Backend unreachable — is the server running?', count: 0 });
    }
  });

  onDestroy(() => stopClock());

  // Load TLEs whenever the chosen category changes.
  $: if ($category && $category !== loadedCategory) {
    loadedCategory = $category;
    loadCategory($category);
  }

  async function loadCategory(cat) {
    status.set({ loading: true, error: null, count: get(status).count });
    try {
      const res = await fetchTles(cat);
      const recs = res.satellites.map(toSatrec).filter(Boolean);
      records.set(recs);
      status.set({ loading: false, error: null, count: recs.length });
    } catch (e) {
      records.set([]);
      status.set({ loading: false, error: e.message, count: 0 });
    }
  }

  const SPEEDS = [1, 10, 60, 300];
  function setSpeed(mult) {
    clock.update((c) => ({ ...c, speed: mult, paused: false, time: mult === 1 ? Date.now() : c.time }));
  }
  function togglePause() {
    clock.update((c) => ({ ...c, paused: !c.paused }));
  }
  function resetNow() {
    clock.set({ time: Date.now(), speed: 1, paused: false });
  }

  $: simTime = new Date($clock.time);
</script>

<div class="app">
  <header>
    <div class="brand"><span class="logo">🛰️</span> <strong>Satellite Tracker</strong></div>

    <div class="controls">
      <button class="tc" class:warn={$clock.paused} on:click={togglePause}>
        {$clock.paused ? '▶ Resume' : '⏸ Pause'}
      </button>
      {#each SPEEDS as sp}
        <button class="tc" class:active={$clock.speed === sp && !$clock.paused} on:click={() => setSpeed(sp)}>
          {sp}×
        </button>
      {/each}
      <button class="tc" on:click={resetNow}>⟲ Now</button>
      <span class="simclock" class:live={$clock.speed === 1 && !$clock.paused}>
        {simTime.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        {simTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>
    </div>

    <button class="toggle" on:click={() => (sidebarOpen = !sidebarOpen)} title="Toggle panel">
      {sidebarOpen ? '✕' : '☰'}
    </button>
  </header>

  <div class="body">
    <aside class="sidebar" class:open={sidebarOpen}>
      <LocationPicker />
      <CategoryFilter />
      <OverheadList />
      <SatelliteDetail />
      <PassPredictions />
      <p class="foot">
        Data: <a href="https://celestrak.org" target="_blank" rel="noreferrer">CelesTrak</a> ·
        SGP4 via satellite.js · Map © OpenStreetMap/CARTO
      </p>
    </aside>

    <main class="map-wrap">
      <LeafletMap />
      <div class="legend">
        <span><i class="dot sat"></i> satellite</span>
        <span><i class="dot me"></i> you</span>
        <span><i class="dot sel"></i> selected</span>
      </div>
    </main>
  </div>
</div>

<style>
  .app {
    display: grid;
    grid-template-rows: auto 1fr;
    height: 100vh;
    height: 100dvh;
  }

  header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    background: var(--panel);
    border-bottom: 1px solid var(--border);
    z-index: 20;
  }
  .brand {
    font-size: 1rem;
    white-space: nowrap;
  }
  .logo {
    font-size: 1.1rem;
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: auto;
    flex-wrap: wrap;
  }
  .tc {
    padding: 4px 8px;
    font-size: 0.78rem;
    background: var(--chip);
    border: 1px solid var(--border);
    color: var(--muted);
    border-radius: 6px;
    cursor: pointer;
  }
  .tc:hover {
    color: var(--text);
  }
  .tc.active {
    background: var(--accent);
    color: #06231f;
    border-color: var(--accent);
    font-weight: 600;
  }
  .tc.warn {
    color: var(--accent-2);
    border-color: var(--accent-2);
  }
  .simclock {
    font-variant-numeric: tabular-nums;
    font-size: 0.8rem;
    color: var(--muted);
    padding-left: 6px;
    white-space: nowrap;
  }
  .simclock.live::before {
    content: '● ';
    color: #22c55e;
  }

  .toggle {
    display: none;
    background: var(--chip);
    border: 1px solid var(--border);
    color: var(--text);
    border-radius: 6px;
    padding: 4px 9px;
    cursor: pointer;
  }

  .body {
    position: relative;
    display: grid;
    grid-template-columns: 340px 1fr;
    min-height: 0;
  }

  .sidebar {
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: var(--bg);
    border-right: 1px solid var(--border);
  }
  .foot {
    font-size: 0.72rem;
    color: var(--muted);
    margin: 4px 0 0;
    line-height: 1.5;
  }
  .foot a {
    color: var(--accent);
  }

  .map-wrap {
    position: relative;
    min-height: 0;
  }

  .legend {
    position: absolute;
    left: 10px;
    bottom: 10px;
    z-index: 500;
    display: flex;
    gap: 12px;
    background: rgba(11, 16, 32, 0.8);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 6px 10px;
    font-size: 0.74rem;
    color: var(--muted);
  }
  .legend .dot {
    display: inline-block;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    margin-right: 4px;
    vertical-align: middle;
  }
  .dot.sat {
    background: var(--accent);
  }
  .dot.me {
    background: var(--danger);
    border: 1px solid #fff;
  }
  .dot.sel {
    background: var(--accent-2);
    border: 1px solid #fff;
  }

  @media (max-width: 760px) {
    .toggle {
      display: block;
    }
    .body {
      grid-template-columns: 1fr;
    }
    .sidebar {
      position: absolute;
      inset: 0 0 0 0;
      z-index: 15;
      transform: translateX(-100%);
      transition: transform 0.2s ease;
      width: min(92%, 360px);
      border-right: 1px solid var(--border);
    }
    .sidebar.open {
      transform: translateX(0);
    }
    .simclock {
      display: none;
    }
  }
</style>
