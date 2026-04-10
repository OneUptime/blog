# Validation Summary: How to Store Time-Based Data Efficiently in Redis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (sorted sets, streams, strings, TTL)
- Python (redis-py client library)
- Redis CLI commands

## Sources Consulted
- Redis official documentation for ZADD, ZRANGEBYSCORE, ZCOUNT, ZREMRANGEBYSCORE, XADD, XRANGE, XREVRANGE, XTRIM, INCR, EXPIRE, SET commands (https://redis.io/docs/latest/commands/)
- redis-py library source code and API signatures (v7.x) for zadd, zrangebyscore, zremrangebyscore, xadd, xrange, xtrim, pipeline methods
- Python datetime module documentation for utcfromtimestamp deprecation (https://docs.python.org/3/library/datetime.html)
- PEP 587 and Python 3.12 release notes regarding datetime deprecations

## Issues Found
- **`datetime.utcfromtimestamp()` deprecated**: In Pattern 3 (Time-Bucketed String Keys), the code used `datetime.utcfromtimestamp(ts or time.time())`, which has been deprecated since Python 3.12 and removed in Python 3.14. Replaced with `datetime.fromtimestamp(ts or time.time(), tz=timezone.utc)` and updated the import to include `timezone`.

## Review Notes
- `ZRANGEBYSCORE` is considered legacy in Redis 6.2+ (replaced by `ZRANGE ... BYSCORE`), and `zrangebyscore()` in redis-py follows the same pattern. Both still work and are widely used in tutorials, so this was left as-is.
- In Pattern 2, the stream range query uses `end_id = f"{end_ms}-9999999"` for the sequence number. The true maximum sequence is 2^64-1, but 9,999,999 is a practical upper bound that is extremely unlikely to be exceeded within a single millisecond. Left as-is.
- All Redis CLI command syntax verified correct against current documentation.
- All redis-py API calls verified correct against redis-py 7.x (zadd mapping format, xadd default `*` ID, xtrim parameters, pipeline transaction default).
- The rate limiter in Pattern 4 correctly uses a pipeline with transaction=True (default), ensuring atomicity of the remove-add-count-expire sequence.
