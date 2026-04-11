# Validation Summary: How to Use TS.ADD in Redis to Add Time Series Samples

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis
- RedisTimeSeries (TS.ADD command)
- Python (redis-py client library)
- psutil (system metrics collection)

## Sources Consulted
- Official Redis TS.ADD documentation: https://redis.io/docs/latest/commands/ts.add/

## Issues Found
1. **Syntax parameter order incorrect**: The optional parameters in the syntax block were listed in a non-standard order (`LABELS` before `ON_DUPLICATE` and `IGNORE`). Reordered to match the official Redis documentation: `DUPLICATE_POLICY`, `ON_DUPLICATE`, `IGNORE`, then `LABELS`.

2. **Misleading ON_DUPLICATE MAX comment**: The comment stated "accepted if 21.0 > current, rejected otherwise", implying the command could fail. In reality, `ON_DUPLICATE MAX` always succeeds and returns the timestamp — it simply stores `max(old_value, new_value)`. Updated the comment to "keeps the higher value: max(current, 21.0)" for accuracy.

## Review Notes
- The Python example using `datetime.datetime(2024, 1, 15, 12, 0, 0)` creates a naive (timezone-unaware) datetime. The `.timestamp()` method will interpret this in the local timezone, which may not produce the expected UTC timestamp. Adding `tzinfo=datetime.timezone.utc` would make it explicit, but since the code doesn't claim a specific output timestamp, this is a minor clarity concern rather than an error.
- The `DUPLICATE_POLICY` parameter in the syntax is valid for `TS.ADD` but only takes effect when auto-creating a new time series key. The post could benefit from a note clarifying this distinction from `ON_DUPLICATE`, but this is an enhancement, not an error.
