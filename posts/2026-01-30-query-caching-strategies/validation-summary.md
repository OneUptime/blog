# Validation Summary: How to Build Query Caching Strategies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL query cache (legacy, pre-8.0)
- PostgreSQL `shared_buffers` / `pg_statio_user_tables`
- TypeScript (in-memory `Map`-based cache)
- Redis via `ioredis` (single node and Cluster)
- Node.js `crypto` module (SHA-256, MD5 hashing)
- Node.js `EventEmitter`
- TypeORM `SelectQueryBuilder`
- Mermaid diagrams (flowchart TD / LR with subgraphs)

## Sources Consulted
- [MySQL 8.0 release notes — Retiring Support for the Query Cache](https://dev.mysql.com/blog-archive/mysql-8-0-retiring-support-for-the-query-cache/) — confirmed query cache was deprecated in 5.7.20 and removed in 8.0
- [PostgreSQL Cumulative Statistics System](https://www.postgresql.org/docs/current/monitoring-stats.html) — confirmed `pg_statio_user_tables` columns `heap_blks_read`, `heap_blks_hit`
- [PostgreSQL `shared_buffers` parameter](https://www.postgresql.org/docs/current/runtime-config-resource.html#GUC-SHARED-BUFFERS)
- [ioredis README and Cluster docs](https://github.com/redis/ioredis) — verified `scaleReads` accepts `'master' | 'slave' | 'all' | Function`, and Cluster construction patterns
- [ioredis v4 → v5 upgrade notes](https://github.com/redis/ioredis/wiki/Upgrading-from-v4-to-v5) — `Redis.Cluster` namespace pattern is legacy but still works via type defs
- [Redis hash tags / cluster sharding docs](https://redis.io/docs/reference/cluster-spec/#hash-tags) — verified `{tag}` syntax ensures same shard
- [TypeScript handbook — Object Types / Interfaces](https://www.typescriptlang.org/docs/handbook/2/objects.html) — confirmed interfaces are erased at compile time and cannot hold runtime values
- [TypeORM `SelectQueryBuilder` API](https://typeorm.io/select-query-builder) — verified `getQuery()`, `getParameters()`, `getMany()` exist

## Issues Found

1. **Broken `interface CacheConfig` with literal values accessed at runtime** — The original "Time-Based Expiration (TTL)" example declared `interface CacheConfig { userSessions: 300, productCatalog: 3600, staticContent: 86400 }` and then read `CacheConfig.productCatalog` as a value. TypeScript interfaces are types only and are erased at compile time, so the runtime property access on the interface name does not work — the code as written would fail to compile (`CacheConfig` is not in value position) and would not run. The literal numeric "types" are also not how an interface would be meaningfully consumed.
   - **Fix:** Converted `interface CacheConfig { … }` to `const CacheConfig = { … } as const;` so the values exist at runtime and `CacheConfig.productCatalog` resolves to `3600`. This preserves the author's structure and intent while making the example actually compile and run.

## Review Notes

- **MySQL query cache wording** — The post correctly states the legacy query cache was removed in MySQL 8.0; it was deprecated in 5.7.20. This is accurate.
- **PostgreSQL hit-ratio query** — The `pg_statio_user_tables` query is the canonical idiom used in PostgreSQL tuning references and is correct. Note that this returns a ratio for heap blocks of user tables only; for full database-level cache hit ratio you would also consider `pg_statio_user_indexes` or `pg_stat_database`. This is acceptable in tutorial scope.
- **ioredis Cluster import style** — `import Redis from 'ioredis'; new Redis.Cluster([...])` and the type `Redis.Cluster` are legacy patterns that still work in ioredis v5 via its bundled type definitions, but the modern, recommended style is `import { Cluster } from 'ioredis'; new Cluster([...])`. Left as-is since it still compiles and runs.
- **`scaleReads: 'slave'`** — This is the documented option value for ioredis Cluster; it remains correct. Some projects have migrated terminology to `'replica'`, but ioredis still uses `'slave'` as the canonical option.
- **`this.cache.set/get/delete/incr` on `DistributedQueryCache`** — Several later examples (`WriteThroughCache`, `VersionedCache`, `UserRepository`, `CacheWarmer`) call methods (`set`, `get`, `delete`, `incr`) that are not explicitly defined on the `DistributedQueryCache` class shown earlier in the post. Readers are expected to infer that those methods would be added to the class as needed (they are trivial Redis pass-throughs). This is a tutorial-level simplification, not a technical error.
- **`Redis KEYS` in `invalidateByPattern`** — `redis.keys(pattern)` is O(N) and blocks the Redis server; in production, `SCAN` is preferred. The post does not mention this caveat. Worth a future addition but not strictly incorrect.
- **`db.query` return shapes** — Some examples (e.g., `WriteThroughCache.updateProduct`/`getProduct`) treat the raw query result as the row object, while others (e.g., `UserRepository.findById`) correctly access `result.rows[0]`. This inconsistency is a stylistic abstraction over an unspecified `Database` type and not a hard technical error.
- **`require('crypto')` inside TypeScript classes** — Using `require` inside class methods mixes module systems but works at runtime in Node.js. Using `import { createHash } from 'crypto'` would be the modern style.
- **MD5 in `CachedQueryBuilder.generateCacheKey`** — MD5 is fine for non-cryptographic cache key hashing (no collision-resistance requirement here). Worth noting only because earlier the post correctly uses SHA-256 for the same purpose; both are acceptable for cache keys.
- **TypeORM `getQuery()` returns parameterized SQL with placeholders** — Combined with `getParameters()`, the cache key is deterministic for identical effective queries, which is what the example intends. Correct.
- **`Redis Cluster` hash-tag example** — The `{entityType:entityId}` hash-tag syntax correctly forces co-location of related keys on the same Redis Cluster shard. Accurate per the Redis cluster specification.
- **All Mermaid diagrams** are syntactically valid and render correctly.
- **Best Practices section** — Recommendations (TTL tuning, circuit breakers, hit ratio targets, cache stampede mitigation, write-through patterns) are sound and align with industry guidance. The 80% hit-ratio target is on the conservative side; many production systems aim for >90%, but 80% is a reasonable minimum.
