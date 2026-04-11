# Validation Summary: How the allkeys-lru Eviction Policy Works in Redis

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis (eviction policies, memory management)
- Python (redis-py client library)
- Bash (Redis CLI commands)

## Sources Consulted
- Redis official eviction documentation: https://redis.io/docs/latest/develop/reference/eviction/
- Redis OBJECT IDLETIME command reference: https://redis.io/docs/latest/commands/object-idletime/
- Redis CONFIG SET command reference: https://redis.io/docs/latest/commands/config-set/
- Redis source code (`redisObject` struct in `server.h`) for LRU clock implementation details

## Issues Found

1. **LRU vs LFU comparison table — incorrect recommendation for flash sales/trending content**: The table listed "Flash sales, trending content" as LRU: No, LFU: Yes. This is incorrect. Flash sales and trending content are bursty, temporal phenomena where recently accessed data should stay cached — exactly what LRU optimizes for. LFU requires items to accumulate access frequency over time, making it slower to react to sudden popularity spikes. Changed to LRU: Better, LFU: Worse.

2. **Monitoring commands missing `redis-cli` prefix**: The bash code block for monitoring evictions used bare `INFO stats | grep evicted_keys` commands. Since the block is labeled as bash (not a redis-cli interactive session) and already included `redis-cli --stat` as a proper shell command, the `INFO` commands needed the `redis-cli` prefix to be executable as shown. Added `redis-cli` prefix to all three `INFO` commands.

3. **Unused `time` import**: The first Python example imported `time` but never used it. Removed the unused import.

## Review Notes
- The 24-bit LRU clock detail (seconds resolution) is accurate per Redis source code but is not documented in the official Redis documentation pages. This is an implementation detail that could change between versions, though it has been stable for many years.
- `OBJECT IDLETIME` has approximately 10-second precision, not per-second precision. The post says "seconds since last access" which is close enough for a tutorial but readers should be aware of the granularity.
- `OBJECT IDLETIME` is only available when the eviction policy is not an LFU policy. Since this post is specifically about allkeys-lru, this is fine, but worth noting for readers who might switch policies.
- The Python code uses `r.object_idletime(key)` which is the correct API for redis-py 5.0+. Older versions used `r.object("idletime", key)`.
- The approximated LRU description is simplified — since Redis 3.0, an eviction pool is maintained across sampling rounds for better candidate selection. The post's description is accurate at a high level but omits this optimization detail.
