import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'hud5-gpx-enrichment-api',
      configureServer(server) {
        server.middlewares.use('/api/enrich-gpx', async (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
          }

          try {
            const body = await readJsonBody(req);
            const gpxText = String(body.gpxText ?? '');
            const inputName = String(body.inputName ?? 'track.gpx');
            const coordinateSystem = String(body.coordinateSystem ?? 'wgs84');
            if (!gpxText.trim()) throw new Error('Missing gpxText');

            const { enrichGpxText } = await import('./scripts/enrich-gpx-with-osm.mjs');
            const result = await enrichGpxText(gpxText, {
              inputName,
              outDir: path.resolve(server.config.root, 'output'),
              coordinateSystem,
            });

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                geoJson: result.geoJson,
                paths: result.paths,
                pointCount: result.points.length,
                roadCount: result.roads.length,
              }),
            );
          } catch (error) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                error: error instanceof Error ? error.message : String(error),
              }),
            );
          }
        });
      },
    },
  ],
  server: { port: 5173 },
});

function readJsonBody(req: import('node:http').IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 20_000_000) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}
