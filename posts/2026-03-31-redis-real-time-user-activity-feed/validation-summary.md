# Validation Summary: How to Build a Real-Time User Activity Feed with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Lists, Sorted Sets, Sets, Pipelines)
- Python (redis-py client library)
- redis-cli

## Sources Consulted
- Redis LPUSH documentation: https://redis.io/docs/latest/commands/lpush/ — O(1) per element pushed
- Redis LRANGE documentation: https://redis.io/docs/latest/commands/lrange/ — O(S+N) complexity, not O(1)
- Redis LTRIM documentation: https://redis.io/docs/latest/commands/ltrim/
- Redis ZADD documentation: https://redis.io/docs/latest/commands/zadd/ — O(log N) complexity
- Redis ZREVRANGE documentation: https://redis.io/docs/latest/commands/zrevrange/ — O(log N + M) complexity
- Redis ZREMRANGEBYRANK documentation: https://redis.io/docs/latest/commands/zremrangebyrank/
- Redis SMEMBERS documentation: https://redis.io/docs/latest/commands/smembers/
- Redis MEMORY USAGE documentation: https://redis.io/docs/latest/commands/memory-usage/
- redis-py documentation: https://redis-py.readthedocs.io/

## Issues Found

1. **Introduction: incorrect complexity claim for range queries**
   - **What was wrong:** The sentence "Redis Lists and Sorted Sets are perfect because prepending an event is O(1) and range queries are O(log N + M)" conflated the complexity of two different data structures. LRANGE on Lists is O(S+N) where S is the start offset, not O(log N + M). The O(log N + M) complexity applies only to Sorted Set range commands (ZREVRANGE/ZRANGE).
   - **What was changed:** Reworded to: "Redis Lists are perfect because prepending an event with LPUSH is O(1), and Sorted Sets offer O(log N + M) range queries for score-based ordering."
   - **Why:** The original text presented O(log N + M) as applying to both Lists and Sorted Sets, which is incorrect per Redis documentation.

2. **Summary: incorrect O(1) claim for LRANGE paging**
   - **What was wrong:** The summary stated "O(1) paging with LRANGE," but LRANGE has O(S+N) time complexity where S is the distance of the start offset from the nearest end and N is the number of elements returned.
   - **What was changed:** Changed "O(1) paging with LRANGE" to "efficient paging with LRANGE."
   - **Why:** LRANGE is not O(1). While it is fast for small offsets and page sizes (typical feed access patterns), claiming O(1) is technically incorrect.

## Review Notes
- All redis-py API calls use the current mapping-style `zadd` syntax (`{member: score}`) rather than the deprecated positional argument style. This is correct for redis-py 3.x+.
- The `zremrangebyrank(key, 0, -201)` call correctly handles the edge case where the sorted set has 200 or fewer elements (the resolved negative index goes out of range, so no elements are removed).
- The `get_unread_count` function fetches up to 100 feed items to count unreads. If the feed has more than 100 unread items, the count will be capped at 100. This is a design trade-off acknowledged by the `max_feed_size` parameter elsewhere, not a bug.
- The `fan_out_activity` function calls `time.time()` inside the loop, meaning each follower's copy of the event may have a slightly different timestamp. This is a minor design choice, not an error.
- `MEMORY USAGE` is available since Redis 4.0. The post does not specify a minimum Redis version, which is fine for a modern tutorial.
