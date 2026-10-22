// Location helpers. GPS is noisy (especially indoors), so a check passes when
// the player's accuracy circle overlaps the gem's radius.

const MAX_ACCURACY_CREDIT_M = 50;

export function distanceM(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function isNear(pos, gem) {
  const d = distanceM(pos, gem);
  const credit = Math.min(pos.accuracy || 0, MAX_ACCURACY_CREDIT_M);
  return { near: d - credit <= gem.radiusM, distance: d };
}

// Resolves to {lat, lng, accuracy} or null when location is unavailable
// (denied, timed out, or unsupported). Never rejects.
export function getPosition({ timeout = 12000 } = {}) {
  if (!('geolocation' in navigator)) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      (err) => resolve(err.code === err.PERMISSION_DENIED ? { denied: true } : null),
      { enableHighAccuracy: true, timeout, maximumAge: 5000 },
    );
  });
}

// Keeps GPS warm while a clue is on screen and reports the latest fix.
// Returns a stop function.
export function watchPosition(onFix, onDenied = () => {}) {
  if (!('geolocation' in navigator)) { onDenied(); return () => {}; }
  const id = navigator.geolocation.watchPosition(
    (p) => onFix({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
    (err) => { if (err.code === err.PERMISSION_DENIED) onDenied(); },
    { enableHighAccuracy: true, maximumAge: 5000 },
  );
  return () => navigator.geolocation.clearWatch(id);
}

// Warmer/colder feedback without giving away the exact spot.
export function proximityLabel(distance) {
  if (distance < 40) return { level: 4, text: 'On fire' };
  if (distance < 100) return { level: 3, text: 'Hot' };
  if (distance < 200) return { level: 2, text: 'Warm' };
  if (distance < 400) return { level: 1, text: 'Cool' };
  return { level: 0, text: 'Cold' };
}
