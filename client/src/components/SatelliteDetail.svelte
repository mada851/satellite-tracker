<script>
  import { selectedState, selected } from '../lib/stores.js';
  import { fmtDeg, fmtKm, fmtSpeed, fmtCoord } from '../lib/format.js';

  $: s = $selectedState;
</script>

{#if s}
  <section class="panel detail">
    <div class="head">
      <h3>{s.name}</h3>
      <button class="close" title="Deselect" on:click={() => selected.set(null)}>✕</button>
    </div>
    <div class="grid">
      <div><span>NORAD</span>{s.noradId}</div>
      <div><span>Altitude</span>{fmtKm(s.altKm)}</div>
      {#if s.velocityKmS}<div><span>Speed</span>{fmtSpeed(s.velocityKmS)}</div>{/if}
      <div class="wide"><span>Sub-point</span>{fmtCoord(s.lat, s.lon)}</div>
      {#if s.elevation !== undefined}
        <div><span>Elevation</span>{fmtDeg(s.elevation)}</div>
        <div><span>Azimuth</span>{fmtDeg(s.azimuth)}</div>
        <div><span>Range</span>{fmtKm(s.rangeKm)}</div>
      {/if}
    </div>
    {#if s.elevation !== undefined && s.elevation < 0}
      <p class="hint">Currently below your horizon.</p>
    {/if}
  </section>
{/if}

<style>
  .detail {
    border-color: var(--accent-2);
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .close {
    background: none;
    border: none;
    color: var(--muted);
    cursor: pointer;
    font-size: 1rem;
    padding: 0 4px;
  }
  .close:hover {
    color: var(--text);
  }
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px 12px;
    margin-top: 6px;
  }
  .grid .wide {
    grid-column: 1 / -1;
  }
  .grid div {
    font-size: 0.85rem;
    color: var(--text);
    display: flex;
    flex-direction: column;
  }
  .grid span {
    font-size: 0.68rem;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
</style>
