# Validation Summary: How to Implement Deduplication Strategies in Microservices

## Status
validated

## Post Type
Technical guide / implementation tutorial

## Technologies Covered
- TypeScript
- Node.js crypto module
- Express
- Redis and Redis Lua scripting
- ioredis
- PostgreSQL
- PostgreSQL `INSERT ... ON CONFLICT`
- PostgreSQL advisory locks
- Prometheus `prom-client`
- Bloom filters
- Event sourcing
- Microservice idempotency and message deduplication

## Sources Consulted
- Redis `SET` command documentation: https://redis.io/docs/latest/commands/set/
- Redis `SETEX` command documentation: https://redis.io/docs/latest/commands/setex/
- Redis Lua API reference: https://redis.io/docs/latest/develop/programmability/lua-api/
- ioredis README and API notes: https://github.com/redis/ioredis
- PostgreSQL `INSERT` documentation: https://www.postgresql.org/docs/current/sql-insert.html
- PostgreSQL `RETURNING` documentation: https://www.postgresql.org/docs/current/dml-returning.html
- PostgreSQL explicit locking documentation: https://www.postgresql.org/docs/current/explicit-locking.html
- PostgreSQL advisory lock documentation: https://www.postgresql.org/docs/current/explicit-locking.html
- node-postgres data type documentation: https://node-postgres.com/features/types
- prom-client README: https://github.com/siimon/prom-client
- Prometheus metric type documentation: https://prometheus.io/docs/concepts/metric_types/

## Issues Found
- The API idempotency request hash used `JSON.stringify(body, Object.keys(body).sort())`, which only reliably canonicalized a shallow set of property names and could omit nested fields. I changed it to recursively sort object keys before hashing so nested request bodies are included consistently.
- The Redis examples used `SETEX`, which Redis documentation marks as deprecated in favor of `SET` with the `EX` argument. I changed the Lua scripts and ioredis calls to use `SET ... EX`.
- The order repository used PostgreSQL's `xmax = 0` system-column behavior to distinguish inserts from conflict updates. I changed it to use PostgreSQL's documented `old` value in `RETURNING` for `INSERT ... ON CONFLICT DO UPDATE`.
- The event store snippet used `PoolClient` without importing it, which would fail TypeScript compilation. I added the missing import.
- The event store tried to use `FOR UPDATE` with `MAX(version)`, but PostgreSQL row-level locking applies to selected rows and aggregate results are not lockable rows. I replaced that with a transaction-level advisory lock for the aggregate stream and then read the current max version.
- The order repository returned PostgreSQL `DECIMAL` values directly into TypeScript `number` fields. I converted the returned `total_amount` and `price` values with `Number(...)` so the example matches its interfaces.
- The event loader always called `JSON.parse` on `payload` and `metadata`, but node-postgres parses `json/jsonb` values into JavaScript objects by default. I changed the loader to parse only string values.
- The Bloom filter false-positive comment gave a rate without stating the number of inserted items. I clarified that the approximate 0.8% rate applies around 100,000 inserted items for the listed filter size and hash count.

## Review Notes
The examples are now technically valid as illustrative production patterns. In a future revision, the post could add schema details for the event store, including unique constraints on `event_id` and on `(aggregate_id, aggregate_type, version)`, and could mention that exact end-to-end once-only effects still require coordinating external side effects such as payment provider calls.
