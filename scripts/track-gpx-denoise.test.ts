import assert from 'node:assert/strict';
import test from 'node:test';

import { denoiseGpsPoints } from '../src/data/gpsDenoise.ts';

test('denoiseGpsPoints removes isolated GPS spikes and sub-meter jitter', () => {
  const cleaned = denoiseGpsPoints([
    { lon: 121.000000, lat: 31.000000, t: 0 },
    { lon: 121.000100, lat: 31.000000, t: 1 },
    { lon: 121.000105, lat: 31.000900, t: 2 },
    { lon: 121.000200, lat: 31.000000, t: 3 },
    { lon: 121.000202, lat: 31.000003, t: 4 },
    { lon: 121.000300, lat: 31.000000, t: 5 },
  ]);

  assert.deepEqual(cleaned.map(p => p.t), [0, 1, 3, 5]);
});
