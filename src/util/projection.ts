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
  return projectLonLatLayers([points])[0] ?? [];
}

// Project multiple layers into a shared local planar frame (meters) so
// they align in the minimap. Origin is the first point of the first layer;
// cosLat correction uses the mean latitude across all points.
// NOTE: coordinates are returned in meters — downstream code owns the
// meters→pixel scaling.
export function projectLonLatLayers(layers: LonLat[][]): NormalizedPoint[][] {
  const all: LonLat[] = [];
  for (const layer of layers) all.push(...layer);
  if (all.length === 0) return layers.map(() => []);

  let sumLat = 0;
  for (const p of all) sumLat += p.lat;
  const centerLat = sumLat / all.length;
  const cosLat = Math.cos((centerLat * Math.PI) / 180);
  const originLon = all[0].lon;
  const originLat = all[0].lat;

  return layers.map(layer =>
    layer.map(p => ({
      x: ((p.lon - originLon) * Math.PI * EARTH_R * cosLat) / 180,
      // Flip Y so north is up in SVG (SVG y-axis points down).
      y: -((p.lat - originLat) * Math.PI * EARTH_R) / 180,
    })),
  );
}
