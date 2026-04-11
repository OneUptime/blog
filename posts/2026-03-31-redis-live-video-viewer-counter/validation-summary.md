# Validation Summary: How to Build a Live Video Viewer Counter with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Sets, Sorted Sets, Pub/Sub, Pipelines, Key Expiration)
- Python (redis-py client library)

## Sources Consulted
- redis-py official documentation: https://redis-py.readthedocs.io/en/stable/
- Redis SET commands documentation: https://redis.io/docs/latest/commands/?group=set
- Redis ZRANGE documentation: https://redis.io/docs/latest/commands/zrange/
- Redis Pub/Sub documentation: https://redis.io/docs/latest/commands/?group=pubsub
- Redis EXPIRE documentation: https://redis.io/docs/latest/commands/expire/

## Issues Found

1. **Unused `threading` import**: The setup code block imported `threading` but it was never used in any code example. Removed the unused import.

2. **Misleading summary claim about automatic stale session removal**: The summary stated "Heartbeat-based presence with short TTLs automatically removes stale sessions without any scheduled cleanup jobs." This was inaccurate — the TTL is set on the entire set key (via `EXPIRE`), not on individual set members. Redis sets do not support per-member expiration. If any viewer heartbeats or joins, the whole set's TTL resets, meaning individual stale sessions (viewers who disconnected without calling `viewer_leave`) remain in the set indefinitely as long as other activity continues. Rewrote the summary to accurately describe this behavior and note the limitation.

## Review Notes

- **Race condition in `update_peak_viewers`**: The function uses a non-atomic GET-then-SET pattern. Under concurrent calls, two processes could read the same peak value and both attempt to set a new peak, potentially losing an update. A Lua script or `WATCH`/`MULTI`/`EXEC` transaction would make this atomic. Acceptable for a tutorial but worth noting for production use.
- **Design limitation — no per-member expiration in sets**: The fundamental design uses Redis Sets which don't support per-member TTLs. For production systems needing individual session timeout, a Sorted Set with timestamps as scores and periodic cleanup (or per-session keys with TTLs) would be more robust. This is an inherent limitation of the chosen approach, not a code bug.
- **`zrange` with `desc=True`**: Requires redis-py >= 4.2.0 and Redis >= 6.2. This is correct for modern versions but would not work on older installations. The post does not specify version requirements.
- All other Redis commands (`SADD`, `SREM`, `SCARD`, `SISMEMBER`, `EXPIRE`, `ZADD`, `PUBLISH`, `SUBSCRIBE`, pipeline usage) are correctly used per redis-py and Redis documentation.
