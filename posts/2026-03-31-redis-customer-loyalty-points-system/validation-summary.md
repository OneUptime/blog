# Validation Summary: How to Build a Customer Loyalty Points System with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Strings, Sorted Sets, Streams, Lua scripting)
- Python 3 with redis-py client library
- Redis CLI commands

## Sources Consulted
- Redis official command documentation: https://redis.io/docs/latest/commands/ (INCRBY, DECRBY, ZADD, ZINCRBY, ZSCORE, ZRANGEBYSCORE, ZREVRANGE, ZREMRANGEBYSCORE, XADD, XREVRANGE, GET, EVAL)
- redis-py documentation: https://redis-py.readthedocs.io/en/stable/ (pipeline, eval, zadd mapping format, xrevrange signature, zrangebyscore withscores return format)
- Redis Lua scripting reference: https://redis.io/docs/latest/develop/interact/programmability/eval-intro/ (type conversion between Redis nil and Lua false, tonumber behavior)

## Issues Found
No technical issues found.

## Review Notes
- The expiring points sorted set uses `str(points)` as the member and the expiry timestamp as the score. This means if a user earns the same number of points (e.g., 100) in two separate transactions with different expiry dates, the second `ZADD` will overwrite the first entry's expiry. This is an acceptable simplification for a tutorial but would need a unique member (e.g., a transaction ID) in production.
- The `redeem_points` function uses a Lua script for atomic balance check-and-decrement, but the subsequent `XADD` for history logging is a separate call outside the script. If the connection drops between the two, the balance is decremented without a history entry. A production system would include the XADD inside the Lua script.
- In redis-py 4.x+, methods like `zrevrange` and `zrangebyscore` have been deprecated in favor of the unified `zrange` command with parameters (`desc=True`, `byscore=True`). The deprecated methods still function but may be removed in a future major release.
