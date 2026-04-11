# Validation Summary: How to Configure Redis Connection Pool Size

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (server-side connection management)
- Node.js with ioredis and generic-pool
- Python with redis-py (ConnectionPool)
- Go with go-redis v9
- Java with Jedis and Apache Commons Pool 2

## Sources Consulted
- redis-py source code (v7.0.1) — `ConnectionPool` class internals in `redis/connection.py`
- go-redis v9 source code — `Options` struct in `options.go`, `PoolStats` in `internal/pool/pool.go` (https://pkg.go.dev/github.com/redis/go-redis/v9#Options)
- ioredis documentation (https://github.com/redis/ioredis)
- generic-pool npm package API (https://github.com/coopernurse/node-pool)
- Jedis documentation (https://github.com/redis/jedis)
- Redis official documentation for `INFO clients`, `CLIENT LIST`, `CONFIG SET maxclients` (https://redis.io/docs/latest/commands/)
- Little's Law for connection pool sizing formula

## Issues Found

### 1. Incorrect redis-py internal attribute `pool._connections`
- **What was wrong:** The first Python example used `len(pool._connections)` to print current connections. The attribute `_connections` does not exist on redis-py's `ConnectionPool` class. This would raise an `AttributeError` at runtime.
- **What was changed:** Replaced `len(pool._connections)` with `pool._created_connections`, which is the integer counter tracking how many connections have been created by the pool.
- **Why:** Verified against redis-py v7.0.1 source code. The correct internal attributes are `_created_connections` (int), `_available_connections` (list), and `_in_use_connections` (set). The second Python example in the monitoring section already used these correctly.

### 2. Inconsistent pool size formula
- **What was wrong:** The formula included `/ Threads` at the end (`Pool Size = (Average Command Latency in ms / 1000) * Target Requests Per Second / Threads`), but the worked example omitted the division by threads and labeled the result "10 connections per thread." This was contradictory — if dividing by threads, the result is already per-thread; if not dividing, the result is total connections, not per-thread.
- **What was changed:** Removed `/ Threads` from the formula and changed "10 connections per thread" to "10 connections." The formula now correctly applies Little's Law: `Pool Size = latency (seconds) * throughput (RPS) = total concurrent connections needed`.
- **Why:** Little's Law states that concurrent connections needed = throughput x latency. A connection pool is typically shared across all threads in an application, so the total pool size is the relevant number. Dividing by threads is not part of the standard pool sizing derivation.

## Review Notes
- The post correctly notes that redis-py internal attributes (`_created_connections`, `_available_connections`, `_in_use_connections`) are private APIs. These may change between redis-py versions. A future improvement could mention this caveat.
- The Jedis example uses `setTimeBetweenEvictionRunsMillis(long)` which is deprecated in Apache Commons Pool 2.11.0+ in favor of `setTimeBetweenEvictionRuns(Duration)`. Both still work, but the Duration-based method is preferred for newer Jedis versions.
- The Node.js section correctly notes that ioredis uses a single connection by default and shows a manual pooling approach with generic-pool. This is accurate and a reasonable pattern.
- All Redis CLI commands (`INFO clients`, `CLIENT LIST`, `CONFIG SET maxclients`) are correct.
- The Go code with go-redis v9 was verified against v9.7.0 source — all field names (`PoolSize`, `MinIdleConns`, `MaxIdleConns`, `PoolTimeout`, `ConnMaxIdleTime`, `ConnMaxLifetime`) and `PoolStats` fields (`Hits`, `Misses`, `Timeouts`) are correct.
