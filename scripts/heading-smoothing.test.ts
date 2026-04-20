import assert from 'node:assert/strict';
import test from 'node:test';

import { shortestAngleDeltaDeg, smoothAngleDeg } from '../src/util/heading.ts';

test('shortestAngleDeltaDeg crosses 360 degrees by the short path', () => {
  assert.equal(shortestAngleDeltaDeg(350, 10), 20);
  assert.equal(shortestAngleDeltaDeg(10, 350), -20);
});

test('smoothAngleDeg moves toward the target without overshooting', () => {
  const next = smoothAngleDeg(0, 90, 0.1, 0.2);
  assert.ok(next > 0);
  assert.ok(next < 90);
});

test('smoothAngleDeg keeps the current angle when no frame time has elapsed', () => {
  assert.equal(smoothAngleDeg(10, 90, 0, 0.2), 10);
});

test('smoothAngleDeg snaps when time jumps are too large', () => {
  assert.equal(smoothAngleDeg(0, 90, 2, 0.2), 90);
});
