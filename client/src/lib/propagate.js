import * as satellite from 'satellite.js';

const DEG = 180 / Math.PI;
const RAD = Math.PI / 180;

// Parse a TLE record into a satrec, carrying the original fields alongside.
export function toSatrec(rec) {
  try {
    const satrec = satellite.twoline2satrec(rec.line1, rec.line2);
    if (!satrec || satrec.error) return null;
    return { name: rec.name, noradId: rec.noradId, line1: rec.line1, line2: rec.line2, satrec };
  } catch {
    return null;
  }
}

export function gstime(date) {
  return satellite.gstime(date);
}

export function observerGd(lat, lon, altMetres = 0) {
  return { longitude: lon * RAD, latitude: lat * RAD, height: altMetres / 1000 };
}

// Propagate once and derive everything we need: sub-satellite lat/lon/alt, speed,
// and (if an observer is given) look angles az/el/range. One SGP4 call per satellite.
export function computeState(satrec, date, gmst, obsGd) {
  const pv = satellite.propagate(satrec, date);
  if (!pv || !pv.position) return null;

  const geo = satellite.eciToGeodetic(pv.position, gmst);
  const out = {
    lat: satellite.degreesLat(geo.latitude),
    lon: satellite.degreesLong(geo.longitude),
    altKm: geo.height,
  };

  if (pv.velocity) {
    const { x, y, z } = pv.velocity;
    out.velocityKmS = Math.sqrt(x * x + y * y + z * z);
  }

  if (obsGd) {
    const ecf = satellite.eciToEcf(pv.position, gmst);
    const la = satellite.ecfToLookAngles(obsGd, ecf);
    out.elevation = la.elevation * DEG;
    out.azimuth = la.azimuth * DEG;
    out.rangeKm = la.rangeSat;
  }
  return out;
}

// Sub-satellite ground track as [[lat, lon], ...] sampled forward over `minutes`.
export function groundTrack(satrec, startDate, minutes = 100, stepSec = 30) {
  const points = [];
  for (let s = 0; s <= minutes * 60; s += stepSec) {
    const d = new Date(startDate.getTime() + s * 1000);
    const pv = satellite.propagate(satrec, d);
    if (!pv || !pv.position) continue;
    const geo = satellite.eciToGeodetic(pv.position, satellite.gstime(d));
    points.push([satellite.degreesLat(geo.latitude), satellite.degreesLong(geo.longitude)]);
  }
  return points;
}
