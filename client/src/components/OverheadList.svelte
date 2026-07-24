<script>
  import { overhead, overheadTotal, observer, minElevation, selected, focusRequest } from '../lib/stores.js';
  import { compass, fmtDeg, fmtKm } from '../lib/format.js';

  function focus(sat) {
    selected.set(sat.noradId);
    focusRequest.set({ lat: sat.lat, lon: sat.lon, zoom: 4 });
  }
</script>

<section class="panel">
  <div class="head">
    <h3>Overhead now</h3>
    {#if $observer}<span class="count">{$overheadTotal}</span>{/if}
  </div>

  {#if $observer}
    <label class="minel">
      <span>Min elevation: {$minElevation}°</span>
      <input type="range" min="0" max="60" step="1" bind:value={$minElevation} />
    </label>

    {#if $overhead.length === 0}
      <p class="hint">Nothing above {$minElevation}° right now — lower the threshold or wait a moment.</p>
    {:else}
      <ul>
        {#each $overhead as sat (sat.noradId)}
          <li>
            <button type="button" class="item" class:sel={$selected === sat.noradId} on:click={() => focus(sat)}>
              <span class="name">{sat.name}</span>
              <span class="meta">{fmtDeg(sat.elevation)} · {compass(sat.azimuth)} · {fmtKm(sat.rangeKm)}</span>
            </button>
          </li>
        {/each}
      </ul>
      {#if $overheadTotal > $overhead.length}
        <p class="hint">Showing the {$overhead.length} highest of {$overheadTotal}.</p>
      {/if}
    {/if}
  {:else}
    <p class="hint">Set your location above to list satellites currently above your horizon.</p>
  {/if}
</section>

<style>
  .head {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .count {
    background: var(--accent);
    color: #06231f;
    font-size: 0.72rem;
    font-weight: 700;
    padding: 1px 8px;
    border-radius: 999px;
  }
  .minel {
    display: block;
    font-size: 0.78rem;
    color: var(--muted);
    margin: 8px 0;
  }
  .minel input {
    width: 100%;
    margin-top: 4px;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 220px;
    overflow-y: auto;
  }
  .item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1px;
    width: 100%;
    text-align: left;
    padding: 6px 8px;
    border-radius: 8px;
    cursor: pointer;
    border: 1px solid transparent;
    background: none;
    color: inherit;
    font: inherit;
  }
  .item:hover {
    background: var(--panel-2);
  }
  .item.sel {
    background: var(--panel-2);
    border-color: var(--accent-2);
  }
  .name {
    font-size: 0.85rem;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .meta {
    font-size: 0.74rem;
    color: var(--muted);
  }
</style>
