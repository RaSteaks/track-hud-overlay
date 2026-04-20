import { gpx } from '@tmcw/togeojson';
import type { Track, TrackPoint } from './schema';
import { projectLonLat, type LonLat } from '../util/projection';
import { clamp } from '../util/units';

interface RawPoint extends LonLat {
  t?: number;
}

function extractFromGeoJson(geo: any): RawPoint[] {
  const out: RawPoint[] = [];
  for (const feature of geo.features ?? []) {
    const g = feature.geometry;
    if (!g) continue;
    const times: string[] | undefined = feature.properties?.coordinateProperties?.times;
    const push = (coords: number[][], base = 0) => {
      coords.forEach((c, i) => {
        const ts = times?.[base + i];
        out.push({
          lon: c[0],
          lat: c[1],
          t: ts ? Date.parse(ts) / 1000 : undefined,
        });
      });
    };
    if (g.type === 'LineString') push(g.coordinates);
    else if (g.type === 'MultiLineString') {
      let offset = 0;
      for (const seg of g.coordinates) {
        push(seg, offset);
        offset += seg.length;
      }
    }
  }
  return out;
}

function buildTrack(raw: RawPoint[]): Track {
  const normalized = projectLonLat(raw);
  let totalLength = 0;
  const points: TrackPoint[] = normalized.map((p, i) => {
    if (i > 0) {
      const dx = p.x - normalized[i - 1].x;
      const dy = p.y - normalized[i - 1].y;
      totalLength += Math.hypot(dx, dy);
    }
    return {
      x: p.x,
      y: p.y,
      distance: totalLength,
      t: raw[i].t,
    };
  });

  if (points.length && points[0].t !== undefined) {
    const t0 = points[0].t!;
    for (const p of points) if (p.t !== undefined) p.t -= t0;
  }

  return { points, totalLength };
}

export function parseGpx(text: string): Track {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  const geo = gpx(doc);
  return buildTrack(extractFromGeoJson(geo));
}

export function parseGeoJson(text: string): Track {
  const geo = JSON.parse(text);
  return buildTrack(extractFromGeoJson(geo));
}

export interface TrackPose {
  x: number;
  y: number;
  headingRad: number;
}

export function poseAt(track: Track, opts: { time?: number; progress?: number }): TrackPose | null {
  const { points } = track;
  if (points.length === 0) return null;

  const hasTime = points[0].t !== undefined;
  let idx = 0;
  let f = 0;

  if (hasTime && opts.time !== undefined) {
    const t = opts.time;
    if (t <= points[0].t!) {
      idx = 0; f = 0;
    } else if (t >= points[points.length - 1].t!) {
      idx = points.length - 2; f = 1;
    } else {
      let lo = 0, hi = points.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if ((points[mid].t ?? 0) <= t) lo = mid;
        else hi = mid;
      }
      idx = lo;
      const a = points[idx], b = points[idx + 1];
      f = (t - a.t!) / ((b.t! - a.t!) || 1);
    }
  } else {
    const p = clamp(opts.progress ?? 0, 0, 1);
    const targetDist = p * track.totalLength;
    if (points.length < 2) return { x: points[0].x, y: points[0].y, headingRad: 0 };
    let lo = 0, hi = points.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (points[mid].distance <= targetDist) lo = mid;
      else hi = mid;
    }
    idx = lo;
    const a = points[idx], b = points[idx + 1];
    f = (targetDist - a.distance) / ((b.distance - a.distance) || 1);
  }

  const a = points[idx];
  const b = points[Math.min(idx + 1, points.length - 1)];
  const x = a.x + (b.x - a.x) * f;
  const y = a.y + (b.y - a.y) * f;
  const heading = Math.atan2(b.x - a.x, -(b.y - a.y)); // 0 = north, clockwise
  return { x, y, headingRad: heading };
}
