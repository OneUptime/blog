# Validation Summary: How to Build a Decaying Score Leaderboard with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Sorted Sets, Hashes, Pipelines, CLI)
- Python (redis-py client library)
- Exponential decay mathematics

## Sources Consulted
- Redis ZADD documentation: https://redis.io/commands/zadd
- Redis ZREVRANGE documentation: https://redis.io/commands/zrevrange
- Redis ZRANGE documentation: https://redis.io/commands/zrange
- Redis HSET documentation: https://redis.io/commands/hset
- Redis HGET / HGETALL documentation: https://redis.io/commands/hgetall
- redis-py (Python Redis client) documentation: https://redis-py.readthedocs.io/
- Exponential decay formula reference (half-life = ln(2) / lambda)

## Issues Found
No technical issues found.

## Review Notes
- The `ZREVRANGE` Redis command was deprecated in Redis 6.2.0 in favor of `ZRANGE ... REV`. Similarly, the `zrevrange` method in redis-py may show deprecation warnings in newer versions (5.x+). The code still functions correctly with current versions, but future updates to the post could migrate to `zrange(key, start, end, desc=True)`.
- The `decay_all_scores` function performs `hgetall` reads inside the loop but outside the pipeline, resulting in N round trips for reads plus a single batched write. This is functionally correct but could be noted as a performance consideration for very large leaderboards.
- When `decay_all_scores` removes a player from the sorted set (score < 0.01), the corresponding `player:meta:{player_id}` hash is not cleaned up. This leaves orphaned keys in Redis. Not a correctness bug, but worth noting for production use.
- The `get_top_players` function returns scores as stored in the sorted set (from the last recomputation), not live-decayed scores. This is consistent with the post's architecture (periodic recomputation) but means rankings can be slightly stale between recomputation runs.
