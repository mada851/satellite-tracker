// Ask the browser for the user's location (requires user permission).
export function getBrowserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          alt: pos.coords.altitude || 0, // metres
          label: 'My location',
        }),
      (err) => reject(new Error(err.message || 'Could not get location')),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  });
}
