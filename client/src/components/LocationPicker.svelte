<script>
  import { observer, pickMode } from '../lib/stores.js';
  import { getBrowserLocation } from '../lib/geo.js';
  import { fmtCoord } from '../lib/format.js';

  let busy = false;
  let error = '';
  let latInput = '';
  let lonInput = '';

  async function useMyLocation() {
    busy = true;
    error = '';
    try {
      observer.set(await getBrowserLocation());
    } catch (e) {
      error = e.message;
    } finally {
      busy = false;
    }
  }

  function setManual() {
    const lat = parseFloat(latInput);
    const lon = parseFloat(lonInput);
    if (Number.isNaN(lat) || Number.isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      error = 'Enter a valid latitude (−90..90) and longitude (−180..180).';
      return;
    }
    error = '';
    observer.set({ lat, lon, alt: 0, label: 'Custom location' });
    latInput = '';
    lonInput = '';
  }
</script>

<section class="panel">
  <h3>Your location</h3>
  {#if $observer}
    <p class="current">📍 {$observer.label} — {fmtCoord($observer.lat, $observer.lon)}</p>
  {:else}
    <p class="hint">Set your location to see what's overhead.</p>
  {/if}

  <div class="row">
    <button on:click={useMyLocation} disabled={busy}>
      {busy ? 'Locating…' : '📡 Use my location'}
    </button>
    <button class:active={$pickMode} on:click={() => pickMode.set(!$pickMode)}>
      {$pickMode ? 'Click the map…' : '📌 Pick on map'}
    </button>
  </div>

  <div class="row manual">
    <input type="number" step="any" placeholder="Lat" bind:value={latInput} />
    <input type="number" step="any" placeholder="Lon" bind:value={lonInput} />
    <button on:click={setManual}>Set</button>
  </div>

  {#if $observer}
    <button class="link" on:click={() => observer.set(null)}>Clear location</button>
  {/if}
  {#if error}<p class="hint error">{error}</p>{/if}
</section>

<style>
  .current {
    font-size: 0.85rem;
    color: var(--text);
    margin: 0 0 8px;
  }
  .row {
    display: flex;
    gap: 6px;
    margin-bottom: 6px;
  }
  .row.manual input {
    width: 100%;
    min-width: 0;
  }
  .row button {
    flex: 1;
    white-space: nowrap;
  }
  .row.manual button {
    flex: 0 0 auto;
  }
  button.active {
    background: var(--accent);
    color: #06231f;
    border-color: var(--accent);
  }
  .link {
    background: none;
    border: none;
    color: var(--muted);
    text-decoration: underline;
    padding: 2px 0;
    cursor: pointer;
    font-size: 0.8rem;
  }
  .link:hover {
    color: var(--text);
  }
</style>
