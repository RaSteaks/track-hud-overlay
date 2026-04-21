export interface RawGpsPoint {
  lon: number;
  lat: number;
  t?: number;
}

const GPS_JITTER_SPACING_M = 1.5;
const GPS_SPIKE_MIN_LEG_M = 12;
const GPS_SPIKE_DETOUR_RATIO = 3;
const GPS_SPIKE_DIRECT_RATIO = 0.6;
const EARTH_RADIUS_M = 6378137;

function approxDistanceMeters(a: RawGpsPoint, b: RawGpsPoint): number {
  const lat = (((a.lat + b.lat) / 2) * Math.PI) / 180;
  const dx = (((b.lon - a.lon) * Math.PI) / 180) * EARTH_RADIUS_M * Math.cos(lat);
  const dy = (((b.lat - a.lat) * Math.PI) / 180) * EARTH_RADIUS_M;
  return Math.hypot(dx, dy);
}

function removeCloseGpsJitter(points: RawGpsPoint[]): RawGpsPoint[] {
  if (points.length <= 2) return points;

  const out: RawGpsPoint[] = [points[0]];
  for (let i = 1; i < points.length - 1; i += 1) {
    const previousAccepted = out[out.length - 1];
    const point = points[i];
    if (approxDistanceMeters(previousAccepted, point) >= GPS_JITTER_SPACING_M) {
      out.push(point);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

function isIsolatedGpsSpike(previous: RawGpsPoint, point: RawGpsPoint, next: RawGpsPoint): boolean {
  const inDistance = approxDistanceMeters(previous, point);
  const outDistance = approxDistanceMeters(point, next);
  const directDistance = approxDistanceMeters(previous, next);
  const minLegDistance = Math.min(inDistance, outDistance);

  if (minLegDistance < GPS_SPIKE_MIN_LEG_M) return false;
  if (directDistance > minLegDistance * GPS_SPIKE_DIRECT_RATIO) return false;
  return (inDistance + outDistance) / Math.max(directDistance, 0.1) >= GPS_SPIKE_DETOUR_RATIO;
}

function removeIsolatedGpsSpikes(points: RawGpsPoint[]): RawGpsPoint[] {
  let current = points;

  for (let pass = 0; pass < 3; pass += 1) {
    if (current.length <= 2) return current;

    const out: RawGpsPoint[] = [current[0]];
    let removed = false;

    for (let i = 1; i < current.length - 1; i += 1) {
      const previousAccepted = out[out.length - 1];
      const point = current[i];
      const next = current[i + 1];
      if (isIsolatedGpsSpike(previousAccepted, point, next)) {
        removed = true;
        continue;
      }
      out.push(point);
    }

    out.push(current[current.length - 1]);
    current = out;
    if (!removed) return current;
  }

  return current;
}

export function denoiseGpsPoints<T extends RawGpsPoint>(points: T[]): T[] {
  return removeIsolatedGpsSpikes(removeCloseGpsJitter(points)) as T[];
}
