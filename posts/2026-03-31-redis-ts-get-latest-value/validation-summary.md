# Validation Summary: How to Use TS.GET in Redis Time Series to Get Latest Value

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- Redis
- Redis Time Series (RedisTimeSeries module)
- TS.GET command
- TS.MGET command (comparison)
- TS.RANGE command (comparison)

## Sources Consulted
- Official Redis TS.GET documentation: https://redis.io/commands/ts.get/
- Official Redis TS.RANGE documentation: https://redis.io/commands/ts.range/
- Official Redis TS.MGET documentation: https://redis.io/commands/ts.mget/

## Issues Found
1. **Incorrect relative timestamp in TS.RANGE example**: The post used `TS.RANGE latency:api -60000 +` with a comment saying "Last 60 seconds of data points." Redis Time Series does not support negative relative timestamps. The `-` symbol is only valid as a standalone special value meaning "earliest sample in the series." The value `-60000` would be interpreted as a literal Unix timestamp (60 seconds before epoch, i.e., Dec 31, 1969), not as "60 seconds ago from now." Fixed by replacing with an absolute timestamp (`1711900752000`) and adding a comment clarifying that the start timestamp should be computed in application code.

## Review Notes
- The syntax `TS.GET key [LATEST]` is correct and complete per the official docs.
- The LATEST flag description is accurate — it applies to compaction (downsampled) series and includes the latest possibly-partial bucket.
- The O(1) time complexity claim is confirmed by official documentation.
- The return type description (two-element array of timestamp and value, or empty array for empty series) is accurate.
- The TS.GET vs TS.MGET comparison is correct.
- All TS.GET command examples are syntactically correct and would produce the expected output.
