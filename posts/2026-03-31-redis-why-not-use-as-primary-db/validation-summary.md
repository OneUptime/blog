# Validation Summary: Why You Should Not Use Redis as Primary Database Without Persistence

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis (in-memory data store)
- Redis RDB persistence (snapshotting)
- Redis AOF persistence (append-only file)
- Python redis-py client library
- Redis CLI and configuration

## Sources Consulted
- Redis official persistence documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Redis eviction policies documentation: https://redis.io/docs/latest/develop/reference/eviction/
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/
- redis-py library API (bgsave, bgrewriteaof, info methods)

## Issues Found

### Issue 1: Incorrect AOF description — "point-in-time recovery"
- **What was wrong:** AOF was described as providing "point-in-time recovery." AOF is a durable write-ahead log that replays commands on restart. It is RDB that provides point-in-time snapshots.
- **What was changed:** Changed the AOF description from "Logs every write command for point-in-time recovery" to "Logs every write command and replays them on restart for durability."
- **Why:** The term "point-in-time recovery" is associated with RDB snapshots or traditional database PITR mechanisms. AOF provides durability by logging and replaying every write operation.

### Issue 2: Wrong maxmemory-policy for a primary database
- **What was wrong:** The "Minimum Production Config" section recommended `maxmemory-policy allkeys-lru`. This policy silently evicts least-recently-used keys from the entire keyspace when memory is full — causing silent data loss, which directly contradicts the goal of the post (preventing data loss).
- **What was changed:** Changed `maxmemory-policy allkeys-lru` to `maxmemory-policy noeviction`.
- **Why:** For a primary database, `noeviction` is the correct policy. It returns errors on new writes when memory is full, preserving all existing data. Silent eviction via `allkeys-lru` is appropriate for caches, not primary data stores.

## Review Notes
- The claim "By default, Redis has persistence disabled in many configurations" is technically defensible due to the "in many configurations" qualifier (Docker images, container deployments often disable persistence), but Redis itself ships with RDB persistence enabled by default. Readers may find this slightly misleading.
- The RDB save rules shown (`save 900 1`, `save 300 10`, `save 60 10000`) are the pre-Redis 7 defaults. Redis 7+ changed these to `save 3600 1`, `save 300 100`, `save 60 10000`. The post doesn't claim these are defaults, so this is not an error, but version-aware readers may notice.
- The `check_persistence()` function's `rdb_enabled` check (`rdb_last_bgsave_status != "err"`) is a heuristic — it checks whether the last bgsave succeeded, not whether RDB is configured. A server with persistence disabled would still show `"ok"` if no bgsave was ever attempted. This is a limitation but not strictly incorrect.
- The production config omits `save 900 1` (or `save 3600 1`), meaning a single key change in a low-traffic period would never trigger an RDB save. For a primary database, adding a long-interval catch-all save rule would be safer.
- All Python redis-py method calls (`info("persistence")`, `bgsave()`, `bgrewriteaof()`) and INFO field names are correct and current.
