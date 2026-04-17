# Validation Summary: How to Build an API Layer Over ClickHouse Data

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (analytical database)
- @clickhouse/client (official Node.js client, 1.x)
- Express.js
- node-redis (v4+)
- REST API design, parameterized queries, API key auth

## Sources Consulted
- @clickhouse/client GitHub repo and README — https://github.com/ClickHouse/clickhouse-js
- ClickHouse JavaScript client docs — https://clickhouse.com/docs/integrations/language-clients/javascript
- Parameter binding example — https://github.com/ClickHouse/clickhouse-js/blob/main/examples/query_with_parameter_binding.ts
- node-redis repo and README — https://github.com/redis/node-redis
- node-redis SETEX source — packages/client/lib/commands/SETEX.ts

## Issues Found
1. **`host` config option is deprecated/removed in @clickhouse/client 1.x.** The README used `createClient({ host: '...' })`, but the current API requires `url`. Changed `host:` to `url:` (and renamed the env var `CLICKHOUSE_HOST` → `CLICKHOUSE_URL` for consistency).
2. **Missing `redis.connect()` call.** node-redis v4+ does not auto-connect; calling commands without first invoking `.connect()` will fail. Added `redis.connect();` immediately after `createClient(...)` so the example runs as written.

## Review Notes
- Query-parameter binding syntax `{name:Type}` and the `query_params` field are correct per the official parameter-binding example.
- `await result.json()` on a `ResultSet` returned by `client.query({ ..., format: 'JSONEachRow' })` is the documented pattern.
- `redis.setEx(key, seconds, value)` signature is correct in node-redis v4/v5.
- The Express API key middleware pattern is standard; in production, the comparison should ideally use `crypto.timingSafeEqual` to avoid timing attacks, but the shown strict-equality form is not technically incorrect. Not modified since it is not a technical error.
- For robustness, the `redis.connect()` call should typically be awaited inside an async bootstrap and errors handled, but the minimal example as written will work; left as-is to preserve the author's concise style.
