# Validation Summary: How to Cache Database Queries with Redis

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Redis
- redis-py
- node-redis
- SQLAlchemy
- Knex.js
- PostgreSQL / MySQL query patterns
- Python
- Node.js
- JSON, MessagePack, and pickle serialization
- Prometheus client metrics

## Sources Consulted
- Redis SET command documentation: https://redis.io/docs/latest/commands/set/
- Redis SETEX command documentation: https://redis.io/docs/latest/commands/setex/
- Redis KEYS command documentation: https://redis.io/docs/latest/commands/keys/
- Redis SCAN command documentation: https://redis.io/docs/latest/commands/scan/
- redis-py command documentation: https://redis.readthedocs.io/en/stable/commands.html
- redis-py scan iteration documentation: https://redis.io/docs/latest/develop/clients/redis-py/scaniter/
- node-redis guide: https://redis.io/docs/latest/develop/clients/nodejs/
- node-redis migration / scanIterator documentation: https://redis.io/docs/latest/develop/clients/nodejs/migration/
- SQLAlchemy 2.x connection and execution documentation: https://docs.sqlalchemy.org/en/21/core/connections.html
- Knex query builder documentation: https://knexjs.org/guide/query-builder.html
- Python pickle documentation: https://docs.python.org/3/library/pickle.html
- MessagePack documentation: https://msgpack.org/

## Issues Found
- Replaced Redis `SETEX` usage with `SET` plus expiration options in Python and Node.js examples. Redis documents `SETEX` as deprecated in favor of `SET` with `EX`.
- Changed the Node.js snippet from CommonJS `require()` plus top-level `await` to ESM imports, matching current node-redis examples and avoiding invalid CommonJS syntax.
- Replaced pattern invalidation with `scanIterator()` in the Node.js example instead of `KEYS`, because Redis warns against using `KEYS` in regular application code.
- Fixed the Node.js product update invalidation example. It previously invalidated a cache key built from incomplete parameters, so it would not match the cached `products_by_category` entries.
- Fixed repository invalidation for category listings. It previously deleted `query:products_by_category:{category_id}`, while cached entries include `:{limit}` as well.
- Wrapped a raw SQL string in SQLAlchemy `text()` for the `db.execute()` example, consistent with SQLAlchemy 2.x textual SQL usage.
- Corrected the `WriteThoughQueryCache` typo to `WriteThroughQueryCache`.
- Updated the write-through example to fetch the fresh product after the database update instead of potentially re-reading a stale cached value.
- Fixed the stale-while-revalidate example so Redis retains stale data for `stale_ttl`, not `ttl * 2`, which contradicted the sample values.
- Narrowed the stale-while-revalidate cache-stampede claim to clarify that the in-memory revalidation guard only applies within a single process.

## Review Notes
The examples are illustrative and assume surrounding application objects such as `db`, `knex`, `Product`, and fetch helpers exist. For production use, the invalidation examples would need to account for multi-process coordination, transaction boundaries, and workload-specific key cardinality.
