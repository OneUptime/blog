# Validation Summary: How to Create Directory-Based Sharding

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Directory-based database sharding
- PostgreSQL SQL schemas, indexes, and `INSERT ... ON CONFLICT`
- Python
- psycopg2
- Redis caching
- CockroachDB and TiDB high availability concepts
- Shard migration and rebalancing patterns

## Sources Consulted
- PostgreSQL `INSERT` documentation: https://www.postgresql.org/docs/current/sql-insert.html
- PostgreSQL high availability, load balancing, and replication documentation: https://www.postgresql.org/docs/current/high-availability.html
- psycopg2 SQL composition documentation: https://www.psycopg.org/docs/sql.html
- Redis `SET` command documentation: https://redis.io/docs/latest/commands/set/
- Redis `SETEX` command documentation: https://redis.io/docs/latest/commands/setex/
- CockroachDB replication layer documentation: https://www.cockroachlabs.com/docs/stable/architecture/replication-layer
- TiDB architecture documentation: https://docs.pingcap.com/tidb/stable/tidb-architecture/

## Issues Found
- The Redis cache population used `setex`. Redis documents `SET` with expiration options as the current replacement pattern, so the example now uses `self.cache.set(cache_key, shard_id, ex=self.cache_ttl)`.
- The router examples later called `_connect_to_shard`, but the method was not defined on `ShardRouter`. Added a small helper method so the examples are internally consistent.
- The `assign_shard` example could fail with unclear errors when no active shards existed or when all active shard weights were zero or negative. Added explicit runtime checks.
- The `assign_shard` upsert updated the shard mapping without updating `updated_at` and without invalidating a possible stale cache entry. Updated the upsert to use `EXCLUDED.shard_id`, refresh `updated_at`, and delete the cache key after commit.
- The `UserService` examples called `self._connect_to_shard`, which was not defined on `UserService`. Updated them to use the router helper.
- The migration example interpolated table names directly with f-strings and used `INSERT INTO ... VALUES %s`, which is not a safe or valid general psycopg2 pattern for dynamic identifiers and row values. Updated it to use `psycopg2.sql.Identifier`, `sql.SQL`, and generated placeholders for the copied row.
- The migration example did not handle missing directory entries or missing source rows before using the returned values. Added early returns for those cases and closed cursors opened by the example.

## Review Notes
The post is technically relevant and the corrected examples are syntactically valid Python. The migration flow remains a simplified teaching example; a production migration system would also need stronger concurrency controls, explicit column lists, transaction boundaries across copy/switch/delete phases, and handling for writes that occur during migration.
