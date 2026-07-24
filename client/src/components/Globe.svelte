<script>
  import { onMount, onDestroy } from 'svelte';
  import Globe from 'globe.gl';
  import { createTracker } from '../lib/tracker.js';
  import { createGlobeRenderer } from '../lib/globeRenderer.js';
  import { focusRequest } from '../lib/stores.js';

  let el;
  let world;
  let renderer;
  let tracker;
  let unsubFocus;
  let ro;

  onMount(() => {
    world = Globe()(el)
      .backgroundColor('#0b1020')
      .globeImageUrl(`${import.meta.env.BASE_URL}earth-night.jpg`)
      .showAtmosphere(true)
      .atmosphereColor('#4fd1c5')
      .atmosphereAltitude(0.18)
      .width(el.clientWidth)
      .height(el.clientHeight);

    world.controls().autoRotate = false;
    world.pointOfView({ lat: 20, lng: 0, altitude: 2.5 });

    renderer = createGlobeRenderer(world);
    tracker = createTracker(renderer);

    unsubFocus = focusRequest.subscribe((req) => {
      if (req && world) {
        renderer.focus(req.lat, req.lon);
        focusRequest.set(null);
      }
    });

    ro = new ResizeObserver(() => {
      if (world) world.width(el.clientWidth).height(el.clientHeight);
    });
    ro.observe(el);
  });

  onDestroy(() => {
    unsubFocus?.();
    ro?.disconnect();
    tracker?.destroy();
    renderer?.dispose();
    try {
      world?.pauseAnimation?.();
      world?._destructor?.();
    } catch {
      /* ignore teardown errors */
    }
    if (el) el.innerHTML = '';
  });
</script>

<div class="globe" bind:this={el}></div>

<style>
  .globe {
    position: absolute;
    inset: 0;
    height: 100%;
    width: 100%;
    background: #0b1020;
    overflow: hidden;
  }
</style>
