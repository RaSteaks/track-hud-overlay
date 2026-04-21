export type CoordinateSystem = 'wgs84' | 'gcj02' | 'bd09';

export const COORDINATE_SYSTEM_LABELS: Record<CoordinateSystem, string> = {
  wgs84: 'WGS-84',
  gcj02: 'GCJ-02',
  bd09: 'BD-09',
};

const X_PI = (Math.PI * 3000.0) / 180.0;
const A = 6378245.0;
const EE = 0.00669342162296594323;

export interface LonLatLike {
  lon: number;
  lat: number;
}

function outOfChina(lon: number, lat: number): boolean {
  return lon < 72.004 || lon > 137.8347 || lat < 0.8293 || lat > 55.8271;
}

function transformLat(x: number, y: number): number {
  let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y;
  ret += 0.2 * Math.sqrt(Math.abs(x));
  ret += ((20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0) / 3.0;
  ret += ((20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin((y / 3.0) * Math.PI)) * 2.0) / 3.0;
  ret += ((160.0 * Math.sin((y / 12.0) * Math.PI) + 320 * Math.sin((y * Math.PI) / 30.0)) * 2.0) / 3.0;
  return ret;
}

function transformLon(x: number, y: number): number {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y;
  ret += 0.1 * Math.sqrt(Math.abs(x));
  ret += ((20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0) / 3.0;
  ret += ((20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin((x / 3.0) * Math.PI)) * 2.0) / 3.0;
  ret += ((150.0 * Math.sin((x / 12.0) * Math.PI) + 300.0 * Math.sin((x / 30.0) * Math.PI)) * 2.0) / 3.0;
  return ret;
}

function wgs84ToGcj02(lon: number, lat: number): LonLatLike {
  if (outOfChina(lon, lat)) return { lon, lat };
  let dLat = transformLat(lon - 105.0, lat - 35.0);
  let dLon = transformLon(lon - 105.0, lat - 35.0);
  const radLat = (lat / 180.0) * Math.PI;
  let magic = Math.sin(radLat);
  magic = 1 - EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / (((A * (1 - EE)) / (magic * sqrtMagic)) * Math.PI);
  dLon = (dLon * 180.0) / ((A / sqrtMagic) * Math.cos(radLat) * Math.PI);
  return { lon: lon + dLon, lat: lat + dLat };
}

function gcj02ToWgs84(lon: number, lat: number): LonLatLike {
  if (outOfChina(lon, lat)) return { lon, lat };
  const gcj = wgs84ToGcj02(lon, lat);
  return { lon: lon * 2 - gcj.lon, lat: lat * 2 - gcj.lat };
}

function bd09ToGcj02(lon: number, lat: number): LonLatLike {
  const x = lon - 0.0065;
  const y = lat - 0.006;
  const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * X_PI);
  const theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * X_PI);
  return { lon: z * Math.cos(theta), lat: z * Math.sin(theta) };
}

export function normalizeLonLat(point: LonLatLike, source: CoordinateSystem): LonLatLike {
  if (source === 'wgs84') return point;
  if (source === 'gcj02') return gcj02ToWgs84(point.lon, point.lat);
  return gcj02ToWgs84(...lonLatArgs(bd09ToGcj02(point.lon, point.lat)));
}

function lonLatArgs(point: LonLatLike): [number, number] {
  return [point.lon, point.lat];
}

export function parseCoordinateSystem(value: string | null | undefined): CoordinateSystem {
  const normalized = String(value ?? '').toLowerCase().replace(/[-_]/g, '');
  if (normalized === 'gcj02') return 'gcj02';
  if (normalized === 'bd09') return 'bd09';
  return 'wgs84';
}
