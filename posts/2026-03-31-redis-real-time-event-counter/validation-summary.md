# Validation Summary: How to Build a Real-Time Event Counter with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (INCR, INCRBY, EXPIRE, GET, KEYS, pipelining)
- Python 3 (type hints, f-strings)
- redis-py (Python Redis client)

## Sources Consulted
- Redis INCR command documentation: https://redis.io/docs/latest/commands/incr/
- Redis INCRBY command documentation: https://redis.io/docs/latest/commands/incrby/
- Redis EXPIRE command documentation: https://redis.io/docs/latest/commands/expire/
- Redis pipelining documentation: https://redis.io/docs/latest/develop/use/pipelining/
- redis-py documentation: https://redis-py.readthedocs.io/en/stable/

## Issues Found
1. **Inaccurate "nanosecond precision" claim**: The introduction stated Redis provides "atomic increments with nanosecond precision." This is misleading — `int(time.time())` yields second-level timestamp precision, and Redis command latency is typically in the microsecond range, not nanosecond. Changed to "sub-millisecond latency," which accurately describes Redis INCR performance.

## Review Notes
- The `pipe.expire()` call on every increment resets the TTL on each write, meaning the key expires TTL seconds after the *last* write rather than after the bucket's time window ends. This is acceptable given the TTL values are much larger than the bucket durations.
- The `KEYS` command shown in the Monitoring section is appropriate for debugging/inspection but would block the server on large datasets. In production, `SCAN` would be preferred. This is fine as presented since it's framed as an inspection command.
- The rate limiter uses `window_seconds * 2` for TTL, which provides adequate buffer for key cleanup across bucket boundaries.
