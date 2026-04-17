# Validation Summary: How to Use ClickHouse with Express.js

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree, DateTime64, LowCardinality, parameterized queries, CSV/JSONEachRow formats)
- `@clickhouse/client` (official Node.js client)
- Express.js (Router, middleware, error handler)
- TypeScript (tsconfig, types for Request/Response)
- Node.js streams (piping to HTTP response)

## Sources Consulted
- ClickHouse JavaScript client docs: https://clickhouse.com/docs/integrations/javascript
- `@clickhouse/client` repo + README: https://github.com/ClickHouse/clickhouse-js
- npm package `@clickhouse/client` and `@clickhouse/client-web`
- ClickHouse SQL reference (MergeTree, DateTime64, LowCardinality, parameterized query syntax `{name:Type}`)
- Express.js 4 docs (`express.json`, Router, error-handling middleware)

## Issues Found

1. **Incorrect browser-support claim.** The intro stated that `@clickhouse/client` "supports both Node.js and browser environments." In fact, `@clickhouse/client` is Node.js-only; the separate `@clickhouse/client-web` package targets browsers, Cloudflare Workers, and other Web Streams environments. Rewrote the sentence to clarify this and mention `@clickhouse/client-web` as the browser-side option.

2. **Incorrect CSV export route.** The original code used `client.query({ ..., query: "... FORMAT CSV", format: "CSV" })` and then `result.stream().pipe(res)`. Two problems:
   - Embedding `FORMAT CSV` in the SQL while also passing `format: "CSV"` is redundant and discouraged by the official docs ("Don't specify the FORMAT clause in `query`, use `format` parameter instead") — it can produce a duplicated `FORMAT ... FORMAT ...` clause and a ClickHouse syntax error.
   - `result.stream()` from `client.query()` returns an object-mode Readable that emits `Row[]` chunks (each `Row` exposes `.text` / `.json()`), not a byte stream. Piping that directly into an Express `res` fails because `res` expects `Buffer`/`string`, not objects.
   Switched to `client.exec({ query, query_params })`, which returns `{ stream }` where `stream` is a raw byte `Stream.Readable` from the HTTP response and is safe to `.pipe(res)`. Kept the `FORMAT CSV` clause inside the SQL (required with `exec()`, which has no `format` option).

3. **Incorrect "Streaming Large Results" example.** Same underlying bug as (2): `result.stream().pipe(res)` on a `query()` result is object-mode and won't pipe to an HTTP response. Replaced with `client.exec()` to get the raw byte stream, and added a short note explaining the distinction between `client.query().stream()` (object-mode `Row[]` chunks) and `client.exec()` (raw bytes).

## Review Notes

- `client.ping()` returns a discriminated union `{ success: true } | { success: false, error: Error }`. The post uses `result.success`, which is correct; failures are returned rather than thrown, so the `ping()` helper surfaces "degraded" without crashing. No change needed.
- Parameterized query syntax `{name:Type}` with `query_params: { name: value }` matches the current docs exactly.
- `createClient` option names (`url`, `username`, `password`, `database`, `request_timeout`, `compression`, `clickhouse_settings`) are all current. Historical note: very old versions used `host`; current releases use `url`.
- `client.insert({ table, values, format })` with `values` as an array of plain objects and `format: "JSONEachRow"` is the documented pattern.
- `ts: new Date().toISOString().replace("T", " ").slice(0, 23)` produces e.g. `2026-03-31 12:34:56.789`, which is accepted by `DateTime64(3)`.
- `import { json } from "express"` is valid — `express` exports the `json` middleware factory as a named export (it re-exports from body-parser in Express 4.16+).
- The error-handling middleware signature `(err, req, res, next)` with all four parameters is correct; Express requires arity 4 to recognize it as an error handler.
- The schema uses `ORDER BY (event_type, user_id, ts)`; this is a reasonable sort key for the queries shown (most filter on `event_type` first). Worth flagging to readers as a schema-design choice rather than a one-size-fits-all recommendation, but not a technical error.
- Minor future-proofing: consumers may prefer `express.json()` directly over destructuring `json` — stylistic only, not wrong.
