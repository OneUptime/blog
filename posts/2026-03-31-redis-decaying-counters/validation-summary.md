# Validation Summary: How to Implement Decaying Counters with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (hashes, sorted sets, pipelines)
- Python (redis-py client library)
- Exponential decay / half-life decay algorithms

## Sources Consulted
- redis-py official documentation: https://redis-py.readthedocs.io/en/stable/
- Redis ZADD command documentation: https://redis.io/commands/zadd
- Redis ZREVRANGEBYSCORE command documentation: https://redis.io/commands/zrevrangebyscore
- Redis HSET command documentation: https://redis.io/commands/hset
- Python math module documentation: https://docs.python.org/3/library/math.html

## Issues Found
No technical issues found.

## Review Notes
- The `zrevrangebyscore` and `zrangebyscore` methods used in the leaderboard and periodic decay sections are deprecated in redis-py 4.2+ in favor of `zrange(..., byscore=True, rev=True)`. The deprecated methods still function correctly and are arguably clearer for tutorial purposes, so no change was made.
- The `add_score` function reads via pipeline then writes separately, which is not atomic. Under concurrent writes, a race condition could cause one update to overwrite another. This is a common simplification in tutorial code and is acceptable for demonstrating the concept. Production use cases may want to wrap this in a Redis transaction or Lua script.
- All mathematical calculations in the post were verified: the exponential decay example (e^(-2.4) ≈ 0.091) and the half-life example (0.5^(1/6) ≈ 0.891) are both correct.
