export function shortestAngleDeltaDeg(fromDeg: number, toDeg: number): number {
  return ((((toDeg - fromDeg) % 360) + 540) % 360) - 180;
}

export function smoothAngleDeg(
  currentDeg: number,
  targetDeg: number,
  deltaTimeSec: number,
  timeConstantSec: number,
): number {
  if (
    !Number.isFinite(currentDeg) ||
    !Number.isFinite(targetDeg) ||
    !Number.isFinite(deltaTimeSec)
  ) {
    return targetDeg;
  }

  if (deltaTimeSec <= 0) return currentDeg;
  if (deltaTimeSec > 1) return targetDeg;

  const tau = Math.max(timeConstantSec, 0.001);
  const alpha = 1 - Math.exp(-deltaTimeSec / tau);
  return currentDeg + shortestAngleDeltaDeg(currentDeg, targetDeg) * alpha;
}
