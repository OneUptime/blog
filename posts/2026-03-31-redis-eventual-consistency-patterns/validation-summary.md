# Validation Summary: How to Implement Eventual Consistency Patterns with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (data structures: strings, hashes, lists; Lua scripting; SET with EX, RPUSH/LPOP, HINCRBY, HGETALL, DECRBY/INCRBY)
- Python (redis-py client library)
- Distributed systems patterns (eventual consistency, write-behind, LWW, read repair, version vectors, saga compensation)

## Sources Consulted
- Redis SET command documentation: https://redis.io/commands/set
- Redis EVAL (Lua scripting) documentation: https://redis.io/commands/eval
- Redis HINCRBY documentation: https://redis.io/commands/hincrby
- Redis HGETALL documentation: https://redis.io/commands/hgetall
- redis-py library API reference: https://redis-py.readthedocs.io/
- Version vector theory (Wikipedia / distributed systems literature) for correctness of concurrency detection logic

## Issues Found
1. **Bug in `is_concurrent_update` — wrong iteration domains**: The function iterated over `version_b` keys for the `a_dominates` check and over `version_a` keys for the `b_dominates` check. This fails when version vectors have non-overlapping keys (e.g., updates from different nodes). For example, `version_a = {"node1": 2}` vs `version_b = {"node3": 1}` are concurrent (neither dominates), but the original code returned `False` because it never checked the keys where each vector was actually greater. **Fix:** Changed both checks to iterate over `set(version_a) | set(version_b)` (the union of all keys), which correctly detects concurrency regardless of key overlap.

## Review Notes
- The `update_with_version` function has a race condition between `HINCRBY` and `HGETALL` (another client could modify the hash between these calls). In production, this should use a Lua script for atomicity. Acceptable for a conceptual tutorial.
- The version hash key (`entity:{id}:version`) has no expiration, while the entity data key expires after 3600 seconds. In production, the version key should also be expired to avoid orphaned metadata.
- The `write_behind_update` function mutates the input `data` dict by adding `updated_at`. Callers should be aware of this side effect.
- The `db` object used across examples is assumed but never defined — this is fine for illustrative purposes.
