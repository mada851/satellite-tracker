import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// The client is a plain Svelte SPA (no SSR). It talks directly to CelesTrak
// (which allows CORS) and needs no backend — so it deploys as pure static files.
export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 5173,
  },
});
