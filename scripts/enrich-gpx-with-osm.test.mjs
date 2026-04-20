import assert from 'node:assert/strict';
import test from 'node:test';

import { buildGeoJsonFeatureCollection } from './enrich-gpx-with-osm.mjs';

test('buildGeoJsonFeatureCollection emits project layer kinds', () => {
  const points = [
    { idx: 0, lat: 36.65, lon: 117.05, ele: '90', time: '2023-07-14T15:00:42.000Z' },
    { idx: 1, lat: 36.651, lon: 117.051, ele: '91', time: '2023-07-14T15:00:43.000Z' },
  ];
  const roads = [
    {
      id: '100',
      tags: { highway: 'cycleway', name: 'Bike Road' },
      coords: [
        { lat: 36.65, lon: 117.05 },
        { lat: 36.651, lon: 117.051 },
      ],
    },
  ];
  const enriched = [
    {
      point_index: 0,
      time: points[0].time,
      lat: '36.65000000',
      lon: '117.05000000',
      nearest_way_id: '100',
      nearest_way_distance_m: '0.00',
      osm_name: 'Bike Road',
      osm_highway: 'cycleway',
    },
    {
      point_index: 1,
      time: points[1].time,
      lat: '36.65100000',
      lon: '117.05100000',
      nearest_way_id: '100',
      nearest_way_distance_m: '0.00',
      osm_name: 'Bike Road',
      osm_highway: 'cycleway',
    },
  ];

  const geo = buildGeoJsonFeatureCollection(points, enriched, roads, 'https://example.test/osm');

  assert.equal(geo.features[0].properties.kind, 'driven');
  assert.deepEqual(geo.features[0].properties.coordinateProperties.times, [
    '2023-07-14T15:00:42.000Z',
    '2023-07-14T15:00:43.000Z',
  ]);
  assert.equal(geo.features[1].properties.kind, 'reference');
  assert.equal(geo.features[1].properties.highway, 'cycleway');
});
