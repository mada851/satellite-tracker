import * as satellite from 'satellite.js';

const DEG = 180 / Math.PI;
const RAD = Math.PI / 180;

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
function compass(azimuthDeg) {
  return COMPASS[Math.round(((azimuthDeg % 360) + 360) % 360 / 22.5) % 16];
}

function lookAngle(satrec, observerGd, date) {
  const pv = satellite.propagate(satrec, date);
  if (!pv || !pv.position) return null;
  const gmst = satellite.gstime(date);
  const ecf = satellite.eciToEcf(pv.position, gmst);
  const la = satellite.ecfToLookAngles(observerGd, ecf);
  return { elevation: la.elevation * DEG, azimuth: la.azimuth * DEG };
}

// Step through time and detect passes (satellite above the horizon).
// Only passes whose peak elevation reaches `minEl` degrees are returned.
export function predictPasses({ line1, line2, lat, lon, alt = 0, days = 2, minEl = 10, stepSec = 30 }) {
  const satrec = satellite.twoline2satrec(line1, line2);
  const observerGd = { longitude: lon * RAD, latitude: lat * RAD, height: alt / 1000 };

  const start = Date.now();
  const end = start + days * 86400 * 1000;
  const passes = [];
  let current = null;

  for (let t = start; t <= end; t += stepSec * 1000) {
    const date = new Date(t);
    const la = lookAngle(satrec, observerGd, date);
    if (!la) continue;
    const above = la.elevation >= 0;

    if (above && !current) {
      current = { start: date, startAz: la.azimuth, maxEl: la.elevation, maxElAz: la.azimuth, maxElTime: date };
    } else if (above && current) {
      if (la.elevation > current.maxEl) {
        current.maxEl = la.elevation;
        current.maxElAz = la.azimuth;
        current.maxElTime = date;
      }
    } else if (!above && current) {
      current.end = date;
      current.endAz = la.azimuth;
      if (current.maxEl >= minEl) passes.push(formatPass(current));
      current = null;
    }
  }
  return passes;
}

function formatPass(p) {
  return {
    start: p.start.toISOString(),
    end: p.end.toISOString(),
    maxElevationTime: p.maxElTime.toISOString(),
    maxElevation: Math.round(p.maxEl * 10) / 10,
    startAzimuth: Math.round(p.startAz),
    endAzimuth: Math.round(p.endAz),
    startDirection: compass(p.startAz),
    endDirection: compass(p.endAz),
    peakDirection: compass(p.maxElAz),
    durationSec: Math.round((p.end - p.start) / 1000),
  };
}
