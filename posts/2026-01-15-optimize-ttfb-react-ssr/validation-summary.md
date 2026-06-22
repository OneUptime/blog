# Validation Summary: How to Optimize Time to First Byte (TTFB) in React SSR Apps

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- React 18 server-side rendering (`renderToString`, `renderToPipeableStream`)
- TypeScript
- Express (middleware, response interception)
- Node.js (`cluster`, `process.hrtime`, `zlib`, `http`/`https` agents)
- `lru-cache` (in-memory caching)
- `ioredis` (Redis distributed caching)
- `pg` (PostgreSQL connection pooling and query caching)
- Web Performance APIs (`PerformanceObserver`, `PerformanceNavigationTiming`, Server-Timing)
- HTTP caching / CDN edge caching (Cache-Control, Surrogate-Key, Fastly purge API)

## Sources Consulted
- React DOM server APIs — https://react.dev/reference/react-dom/server (renderToPipeableStream, renderToString)
- lru-cache npm package (v10/v11) — https://www.npmjs.com/package/lru-cache (named export `LRUCache`)
- MDN PerformanceNavigationTiming — https://developer.mozilla.org/en-US/docs/Web/API/PerformanceNavigationTiming (responseStart, requestStart)
- MDN Server-Timing header — https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Server-Timing
- Node.js cluster docs (`cluster.isPrimary`) — https://nodejs.org/api/cluster.html
- Node.js process.hrtime.bigint — https://nodejs.org/api/process.html
- node-postgres (pg) Pool docs — https://node-postgres.com/apis/pool
- ioredis docs — https://github.com/redis/ioredis
- web.dev TTFB / Core Web Vitals — https://web.dev/articles/ttfb
- Cross-referenced lru-cache import convention used consistently across other posts in this blog

## Issues Found
- **Incorrect `lru-cache` import (3 occurrences):** The post used `import LRUCache from 'lru-cache';` (default import). The default export was removed in lru-cache v10 (Aug 2023); the current v10/v11 API exposes the class only as a named export. The default import would fail at runtime/compile time on any current version. Changed all three occurrences to `import { LRUCache } from 'lru-cache';`. The existing type annotations (`LRUCache<string, CachedPage>`, etc.) and `new LRUCache(...)` calls are already compatible with the named import and required no further changes. This also aligns the post with the import convention used consistently across the rest of the blog.

## Review Notes
- TTFB measurement via `navigationEntry.responseStart - navigationEntry.requestStart` is correct per the Navigation Timing spec.
- `cluster.isPrimary` (rather than the deprecated `isMaster`) and `process.hrtime.bigint()` are current, correct APIs.
- The manual streaming pattern that writes `htmlStart` in `onShellReady`, calls `pipe(res)`, then writes `htmlEnd` in `onAllReady` is a commonly-taught illustration but is fragile in practice: `pipe()` can end the destination stream, so manually appending closing markup afterward can be unreliable. The more robust approach is to render the full `<html>` document inside the React tree or to insert closing tags via a Transform stream. Left as-is since it is illustrative, widely used in tutorials, and not strictly incorrect.
- `use(loader())` in the `AsyncData` example relies on React's `use` hook (stable in React 19, available in React 18 canary) and creates a new promise per render; it is illustrative rather than production-ready, and the post also provides a `createResource` Suspense alternative. No change needed.
- Minor: `QueryResult` is imported from `pg` but not used, and `pg`'s `rowCount` is typed as `number | null`, which could trip strict TypeScript. These are cosmetic and do not affect correctness; left unchanged to avoid stylistic edits.
- The Fastly purge example and Surrogate-Key usage are accurate representations of those vendor features.
