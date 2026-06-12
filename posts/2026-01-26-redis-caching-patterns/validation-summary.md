# Validation Summary: How to Build Redis Caching Patterns

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis
- ioredis
- redis-py
- Node.js
- Python
- PostgreSQL
- node-postgres
- psycopg2
- Mermaid diagrams

## Sources Consulted
- Redis SET command documentation: https://redis.io/docs/latest/commands/set/
- Redis SCAN command documentation: https://redis.io/docs/latest/commands/scan/
- Redis keyspace documentation, including KEYS warning: https://redis.io/docs/latest/develop/using-commands/keyspace/
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/
- Redis pipelining and transactions documentation: https://redis.io/docs/latest/develop/clients/redis-py/transpipe/
- ioredis official repository and usage examples: https://github.com/redis/ioredis
- redis-py guide: https://redis.io/docs/latest/develop/clients/redis-py/
- node-postgres parameterized query documentation: https://node-postgres.com/features/queries
- PostgreSQL array and ANY comparison documentation: https://www.postgresql.org/docs/current/functions-comparisons.html
- PostgreSQL aggregate FILTER documentation: https://www.postgresql.org/docs/current/sql-expressions.html
- PostgreSQL aggregate tutorial: https://www.postgresql.org/docs/current/tutorial-agg.html
- psycopg2 usage and parameter binding documentation: https://www.psycopg.org/docs/usage.html
- Node.js EventEmitter documentation: https://nodejs.org/api/events.html

## Issues Found
- The cache-aside Node.js example claimed graceful Redis fallback but checked `error.message.includes('Redis')`, which is unreliable. I separated Redis read/write errors from database errors so Redis failures fall back to PostgreSQL while database errors still propagate.
- The ioredis client comment described connection pooling. ioredis creates a Redis client connection, not a PostgreSQL-style pool, so I corrected the comment.
- The Python batch cache comment said fetched users were cached with `MSET`, but the code used pipelined `SETEX` calls to preserve TTLs. I corrected the comment.
- The write-through description and comments said writes happened simultaneously and that `createProduct` wrote to cache first, while the code wrote to PostgreSQL first and then populated Redis. I corrected the wording and diagram to match the implementation.
- The write-through dynamic update query interpolated arbitrary field names from `updates`, creating an SQL injection risk. I added an allowlist for permitted product columns before interpolating identifiers.
- The write-behind database table name was derived directly from the cache key, creating an SQL injection risk through dynamic identifiers. I added a `tableMap` option and fail-fast validation for unknown entity types.
- The write-behind Mermaid sequence showed Redis adding an item to the queue, but the application code enqueues it. I corrected the diagram.
- The read-through order loader used `json_agg` over a `LEFT JOIN`, which can return a single object with null fields for orders with no items. I added `FILTER` and `COALESCE` so empty orders return an empty JSON array.
- The event invalidation example used Redis `KEYS` in application code. I replaced it with cursor-based `SCAN` to avoid blocking Redis on large keyspaces.
- The event invalidation helper used `EventEmitter.emit()` with async listeners but did not wait for invalidation handlers to complete. I changed it to call registered listeners and await them with `Promise.all`.
- The event invalidation usage snippet contained placeholder JavaScript syntax (`[productId, ...]`) and returned the raw query result instead of a row. I replaced it with syntactically valid parameterized SQL and row handling.
- The probabilistic early expiration formula decreased refresh probability as expiry approached, contradicting the explanation. I changed it so refresh probability increases as remaining TTL decreases.
- The latency metrics comment said the sorted set was for percentiles, but the score stores timestamps for retention. I corrected the comment to describe recent latency samples.
- The metrics wrapper presented duration-based hit/miss detection as definitive. I changed the comment to state that it is an approximation when the cache implementation does not expose hit/miss status directly.

## Review Notes
The examples are illustrative and still assume compatible database schemas, Redis availability, and appropriate production hardening around retries, dead-letter queues, migrations, and observability. The remaining Redis and PostgreSQL APIs used are current and consistent with the official documentation consulted.
