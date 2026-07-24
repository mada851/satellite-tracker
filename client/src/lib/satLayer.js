import L from 'leaflet';

// A lightweight Leaflet layer that draws every satellite as a dot on a single
// canvas. This scales to thousands of satellites (Starlink, "All active") far
// better than one Leaflet marker each: it culls to the viewport and repaints in
// one pass. It also draws ground-track routes and the observer marker.
export const SatLayer = L.Layer.extend({
  initialize(options = {}) {
    L.setOptions(this, options);
    this._data = []; // [{ id, name, lat, lon }]
    this._track = null; // selected satellite ground track [[lat, lon], ...]
    this._passRoutes = []; // routes of satellites passing overhead [{ points }]
    this._observer = null; // { lat, lon }
    this._selectedId = null;
    this._onSelect = options.onSelect || (() => {});
    this._shouldIgnoreClick = options.shouldIgnoreClick || (() => false);
  },

  onAdd(map) {
    this._map = map;
    this._dpr = window.devicePixelRatio || 1;
    const canvas = (this._canvas = L.DomUtil.create('canvas', 'sat-canvas-layer'));
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    // Leaflet's map pane computes to z-index 400; sit above it so the dots and
    // routes render over the tiles (below controls, which are ~1000).
    canvas.style.zIndex = '450';
    map.getContainer().appendChild(canvas);

    this._sizeCanvas();
    map.on('move zoom viewreset resize zoomend moveend', this._draw, this);
    map.on('click', this._onClick, this);

    // Resize the canvas the instant the map container changes size (window
    // resize, orientation change, layout shifts) — independent of the tick.
    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(() => this._draw());
      this._ro.observe(map.getContainer());
    }
    this._draw();
  },

  onRemove(map) {
    map.off('move zoom viewreset resize zoomend moveend', this._draw, this);
    map.off('click', this._onClick, this);
    this._ro?.disconnect();
    this._ro = null;
    L.DomUtil.remove(this._canvas);
    this._canvas = null;
  },

  setData(data) {
    this._data = data || [];
    this._draw();
    return this;
  },

  setTrack(track) {
    this._track = track;
    this._draw();
    return this;
  },

  setPassRoutes(routes) {
    this._passRoutes = routes || [];
    this._draw();
    return this;
  },

  setObserver(observer) {
    this._observer = observer;
    this._draw();
    return this;
  },

  setSelected(id) {
    this._selectedId = id;
    this._draw();
    return this;
  },

  _sizeCanvas() {
    const size = this._map.getSize();
    const dpr = this._dpr;
    this._canvas.width = size.x * dpr;
    this._canvas.height = size.y * dpr;
    this._canvas.style.width = `${size.x}px`;
    this._canvas.style.height = `${size.y}px`;
  },

  // Append a ground-track polyline to the current path, breaking it where the
  // longitude wraps across the antimeridian (avoids a line straight across the map).
  _appendPath(ctx, points) {
    const map = this._map;
    let prevLon = null;
    let started = false;
    for (const [lat, lon] of points) {
      const p = map.latLngToContainerPoint([lat, lon]);
      if (prevLon !== null && Math.abs(lon - prevLon) > 180) started = false;
      if (!started) {
        ctx.moveTo(p.x, p.y);
        started = true;
      } else {
        ctx.lineTo(p.x, p.y);
      }
      prevLon = lon;
    }
  },

  _draw() {
    const map = this._map;
    const canvas = this._canvas;
    if (!map || !canvas) return;

    const size = map.getSize();
    if (size.x === 0 || size.y === 0) return; // container not laid out yet
    if (canvas.width !== size.x * this._dpr || canvas.height !== size.y * this._dpr) {
      this._sizeCanvas();
    }

    const ctx = canvas.getContext('2d');
    ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
    ctx.clearRect(0, 0, size.x, size.y);

    const bounds = map.getBounds().pad(0.05);

    // 1) Faint routes for satellites passing overhead.
    if (this._passRoutes.length) {
      ctx.strokeStyle = 'rgba(94, 234, 212, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const r of this._passRoutes) this._appendPath(ctx, r.points);
      ctx.stroke();
    }

    // 2) Prominent ground track for the selected satellite.
    if (this._track && this._track.length > 1) {
      ctx.strokeStyle = 'rgba(246, 173, 85, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      this._appendPath(ctx, this._track);
      ctx.stroke();
    }

    // 3) All satellite dots within the viewport.
    ctx.fillStyle = '#5eead4';
    let selPoint = null;
    const data = this._data;
    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      if (d.lat == null) continue;
      if (!bounds.contains([d.lat, d.lon])) continue;
      const p = map.latLngToContainerPoint([d.lat, d.lon]);
      if (d.id === this._selectedId) {
        selPoint = p;
        continue;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.6, 0, 2 * Math.PI);
      ctx.fill();
    }

    // 4) Highlighted selected satellite.
    if (selPoint) {
      ctx.beginPath();
      ctx.arc(selPoint.x, selPoint.y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = '#f6ad55';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#fff';
      ctx.stroke();
    }

    // 5) Observer marker, always on top.
    if (this._observer) {
      const p = map.latLngToContainerPoint([this._observer.lat, this._observer.lon]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = '#ef4444';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#fff';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(p.x, p.y, 11, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  },

  _onClick(e) {
    if (this._shouldIgnoreClick()) return; // e.g. user is picking a location
    const click = e.containerPoint;
    const map = this._map;
    const bounds = map.getBounds().pad(0.05);
    let best = null;
    let bestDist = 12; // px hit radius
    const data = this._data;
    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      if (d.lat == null || !bounds.contains([d.lat, d.lon])) continue;
      const p = map.latLngToContainerPoint([d.lat, d.lon]);
      const dist = Math.hypot(p.x - click.x, p.y - click.y);
      if (dist < bestDist) {
        bestDist = dist;
        best = d;
      }
    }
    if (best) this._onSelect(best.id);
  },
});

export function createSatLayer(options) {
  return new SatLayer(options);
}
