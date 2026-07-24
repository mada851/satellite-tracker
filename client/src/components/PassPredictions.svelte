<script>
  import { selected, records, observer } from '../lib/stores.js';
  import { fetchPasses } from '../lib/api.js';
  import { fmtDayTime, fmtDuration, fmtDeg } from '../lib/format.js';

  let passes = [];
  let loading = false;
  let error = '';
  let key = '';

  $: sat = $selected ? $records.find((r) => r.noradId === $selected) : null;

  // Recompute passes when the selected satellite or observer location changes.
  $: {
    const newKey =
      sat && $observer ? `${sat.noradId}@${$observer.lat.toFixed(3)},${$observer.lon.toFixed(3)}` : '';
    if (newKey !== key) {
      key = newKey;
      loadPasses(sat, $observer);
    }
  }

  async function loadPasses(s, obs) {
    passes = [];
    error = '';
    if (!s || !obs) return;
    loading = true;
    try {
      const res = await fetchPasses({
        line1: s.line1,
        line2: s.line2,
        lat: obs.lat,
        lon: obs.lon,
        alt: obs.alt || 0,
        days: 2,
        minEl: 10,
      });
      passes = res.passes;
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  }
</script>

<section class="panel">
  <h3>Upcoming passes</h3>
  {#if !sat}
    <p class="hint">Select a satellite to see when it flies over you.</p>
  {:else if !$observer}
    <p class="hint">Set your location to predict passes for {sat.name}.</p>
  {:else if loading}
    <p class="hint">Computing passes…</p>
  {:else if error}
    <p class="hint error">{error}</p>
  {:else if passes.length === 0}
    <p class="hint">No passes above 10° in the next 2 days.</p>
  {:else}
    <ul>
      {#each passes as p}
        <li>
          <div class="when">{fmtDayTime(p.start)}</div>
          <div class="det">
            max {fmtDeg(p.maxElevation)} · {p.startDirection}→{p.endDirection} · {fmtDuration(p.durationSec)}
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  li {
    padding: 6px 8px;
    border-radius: 8px;
    background: var(--panel-2);
  }
  .when {
    font-size: 0.85rem;
    color: var(--text);
  }
  .det {
    font-size: 0.74rem;
    color: var(--muted);
  }
</style>
