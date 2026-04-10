# Validation Summary: How to Implement Network Usage Tracking with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (HSET, HINCRBY, EXPIRE, PUBLISH, SET with NX/EX, HGETALL, HGET, pipeline)
- Python 3 (redis-py client library)

## Sources Consulted
- Redis official documentation for HINCRBY: https://redis.io/commands/hincrby/
- Redis official documentation for HSET: https://redis.io/commands/hset/
- Redis official documentation for EXPIRE: https://redis.io/commands/expire/
- Redis official documentation for PUBLISH: https://redis.io/commands/publish/
- Redis official documentation for SET (NX/EX options): https://redis.io/commands/set/
- Python redis-py documentation: https://redis-py.readthedocs.io/
- Python time module documentation: https://docs.python.org/3/library/time.html

## Issues Found

### 1. Timezone inconsistency in `_check_data_cap` (lines 84-85, 105)
- **What was wrong:** `time.strftime("%Y%m")` and `time.strftime('%Y%m%d')` were called without a second argument, which defaults to `time.localtime()`. However, `record_usage` uses `time.gmtime()` (UTC) when generating bucket keys. On any non-UTC system, `_check_data_cap` would construct a different month key than `record_usage` wrote to, causing cap checks to silently read zero usage near month boundaries.
- **What was changed:** Added `now = time.gmtime()` and passed `now` as the second argument to both `time.strftime` calls in `_check_data_cap`.

### 2. Timezone inconsistency in `get_current_month_usage` (line 118)
- **What was wrong:** Same issue as above — `time.strftime("%Y%m")` used localtime instead of UTC, producing a month key that could differ from the one written by `record_usage`.
- **What was changed:** Changed to `time.strftime("%Y%m", time.gmtime())`.

## Review Notes
- The description mentions "sliding windows" and "detect anomalies," but the implementation uses fixed time buckets (not true sliding windows) and cap enforcement (not anomaly detection). These are minor description inaccuracies that don't affect the code correctness.
- The `_check_data_cap` function accepts a `bytes_added` parameter that is never used inside the function body. The function reads the cumulative total from Redis instead. This is not a bug (the function works correctly), but it is dead code.
- The comment "Check cap asynchronously" on line 77 is misleading — `_check_data_cap` is called synchronously. In a production system this would likely be offloaded to a background task, but as written the call blocks.
- The `pipe.expire()` calls reset TTL on every write, which is a valid pattern for extending key lifetime as long as data is flowing.
- The Gbps calculation (`bytes_total / 3600 / 125000000`) is correct: dividing bytes by seconds gives bytes/sec, and 1 Gbps = 125,000,000 bytes/sec.
- All TTL values are correct: 172800 = 48 hours, 7776000 = 90 days, 34560000 = 400 days, 86400 = 1 day.
- The GB conversion divisor 1073741824 (2^30) is correct for GiB.
