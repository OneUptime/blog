# Validation Summary: What Does 'LOADING Redis is loading the dataset' Mean in Redis

## Status
validated

## Post Type
Troubleshooting Guide / Tutorial

## Technologies Covered
- Redis (server behavior during startup, persistence mechanisms)
- Redis CLI (`redis-cli`, `INFO` command)
- Python redis-py library (`redis.exceptions.BusyLoadingError`)
- Node.js ioredis library (`enableReadyCheck`, `retryStrategy`)
- Kubernetes readiness probes
- Redis configuration (`redis.conf` directives)

## Sources Consulted
- Redis official persistence documentation — https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Redis PING command documentation — https://redis.io/docs/latest/commands/ping/
- Redis INFO command documentation — https://redis.io/docs/latest/commands/info/
- Redis command flags and `ok-loading` behavior (Redis source code command table)
- redis-py exceptions module — https://github.com/redis/redis-py/blob/master/redis/exceptions.py
- ioredis documentation on `enableReadyCheck` behavior
- Kubernetes probe configuration documentation

## Issues Found

### 1. Incorrect claim about `aof-use-rdb-preamble` determining which file to load (line 27)
**What was wrong:** The post stated "Both RDB and AOF are enabled and Redis is loading whichever is configured via `aof-use-rdb-preamble`". This is incorrect — `aof-use-rdb-preamble` does not determine which file Redis loads at startup. When both RDB and AOF persistence are enabled, Redis always prioritizes loading from the AOF file because it is guaranteed to be the most complete. The `aof-use-rdb-preamble` option controls the *format* of the AOF file during rewrites (whether the AOF base uses RDB binary format for faster loading), not which persistence file to load.
**What was changed:** Replaced with "Both RDB and AOF are enabled — Redis prioritizes loading from the AOF file since it is guaranteed to be the most complete".

### 2. `rdbchecksum yes` incorrectly listed as a loading time optimization (lines 143-146)
**What was wrong:** The section "Use RDB with Compression" included `rdbchecksum yes` alongside `rdbcompression yes` with the framing of reducing file size and I/O. However, `rdbchecksum` enables CRC64 checksum verification at the end of the RDB file, which adds approximately 10% CPU overhead during both saving and loading (per Redis documentation). It does not reduce file size or I/O — it is a data integrity feature, not a performance optimization.
**What was changed:** Removed `rdbchecksum yes` from the configuration snippet and adjusted the description to focus on compression reducing disk I/O during loading.

## Review Notes
- The PING command does NOT have the `ok-loading` flag in Redis, meaning it correctly returns the LOADING error during dataset loading. This makes the bash monitoring script, Python retry code, and Kubernetes readiness probe all technically correct in their approach of using PING to detect loading state.
- The `redis.exceptions.BusyLoadingError` exception class is correctly named and used in the Python example.
- The ioredis `enableReadyCheck: true` behavior description is accurate — ioredis uses the INFO command (which IS allowed during loading via the `ok-loading` flag) to check `loading:0` before emitting the `ready` event.
- The `repl-diskless-load on-empty-db` value is valid. The section heading "Pre-warm with diskless replication" conflates diskless sync (primary-side, `repl-diskless-sync`) with diskless load (replica-side, `repl-diskless-load`), but the configuration directive and value are correct.
- The `rdbchecksum yes` option is good practice for data integrity and could be mentioned in a separate context, but it does not belong in a section focused on reducing loading time.
