# Validation Summary: How to Build a Global Leaderboard with Redis Sorted Sets

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Sorted Sets: ZADD, ZINCRBY, ZREVRANGE, ZREVRANK, ZSCORE, ZCARD)
- Python (redis-py client library)
- Redis CLI

## Sources Consulted
- Redis official documentation for Sorted Set commands: https://redis.io/docs/latest/commands/?group=sorted-set
- Redis ZADD complexity: https://redis.io/docs/latest/commands/zadd/
- Redis ZREVRANGE deprecation notice (Redis 6.2.0): https://redis.io/docs/latest/commands/zrevrange/
- redis-py GitHub repository and API reference: https://github.com/redis/redis-py
- redis-py `zadd` mapping syntax (3.0+ API): https://redis-py.readthedocs.io/en/stable/commands.html#redis.commands.sorted_set.SortedSetCommands.zadd
- redis-py `zincrby` signature (3.0+ API): https://redis-py.readthedocs.io/en/stable/commands.html#redis.commands.sorted_set.SortedSetCommands.zincrby

## Issues Found
No technical issues found.

## Review Notes
- `ZREVRANGE` (the Redis server command) was deprecated in Redis 6.2.0 in favor of `ZRANGE ... REV`. The redis-py `zrevrange()` method still works but the modern equivalent is `zrange(name, start, end, desc=True)`. The code as written is functional and widely understood, so no change was made, but authors should be aware this may be removed in a future Redis major version.
- The median calculation in `get_leaderboard_stats` is labeled "approximate", which is appropriate since it picks the middle element rather than averaging the two middle elements for even-length sets. This is a reasonable simplification for a leaderboard context.
- The post does not specify Redis or redis-py version requirements. The code is compatible with redis-py >= 3.0 and any currently supported Redis server version.
