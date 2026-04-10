# Validation Summary: How to Build a Service Dependency Tracker with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (sets and hashes)
- Python (redis-py client library)
- Service dependency graph modeling
- Health status propagation

## Sources Consulted
- Redis SADD documentation: https://redis.io/commands/sadd/ — O(1) per element added
- Redis SMEMBERS documentation: https://redis.io/commands/smembers/ — O(N) where N is set cardinality
- Redis HSET documentation: https://redis.io/commands/hset/ — confirms `mapping` parameter support
- Redis HGET documentation: https://redis.io/commands/hget/
- Redis HGETALL documentation: https://redis.io/commands/hgetall/ — returns empty dict for non-existent keys in redis-py
- redis-py documentation: https://redis-py.readthedocs.io/en/stable/

## Issues Found
- **Incorrect complexity claim in summary**: The summary stated "Redis sets map bidirectional service relationships for O(1) lookups." The code uses `SMEMBERS` for all retrievals, which is O(N) where N is the number of members in the set, not O(1). Only `SADD` (insertion) and `SISMEMBER` (membership check, not used in this post) are O(1). Fixed to: "Redis sets map bidirectional service relationships with O(1) insertion and O(N) retrieval via `SMEMBERS`."

## Review Notes
- The `get_blast_radius` function issues one `SMEMBERS` call per node visited during traversal. For large dependency graphs, this could result in many round-trips to Redis. A Lua script or Redis pipeline could reduce this, but for a tutorial this approach is clear and correct.
- The `hgetall` fallback pattern (`or {"status": "unknown"}`) works because redis-py returns an empty dict for non-existent keys, which is falsy in Python. This is correct but somewhat subtle.
- The graph traversal correctly handles cycles via the `affected` set, preventing infinite loops in circular dependency scenarios.
