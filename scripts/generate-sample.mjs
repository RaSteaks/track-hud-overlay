#!/usr/bin/env node
// Generate a synthetic telemetry CSV + matching GPX for demo purposes.
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', 'public', 'samples');
mkdirSync(OUT_DIR, { recursive: true });

const DURATION = 120;        // seconds
const FPS = 10;              // samples / second
const RPM_MAX = 8000;

// Gear shift thresholds (up)
const SHIFT_UP = [55, 95, 135, 170, 210];
const SHIFT_DOWN = [30, 65, 100, 140, 180];

function gearFor(speed, prev) {
  let g = prev;
  while (g < 6 && speed > SHIFT_UP[g - 1]) g++;
  while (g > 1 && speed < SHIFT_DOWN[g - 2]) g--;
  return g;
}

function rpmFor(speed, gear) {
  // Speeds for 7000 rpm at each gear
  const topForGear = [70, 110, 150, 185, 215, 240];
  const frac = Math.min(1, speed / topForGear[gear - 1]);
  return Math.round(1200 + frac * (7200 - 1200));
}

// Speed profile: accelerate, cruise with variation, corners, final sprint
function speedAt(t) {
  if (t < 5) return (t / 5) * 60;
  if (t < 20) return 60 + (t - 5) * 6 + 8 * Math.sin(t * 0.6);
  if (t < 40) {
    const base = 150;
    return base + 15 * Math.sin(t * 0.4) - Math.max(0, 40 - (t - 30) * 8);
  }
  if (t < 55) return 90 + 20 * Math.sin(t * 0.5);
  if (t < 80) return 150 + 25 * Math.sin(t * 0.3);
  if (t < 95) return 160 - (t - 80) * 5 + 10 * Math.sin(t * 0.8);
  if (t < 110) return 90 + (t - 95) * 6;
  return 180 + 8 * Math.sin(t * 0.7);
}

// Build CSV
const rows = ['t,speed_kmh,rpm,rpm_max,gear,throttle,brake,abs,tcs,progress,position_current,position_total'];
let prevGear = 1;
let prevSpeed = 0;
for (let i = 0; i <= DURATION * FPS; i++) {
  const t = i / FPS;
  const speed = Math.max(0, speedAt(t));
  const gear = gearFor(speed, prevGear);
  const rpm = rpmFor(speed, gear);
  const accel = speed - prevSpeed;
  const throttle = accel >= 0 ? Math.min(1, 0.3 + accel * 0.2) : 0;
  const brake = accel < -0.5 ? Math.min(1, -accel * 0.1) : 0;
  const abs = brake > 0.6 ? 1 : 0;
  const tcs = throttle > 0.7 && gear <= 2 ? 1 : 0;
  const progress = t / DURATION;
  rows.push(
    [
      t.toFixed(2),
      speed.toFixed(2),
      rpm,
      RPM_MAX,
      gear,
      throttle.toFixed(2),
      brake.toFixed(2),
      abs,
      tcs,
      progress.toFixed(4),
      5,
      12,
    ].join(','),
  );
  prevGear = gear;
  prevSpeed = speed;
}
writeFileSync(resolve(OUT_DIR, 'telemetry.csv'), rows.join('\n') + '\n');

// Build GPX: an oval loop near Shanghai, parameterized over DURATION
const CX = 121.4737, CY = 31.2304;     // lon, lat
const RX = 0.012, RY = 0.006;          // degrees
const gpxPoints = [];
for (let i = 0; i <= DURATION * FPS; i++) {
  const t = i / FPS;
  const u = t / DURATION;              // 0..1
  const theta = u * Math.PI * 2;
  const lon = CX + RX * Math.cos(theta);
  const lat = CY + RY * Math.sin(theta);
  const ts = new Date(1_700_000_000_000 + i * (1000 / FPS)).toISOString();
  gpxPoints.push(`      <trkpt lat="${lat.toFixed(7)}" lon="${lon.toFixed(7)}"><time>${ts}</time></trkpt>`);
}

const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="hud5-sample" xmlns="http://www.topografix.com/GPX/1/1">
  <trk><name>Demo Loop</name><trkseg>
${gpxPoints.join('\n')}
  </trkseg></trk>
</gpx>
`;
writeFileSync(resolve(OUT_DIR, 'track.gpx'), gpx);

console.log(`Wrote ${OUT_DIR}/telemetry.csv (${rows.length - 1} rows) and track.gpx (${gpxPoints.length} points)`);
