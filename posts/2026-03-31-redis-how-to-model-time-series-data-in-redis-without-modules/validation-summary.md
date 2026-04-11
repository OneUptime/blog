# Validation Summary: How to Model Time-Series Data in Redis Without Modules

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Sorted Sets, Streams, Hashes, Pipelines)
- Python 3 with redis-py client library
- Redis CLI commands (ZADD, ZRANGEBYSCORE, ZREVRANGE, ZCOUNT, ZREMRANGEBYSCORE, XADD, XRANGE, XREVRANGE, XLEN, XTRIM)

## Sources Consulted
- Redis official documentation for Sorted Sets: https://redis.io/docs/data-types/sorted-sets/
- Redis official documentation for Streams: https://redis.io/docs/data-types/streams/
- Redis command reference for ZADD, ZRANGEBYSCORE, ZREVRANGE, ZCOUNT, ZREMRANGEBYSCORE: https://redis.io/commands/
- Redis command reference for XADD, XRANGE, XREVRANGE, XLEN, XTRIM: https://redis.io/commands/
- redis-py documentation: https://redis-py.readthedocs.io/
- Python datetime deprecation notice (PEP 615, Python 3.12 release notes): https://docs.python.org/3/library/datetime.html

## Issues Found
1. **`datetime.utcfromtimestamp()` deprecated since Python 3.12** (Bucketed Aggregation section): The code used `datetime.utcfromtimestamp(now)` which has been deprecated since Python 3.12 and emits a `DeprecationWarning`. Replaced both occurrences with `datetime.fromtimestamp(now, tz=timezone.utc)` and updated the import to include `timezone`. This is the recommended replacement per Python official documentation.

## Review Notes
- `ZRANGEBYSCORE` and `ZREVRANGE` are deprecated since Redis 6.2.0 in favor of the unified `ZRANGE` command with `BYSCORE` and `REV` options. They still work in all current Redis versions and are widely used in tutorials. Not changed, but readers targeting Redis 6.2+ may prefer the newer syntax (e.g., `ZRANGE metrics:cpu 1711896400 1711900000 BYSCORE WITHSCORES`).
- The bash cleanup command `$(date -d '7 days ago' +%s)` uses GNU coreutils `date -d` syntax, which is not available on macOS (which uses `date -v-7d +%s`). Since Redis servers typically run on Linux and the comment clarifies this is for cron jobs, this is acceptable.
- The bucketed aggregation example stores `str(ts)` as the sorted set member for raw data, meaning readings within the same second would overwrite each other. This contrasts with the earlier UUID-based deduplication approach. The aggregation hashes (sum/count) remain correct regardless, so this is an acceptable simplification for the example.
- All Redis command syntax is correct and verified against current documentation. All redis-py API calls use the correct modern (3.x+) argument format.
