# Validation Summary: How to Implement Multi-Datacenter Cache Consistency with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (replication, Pub/Sub, Lua scripting)
- Python (redis-py client library)
- Redis CLI commands (INFO replication, REPLICAOF)

## Sources Consulted
- Redis documentation on replication: https://redis.io/docs/management/replication/
- Redis documentation on Pub/Sub: https://redis.io/docs/interact/pubsub/
- Redis documentation on EVAL / Lua scripting: https://redis.io/docs/interact/programmability/eval-intro/
- Redis documentation on INFO command: https://redis.io/commands/info/
- redis-py client library documentation: https://redis-py.readthedocs.io/

## Issues Found

### 1. Cross-DC invalidation listener deletes locally-written keys (Option B)
**What was wrong:** The `start_invalidation_listener` function processes all invalidation events, including those originating from the local DC. Since `write_with_invalidation` publishes to every DC (including the origin), the local listener would immediately delete the key that was just written, effectively nullifying the write.

**What was changed:** Added an origin check in the listener (`if event["origin"] == local_dc: continue`) to skip invalidation events that originated from the local DC, since the local DC already has the fresh data.

**Why:** Without this fix, every write would be immediately followed by a self-inflicted delete, making the cache unusable.

### 2. Split-brain write handler has a race condition (TOCTOU)
**What was wrong:** The `write_with_version` function used a non-atomic GET-then-SET pattern to check timestamps before writing. Between the GET and SET, another concurrent client could write a newer value, which would then be overwritten by the stale data. For a section specifically about handling split-brain scenarios, this race condition undermines the entire approach.

**What was changed:** Replaced the Python GET/SET logic with a Redis Lua script (`EVAL`) that atomically reads the existing timestamp, compares it, and conditionally writes. Lua scripts in Redis execute atomically, eliminating the race condition.

**Why:** Atomic check-and-set is essential for correct conflict resolution under concurrent writes, which is exactly the scenario split-brain handling must address.

## Review Notes
- The `dict | None` return type annotation in `read_data_west` requires Python 3.10+. This is fine but worth noting for readers on older Python versions.
- The Option B code block does not include `import redis` — it relies on the import from the earlier Option A block. This is standard blog practice but could confuse readers copying only that block.
- Redis Pub/Sub is fire-and-forget with no persistence. In a real multi-DC setup, a more durable message bus (e.g., Kafka, NATS) would be more reliable for cross-DC invalidation. The post does mention "message queue" as an alternative, which is appropriate.
- The `replicaof` directive and `REPLICAOF` command are correct for Redis 5.0+. The older `slaveof`/`SLAVEOF` forms still work but are deprecated.
