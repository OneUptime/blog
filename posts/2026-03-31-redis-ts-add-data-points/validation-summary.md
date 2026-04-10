# Validation Summary: How to Use TS.ADD in Redis Time Series to Add Data Points

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- Redis
- Redis Time Series (RedisTimeSeries module)
- TS.ADD command
- TS.MADD command (comparison)
- TS.CREATE command (mentioned)

## Sources Consulted
- Official Redis TS.ADD documentation: https://redis.io/docs/latest/commands/ts.add/

## Issues Found

1. **Syntax parameter order incorrect**: The optional parameters `IGNORE` and `ON_DUPLICATE` were listed in the wrong order compared to the official documentation. The blog had `IGNORE` before `ON_DUPLICATE`, but the official docs specify `ON_DUPLICATE` before `IGNORE`. Fixed to match the official parameter order.

2. **Incorrect error message for out-of-order timestamps**: The blog showed the error as `TSDB: Timestamp cannot be older than oldest timestamp`. This is incorrect — the error references the *latest* (most recent) timestamp, not the *oldest*. The correct error message is `TSDB: timestamp is older than the latest timestamp in the time series`. Fixed to match the actual Redis TimeSeries error output.

## Review Notes
- The time complexity description ("O(M) where M is the number of compaction rules") is correct but the official docs also note that "Setting RETENTION and LABELS introduces additional time complexity." This is a minor omission rather than an error.
- The `--` comment syntax used in Redis code blocks is not a valid Redis comment syntax (Redis has no comment syntax), but this is a common blog convention for illustrative purposes and does not affect the technical accuracy of the commands themselves.
- All code examples are syntactically correct and demonstrate valid TS.ADD usage patterns.
- The explanation of `*` for server-time timestamps, auto-creation behavior, duplicate policy override, and the comparison with TS.MADD are all accurate.
