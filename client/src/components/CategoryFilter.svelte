<script>
  import { category, categories, status, notice } from '../lib/stores.js';
</script>

<section class="panel">
  <h3>Category</h3>
  <div class="chips">
    {#each $categories as c (c.id)}
      <button
        class="chip"
        class:active={$category === c.id}
        title={c.description}
        on:click={() => category.set(c.id)}
      >
        {c.label}
      </button>
    {/each}
  </div>
  {#if $status.loading}
    <p class="hint">Loading satellites…</p>
  {:else if $status.error}
    <p class="hint error">{$status.error}</p>
  {:else}
    <p class="hint">{$status.count.toLocaleString()} satellites loaded</p>
  {/if}
  {#if $notice}
    <p class="hint notice">{$notice}</p>
  {/if}
</section>

<style>
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .chip {
    padding: 6px 10px;
    font-size: 0.82rem;
    border-radius: 999px;
    background: var(--chip);
    border: 1px solid var(--border);
    color: var(--muted);
    cursor: pointer;
    transition: all 0.12s ease;
  }
  .chip:hover {
    color: var(--text);
    border-color: var(--accent);
  }
  .chip.active {
    background: var(--accent);
    color: #06231f;
    border-color: var(--accent);
    font-weight: 600;
  }
  .hint.notice {
    color: var(--accent-2);
    border-left: 2px solid var(--accent-2);
    padding-left: 8px;
    margin-top: 6px;
  }
</style>
