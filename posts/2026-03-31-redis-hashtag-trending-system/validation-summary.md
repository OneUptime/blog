# Validation Summary: How to Build a Hashtag Trending System with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Sorted Sets: ZINCRBY, ZUNIONSTORE, ZREVRANGE, ZADD, ZRANGE, ZREM)
- Python (redis-py client library)
- Redis CLI

## Sources Consulted
- Redis ZINCRBY documentation: https://redis.io/docs/latest/commands/zincrby/
- Redis ZUNIONSTORE documentation: https://redis.io/docs/latest/commands/zunionstore/
- Redis ZREVRANGE documentation: https://redis.io/docs/latest/commands/zrevrange/
- Redis ZADD documentation: https://redis.io/docs/latest/commands/zadd/
- Redis ZRANGE documentation: https://redis.io/docs/latest/commands/zrange/
- redis-py documentation: https://redis-py.readthedocs.io/en/stable/

## Issues Found
No technical issues found.

## Review Notes
- `ZREVRANGE` is deprecated since Redis 6.2.0 in favor of `ZRANGE ... REV`. The command still works and is widely understood, so this is acceptable for a tutorial. A future update could use `ZRANGE` with the `REV` flag for both the Redis CLI examples and the Python code (`r.zrange(..., desc=True)`).
- The `get_trending_hashtags` function uses the current second as part of the temp key, meaning concurrent calls within the same second share a key. This is a minor concern unlikely to matter in practice but worth noting for production use.
- The `decay_scores` function fetches all tags then updates in a pipeline, which is not fully atomic. Acceptable for a tutorial but a production system might use a Lua script for atomicity.
