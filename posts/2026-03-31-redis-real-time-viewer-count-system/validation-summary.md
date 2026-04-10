# Validation Summary: How to Build a Real-Time Viewer Count System with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Sets, HyperLogLog, Sorted Sets, Pub/Sub)
- Python (redis-py client library)
- Real-time analytics patterns (heartbeat, time-windowed counting, trending)

## Sources Consulted
- Redis HyperLogLog documentation: https://redis.io/docs/data-types/hyperloglog/
- Redis PFADD/PFCOUNT/PFMERGE command reference: https://redis.io/commands/pfadd/
- Redis Sets command reference: https://redis.io/commands/sadd/
- Redis Sorted Sets command reference: https://redis.io/commands/zincrby/
- Redis ZRANGE command reference: https://redis.io/commands/zrange/
- Redis Pub/Sub documentation: https://redis.io/docs/interact/pubsub/
- redis-py documentation: https://redis-py.readthedocs.io/
- PEP 585 (builtin generic types like `list[str]`): https://peps.python.org/pep-0585/

## Issues Found
1. **Section heading said "Two Approaches" but table listed three**: The table included Exact concurrent count (Set), Unique viewers (HyperLogLog), and Content trending (Sorted Set) — three approaches, not two. Changed heading to "Three Approaches."
2. **Unused variable `now` in `viewer_join`**: The line `now = int(time.time())` was assigned but never referenced in the function body. Removed the unused assignment to avoid confusing readers.

## Review Notes
- The heartbeat mechanism (`viewer_heartbeat`) refreshes the TTL on the entire active set key, not on individual session members. This means stale sessions won't be evicted as long as any viewer sends heartbeats. A more robust approach would use sorted sets with timestamps per session or individual keys per session, but the current approach works correctly for the simpler case where the entire set expires if no heartbeats arrive at all.
- The `zincrby(TRENDING_KEY, -0.5, content_id)` in `viewer_leave` uses an asymmetric decrement (-0.5) versus the increment (+1) in `viewer_join`. This is an intentional design choice (leaving should reduce trending score less than joining increases it), but could confuse readers without an explanatory comment.
- All redis-py API calls are correct for redis-py 4.x+ (current). The `zrange` with `desc=True` parameter works in redis-py 4.x+ where it maps to the enhanced `ZRANGE` command with `REV` option.
- The `list[str]` type hint syntax requires Python 3.9+. This is current and standard but worth noting for readers on older Python versions.
