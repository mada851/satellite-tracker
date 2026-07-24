import * as THREE from 'three';

const EARTH_R_KM = 6371;

// Implements the same renderer interface as the 2D SatLayer, but draws onto a
// globe.gl (Three.js) globe:
//   - all satellites as a single THREE.Points cloud (fast for 10k+),
//   - ground-track routes via globe.gl's pathsData layer,
//   - observer + selected satellite as small spheres.
export function createGlobeRenderer(world) {
  const scene = world.scene();

  const satMaterial = new THREE.PointsMaterial({
    color: 0x5eead4,
    size: 2.6,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.95,
  });
  let pointsObj = null;
  let posArray = null;
  let capacity = 0;
  let currentPositions = [];
  let selectedId = null;

  let routes = [];
  let track = null;

  // altitude passed to getCoords is a fraction of Earth's radius.
  function coords(lat, lon, altKm) {
    return world.getCoords(lat, lon, (altKm || 0) / EARTH_R_KM);
  }

  function ensureCapacity(n) {
    if (pointsObj && n <= capacity) return;
    if (pointsObj) {
      scene.remove(pointsObj);
      pointsObj.geometry.dispose();
    }
    capacity = Math.max(n, 1);
    posArray = new Float32Array(capacity * 3);
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    pointsObj = new THREE.Points(geom, satMaterial);
    pointsObj.frustumCulled = false; // we manage the buffer ourselves
    scene.add(pointsObj);
  }

  const obsMesh = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xef4444 })
  );
  obsMesh.visible = false;
  scene.add(obsMesh);

  const selMesh = new THREE.Mesh(
    new THREE.SphereGeometry(2.4, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xf6ad55 })
  );
  selMesh.visible = false;
  scene.add(selMesh);

  function applyPaths() {
    const paths = [];
    for (const r of routes) paths.push({ points: r.points, color: 'rgba(94, 234, 212, 0.45)', stroke: 0.6 });
    if (track && track.length > 1) paths.push({ points: track, color: 'rgba(246, 173, 85, 0.95)', stroke: 1.5 });
    world
      .pathsData(paths)
      .pathPoints('points')
      .pathPointLat((p) => p[0])
      .pathPointLng((p) => p[1])
      .pathPointAlt(0.008)
      .pathColor('color')
      .pathStroke('stroke')
      .pathTransitionDuration(0);
  }

  function updateSelectedMarker(positions) {
    if (selectedId) {
      const s = positions.find((p) => p.id === selectedId && p.lat != null);
      if (s) {
        const c = coords(s.lat, s.lon, s.altKm);
        selMesh.position.set(c.x, c.y, c.z);
        selMesh.visible = true;
        return;
      }
    }
    selMesh.visible = false;
  }

  return {
    setData(positions) {
      currentPositions = positions;
      ensureCapacity(positions.length);
      let n = 0;
      for (let i = 0; i < positions.length; i++) {
        const p = positions[i];
        if (p.lat == null) continue;
        const c = coords(p.lat, p.lon, p.altKm);
        posArray[n * 3] = c.x;
        posArray[n * 3 + 1] = c.y;
        posArray[n * 3 + 2] = c.z;
        n++;
      }
      pointsObj.geometry.setDrawRange(0, n);
      pointsObj.geometry.attributes.position.needsUpdate = true;
      updateSelectedMarker(positions);
    },

    setPassRoutes(r) {
      routes = r || [];
      applyPaths();
    },

    setTrack(t) {
      track = t;
      applyPaths();
    },

    setObserver(o) {
      if (o) {
        const c = coords(o.lat, o.lon, 0);
        obsMesh.position.set(c.x, c.y, c.z);
        obsMesh.visible = true;
      } else {
        obsMesh.visible = false;
      }
    },

    setSelected(id) {
      selectedId = id;
      if (!id) selMesh.visible = false;
      else if (currentPositions.length) updateSelectedMarker(currentPositions);
    },

    focus(lat, lon) {
      world.pointOfView({ lat, lng: lon, altitude: 1.8 }, 800);
    },

    dispose() {
      if (pointsObj) {
        scene.remove(pointsObj);
        pointsObj.geometry.dispose();
      }
      satMaterial.dispose();
      scene.remove(obsMesh);
      obsMesh.geometry.dispose();
      obsMesh.material.dispose();
      scene.remove(selMesh);
      selMesh.geometry.dispose();
      selMesh.material.dispose();
      world.pathsData([]);
    },
  };
}
