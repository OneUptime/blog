# Validation Summary: How to Configure Read-Only Replicas in Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (replication, `replica-read-only` configuration directive)
- Node.js with ioredis library (basic connections and Sentinel mode)
- Python with redis-py library

## Sources Consulted
- Redis official documentation on replication: https://redis.io/docs/management/replication/
- Redis official documentation on `replica-read-only` directive: https://redis.io/docs/reference/configuration/
- ioredis documentation (Sentinel support and `role` option): https://github.com/redis/ioredis
- redis-py documentation: https://redis-py.readthedocs.io/

## Issues Found
1. **Unused `import time` in Python example**: The `time` module was imported but never used in the `read_with_fallback` function. Removed the unused import.
2. **Unused `max_staleness_seconds` parameter in Python example**: The `max_staleness_seconds=2` parameter was defined in `read_with_fallback` but never referenced in the function body. This was misleading since it suggested staleness-based logic that wasn't implemented. Removed the unused parameter to match the actual behavior (simple None-check fallback to primary).
3. **Incorrect statement in Summary section**: The summary stated "When read-only replicas are needed for specialized use cases, carefully isolate replica-local keys..." — this was logically inverted. You need to isolate keys when you *allow writes* to replicas (i.e., disable read-only mode), not when replicas are read-only. Changed to "When allowing writes to replicas for specialized use cases."

## Review Notes
- The ioredis Sentinel example uses `role: "slave"` which is the current valid option. ioredis has not yet adopted `role: "replica"` as an alternative, so this remains correct.
- The post correctly notes that `replica-read-only` was the directive name introduced in Redis 5.0 (replacing the older `slave-read-only`). The older directive name is not mentioned, which is fine since Redis 5+ is the relevant baseline.
- The replication lag section's fallback approach (check if value is None, then read from primary) is a simplistic pattern that only handles missing keys, not true staleness detection. This is acceptable for a blog tutorial but readers should be aware that real staleness detection would require comparing replication offsets or timestamps.
