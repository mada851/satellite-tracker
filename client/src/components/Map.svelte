<script>
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import L from 'leaflet';
  import { createSatLayer } from '../lib/satLayer.js';
  import { createTracker } from '../lib/tracker.js';
  import { observer, selected, pickMode, focusRequest } from '../lib/stores.js';

  let mapEl;
  let map;
  let satLayer;
  let tracker;
  let unsubFocus;

  onMount(() => {
    map = L.map(mapEl, {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 12,
      worldCopyJump: true,
      preferCanvas: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(map);

    // While in "pick" mode, a map click sets the observer location.
    map.on('click', (e) => {
      if (get(pickMode)) {
        observer.set({ lat: e.latlng.lat, lon: e.latlng.lng, alt: 0, label: 'Custom location' });
        pickMode.set(false);
      }
    });

    satLayer = createSatLayer({
      onSelect: (id) => selected.set(id),
      shouldIgnoreClick: () => get(pickMode),
    }).addTo(map);
    tracker = createTracker(satLayer);

    unsubFocus = focusRequest.subscribe((req) => {
      if (req && map) {
        map.setView([req.lat, req.lon], req.zoom ?? map.getZoom(), { animate: true });
        focusRequest.set(null);
      }
    });

    // Ensure correct sizing once the flex/grid layout has settled.
    setTimeout(() => map.invalidateSize(), 200);
  });

  onDestroy(() => {
    unsubFocus?.();
    tracker?.destroy();
    satLayer?.remove();
    map?.remove();
  });

  $: if (mapEl) mapEl.style.cursor = $pickMode ? 'crosshair' : '';
</script>

<div class="map" bind:this={mapEl}></div>

<style>
  .map {
    position: absolute;
    inset: 0;
    height: 100%;
    width: 100%;
    background: #0b1020;
  }
  :global(.leaflet-container) {
    background: #0b1020;
    font: inherit;
  }
  :global(.leaflet-bar a) {
    background: #1b2540;
    color: #e6ecff;
    border-color: #253150;
  }
  :global(.leaflet-bar a:hover) {
    background: #253150;
  }
  :global(.leaflet-control-attribution) {
    background: rgba(11, 16, 32, 0.7) !important;
    color: #8ea0c8 !important;
  }
  :global(.leaflet-control-attribution a) {
    color: #4fd1c5 !important;
  }
</style>
