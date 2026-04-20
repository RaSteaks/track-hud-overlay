export type GearValue = number | 'N' | 'R';

export interface TelemetrySample {
  t: number;
  speedKmh: number;
  rpm?: number;
  rpmMax?: number;
  gear?: GearValue;
  throttle?: number;
  brake?: number;
  abs?: boolean;
  tcs?: boolean;
  progress?: number;
  positionCurrent?: number;
  positionTotal?: number;
}

export interface TelemetryTrack {
  samples: TelemetrySample[];
  duration: number;
  rpmMax: number;
}

export interface TrackPoint {
  x: number;
  y: number;
  distance: number;
  t?: number;
}

export interface Track {
  points: TrackPoint[];
  totalLength: number;
}

export interface PlayerProfile {
  name: string;
}
