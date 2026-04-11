# Validation Summary: How to Use TS.DEL in Redis to Delete Time Series Samples

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- RedisTimeSeries module (TS.DEL, TS.ADD, TS.RANGE commands)
- Python (redis-py library)

## Sources Consulted
- Official Redis TS.DEL documentation: https://redis.io/docs/latest/commands/ts.del/
- Official Redis TS.ADD documentation: https://redis.io/docs/latest/commands/ts.add/
- Official Redis TS.RANGE documentation: https://redis.io/docs/latest/commands/ts.range/
- redis-py TimeSeries documentation: https://redis-py.readthedocs.io/en/stable/examples/timeseries_examples.html

## Issues Found
1. **Unused `import time` in Data Retention Compliance example** (line 144): The `time` module was imported but never used in the code block. Only `datetime` and `timedelta` are needed. Removed the unused import.

## Review Notes
- The Python examples use `r.execute_command('TS.DEL', ...)` for the delete operation while using the native redis-py TimeSeries API (`ts.range()`, `ts.madd()`) for other operations. The redis-py library does provide a native `ts.delete(key, from_time, to_time)` method which would be more idiomatic and consistent. This is a style preference, not a correctness issue -- both approaches work.
- The `TS.RANGE` comment in the Basic Usage section shows `# Returns: 22.5, 23.1, 22.8` which is a simplification; the actual return is a list of timestamp-value pairs. This is acceptable for illustrative purposes.
- The syntax, parameters (inclusive range boundaries), return value (count of deleted samples), special timestamp values (`-` and `+`), and key metadata preservation behavior are all accurately described.
- The timestamp calculation for the "Deleting a Time Window" example (1705320000000 = 2024-01-15 12:00:00 UTC) is correct.
