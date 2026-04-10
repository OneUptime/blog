# Validation Summary: How to Use TS.MADD in Redis Time Series for Batch Inserts

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis
- RedisTimeSeries module
- TS.MADD command
- TS.ADD command (comparison)
- TS.CREATE command (mentioned)

## Sources Consulted
- Official Redis TS.MADD documentation: https://redis.io/docs/latest/commands/ts.madd/
- Official Redis TS.ADD documentation: https://redis.io/docs/latest/commands/ts.add/
- Redis Time Series data type documentation: https://redis.io/docs/latest/develop/data-types/timeseries/
- RedisTimeSeries GitHub issue #426 (TS.MADD with `*` timestamps on same series): https://github.com/RedisTimeSeries/RedisTimeSeries/issues/426
- RedisTimeSeries GitHub PR #1347 (fix for `*` timestamp handling): https://github.com/RedisTimeSeries/RedisTimeSeries/pull/1347

## Issues Found
No technical issues found.

## Review Notes
- The example output for the first `*` timestamp example shows timestamps incrementing by 1ms (1711900812000, 1711900812001, 1711900812002). In practice, since these are different series, the timestamps would likely all be the same millisecond. The shown output is plausible but not the most representative. This is a minor illustrative choice, not an error.
- The time complexity is described as "each insert is O(M) where M is the number of compaction rules." The official docs state O(N*M) for the entire command where N = number of entries. Both formulations are mathematically equivalent; the blog's per-insert phrasing is arguably clearer for the reader.
- The `--` comment syntax used in the comparison code block is not valid Redis syntax, but this is a standard blog convention for annotating code examples and is not misleading.
- Users should be aware that using `*` for multiple triplets targeting the **same** series within a single TS.MADD call can be problematic in older RedisTimeSeries versions (pre-fix for issue #426), as all entries may resolve to the same millisecond timestamp and violate the non-decreasing order constraint. This was addressed in later versions.
