# Validation Summary: How to Calculate Percentiles and Histograms with Redis

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Redis sorted sets
- Redis hashes
- Redis pipelining and expiration
- Redis Lua scripting
- Redis T-Digest / RedisBloom probabilistic data structures
- Python redis-py client
- Percentile and histogram algorithms

## Sources Consulted
- Redis ZADD command documentation: https://redis.io/docs/latest/commands/zadd/
- Redis ZRANGE command documentation: https://redis.io/docs/latest/commands/zrange/
- Redis ZUNIONSTORE command documentation: https://redis.io/docs/latest/commands/zunionstore/
- Redis ZREMRANGEBYRANK command documentation: https://redis.io/docs/latest/commands/zremrangebyrank/
- Redis HINCRBY command documentation: https://redis.io/docs/latest/commands/hincrby/
- Redis HINCRBYFLOAT command documentation: https://redis.io/docs/latest/commands/hincrbyfloat/
- redis-py command documentation: https://redis.readthedocs.io/en/stable/commands.html
- Redis TDIGEST.CREATE command documentation: https://redis.io/docs/latest/commands/tdigest.create/
- Redis TDIGEST.ADD command documentation: https://redis.io/docs/latest/commands/tdigest.add/
- Redis TDIGEST.MERGE command documentation: https://redis.io/docs/latest/commands/tdigest.merge/
- Redis Lua API reference: https://redis.io/docs/latest/develop/programmability/lua-api/

## Issues Found
- The introduction said Redis has no built-in statistical functions. Updated this to "Redis core" because Redis Stack / RedisBloom provides native T-Digest commands.
- The exact sorted-set percentile example capped the set by removing the lowest scores, which biases the distribution and makes percentiles incorrect for the original sample set. Removed the value-based trimming from the exact percentile tracker.
- The simplified T-Digest section described the approach as "accurate" too broadly. Updated it to "approximate" / "high-accuracy" wording and clarified that the Redis sorted-set implementation is only illustrative and T-Digest-like.
- The simplified T-Digest `add()` method accepted a `weight` argument but never used it. Removed the unused parameter.
- The RedisBloom T-Digest wrapper caught all exceptions when creating the sketch. Narrowed this to `redis.exceptions.ResponseError` and re-raises errors that are not the expected "already exists" case.
- The API latency monitoring example used `datetime` and `timedelta` without importing them. Added the missing import.
- The retention helper used `ZREMRANGEBYRANK` in a way that retained only the highest-score values and biased percentile calculations. Replaced it with a time-bucketed expiration helper.
- Verified that all Python fenced code blocks parse successfully after the edits.

## Review Notes
The examples are technically valid as instructional snippets, but the sorted-set approach stores every retained observation and should be limited to moderate-volume or short-retention windows. The hand-written T-Digest-like implementation remains illustrative; production systems should prefer Redis' native TDIGEST commands when available.
