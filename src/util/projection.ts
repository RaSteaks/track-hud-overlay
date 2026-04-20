export interface LonLat {
  lon: number;
  lat: number;
}

export interface NormalizedPoint {
  x: number;
  y: number;
}

const EARTH_R = 6378137;

export function projectLonLat(points: LonLat[]): NormalizedPoint[] {
  if (points.length === 0) return [];

  let sumLat = 0;
  for (const p of points) sumLat += p.lat;
  const centerLat = sumLat / points.length;
  const cosLat = Math.cos((centerLat * Math.PI) / 180);

  const planar = points.map(p => ({
    x: ((p.lon - points[0].lon) * Math.PI * EARTH_R * cosLat) / 180,
    y: ((p.lat - points[0].lat) * Math.PI * EARTH_R) / 180,
  }));

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of planar) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const span = Math.max(spanX, spanY);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  // Normalize to [-1, 1] with equal aspect. Flip Y so north-up in SVG.
  return planar.map(p => ({
    x: ((p.x - cx) / span) * 2,
    y: -((p.y - cy) / span) * 2,
  }));
}
