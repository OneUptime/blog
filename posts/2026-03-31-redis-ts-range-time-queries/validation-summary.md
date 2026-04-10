# Validation Summary: How to Use TS.RANGE in Redis Time Series for Time Range Queries

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis
- RedisTimeSeries module
- TS.RANGE command
- TS.REVRANGE command

## Sources Consulted
- Official Redis TS.RANGE documentation: https://redis.io/docs/latest/commands/ts.range/
- Official Redis TS.REVRANGE documentation: https://redis.io/docs/latest/commands/ts.revrange/

## Issues Found

### 1. Invalid negative timestamps used as relative offsets (4 occurrences)
**What was wrong:** Multiple examples used negative integers (e.g., `-60000`, `-300000`, `-86400000`) as `fromTimestamp` values, implying they function as relative time offsets (e.g., "60 seconds ago"). TS.RANGE only accepts non-negative Unix timestamps in milliseconds or the special character `-` (minimum possible timestamp). Negative integers are not valid relative offsets.

**What was changed:** Replaced all negative integer timestamps with valid absolute Unix millisecond timestamps and added notes explaining that `fromTimestamp` must be computed in application code.

**Affected sections:** "Last 60 Seconds", "Anomaly Detection Window", "SLO Compliance Report", "Billing Meter Aggregation".

### 2. TS.REVRANGE argument order reversed
**What was wrong:** The TS.REVRANGE example used `TS.REVRANGE temperature 1711904400000 0`, placing the larger timestamp first. TS.REVRANGE uses the same argument order as TS.RANGE (`fromTimestamp` <= `toTimestamp`); only the result order is reversed.

**What was changed:** Corrected to `TS.REVRANGE temperature 0 1711904400000` and updated the comment to clarify "same argument order, reversed result order".

### 3. Inaccurate EMPTY bucket behavior description
**What was wrong:** The post claimed "Buckets with no data return `NaN` instead of being skipped." This is only true for some aggregators. `sum` and `count` return `0` for empty buckets, not `NaN`.

**What was changed:** Updated the description to list which aggregators return `NaN` and which return `0`.

## Review Notes
- The syntax block, parameter descriptions, and aggregation function list are all accurate.
- The post does not mention the newer `countNaN` and `countAll` aggregation functions added in Redis 8.6, which is acceptable since these are very recent additions.
- The performance considerations section is accurate and practical.
- The `LATEST` flag is mentioned in the syntax but not explained in detail; this is a minor gap but not an error.
