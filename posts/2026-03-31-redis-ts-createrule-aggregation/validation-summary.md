# Validation Summary: How to Use TS.CREATERULE in Redis Time Series for Aggregation Rules

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis
- Redis Time Series (RedisTimeSeries module)
- TS.CREATERULE command
- TS.CREATE, TS.RANGE, TS.GET commands

## Sources Consulted
- Official Redis documentation for TS.CREATERULE: https://redis.io/docs/latest/commands/ts.createrule/
- Official Redis documentation for TS.CREATE: https://redis.io/docs/latest/commands/ts.create/
- Official Redis documentation for TS.RANGE: https://redis.io/docs/latest/commands/ts.range/
- Official Redis documentation for TS.GET: https://redis.io/docs/latest/commands/ts.get/
- Official Redis documentation for TS.ADD: https://redis.io/docs/latest/commands/ts.add/
- RedisTimeSeries 1.8 release notes: https://redis.io/docs/latest/operate/oss_and_stack/stack-with-enterprise/release-notes/redistimeseries/redistimeseries-1.8-release-notes/

## Issues Found

1. **ALIGNTIMESTAMP keyword syntax incorrect**: The syntax section showed `[ALIGNTIMESTAMP alignTimestamp]` with a keyword prefix, but the official TS.CREATERULE syntax uses a positional parameter `[alignTimestamp]` without a keyword. Fixed the syntax block, parameter description, and the aligned-buckets example (`ALIGNTIMESTAMP 0` changed to just `0`).

2. **Invalid negative timestamps in TS.RANGE examples**: Two examples used negative numbers as timestamps (`-2592000000` and `-86400000`). TS.RANGE does not support negative timestamps — it accepts `-` (earliest sample), `+` (latest sample), or non-negative Unix timestamps in milliseconds. Changed both to use the `-` symbol for earliest available timestamp.

3. **Incorrect claim about parallel rule evaluation**: The performance section stated "Multiple rules on one source are evaluated in parallel per write." Per the official docs, the time complexity of TS.ADD with compaction rules is O(M) where M is the number of rules, indicating sequential evaluation. Fixed to: "Multiple rules on one source are evaluated sequentially; total overhead is O(M) for M rules."

## Review Notes
- The aggregation functions list is correct and complete for RedisTimeSeries up to v1.8. Redis 8.6+ adds `countNaN` and `countAll`, which could be mentioned in a future update.
- The LATEST flag documentation is accurate (available since RedisTimeSeries v1.8).
- The compaction behavior details (bucket finalization, partial buckets, sparse series) are all accurate.
- Retention values used in examples are correct (86400000 = 24h, 604800000 = 7d, 2592000000 = 30d, 7776000000 = 90d).
