export type SpeedUnit = 'kmh' | 'mph';

export const KMH_TO_MPH = 0.621371;

export function convertSpeed(kmh: number, unit: SpeedUnit): number {
  return unit === 'mph' ? kmh * KMH_TO_MPH : kmh;
}

export function speedUnitLabel(unit: SpeedUnit): string {
  return unit === 'mph' ? 'MPH' : 'km/h';
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
