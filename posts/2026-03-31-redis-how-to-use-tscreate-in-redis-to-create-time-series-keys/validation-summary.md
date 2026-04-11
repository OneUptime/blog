# Validation Summary: How to Use TS.CREATE in Redis to Create Time Series Keys

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- RedisTimeSeries module (part of Redis Stack)
- Python redis-py client library

## Sources Consulted
- RedisTimeSeries TS.CREATE official documentation: https://redis.io/commands/ts.create/
- RedisTimeSeries TS.CREATERULE official documentation: https://redis.io/commands/ts.createrule/
- RedisTimeSeries TS.INFO official documentation: https://redis.io/commands/ts.info/
- redis-py TimeSeries client documentation: https://redis-py.readthedocs.io/en/stable/redismodules.html#redistimeseries-commands

## Issues Found
No technical issues found.

## Review Notes
- The post omits the `IGNORE` parameter (added in RedisTimeSeries 1.12) from the syntax block. This is not an error since the post does not claim to be exhaustive, and the parameter is a more advanced/niche option.
- All retention period calculations (7 days, 30 days, 1 hour, 1 day) are mathematically correct.
- The six DUPLICATE_POLICY values (BLOCK, LAST, FIRST, MAX, MIN, SUM) are all valid, and BLOCK as the default is correct.
- The Python example correctly uses `r.ts().create()` with the proper parameter names (`retention_msecs`, `labels`, `duplicate_policy`) for the redis-py client.
- The TS.INFO output snippet accurately represents the RESP2 response format with correct field names.
- The TS.CREATERULE example at the end correctly demonstrates setting up a compaction rule with AVG aggregation over 60-second buckets.
