# Validation Summary: How to Use TS.DELETERULE in Redis to Remove Compaction Rules

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- RedisTimeSeries module (TS.DELETERULE, TS.CREATERULE, TS.INFO commands)
- Python redis-py client library (TimeSeries interface)

## Sources Consulted
- Official Redis TS.DELETERULE documentation: https://redis.io/docs/latest/commands/ts.deleterule/
- Official Redis TS.CREATERULE documentation: https://redis.io/docs/latest/commands/ts.createrule/
- Official Redis TS.INFO documentation: https://redis.io/docs/latest/commands/ts.info/
- redis-py source code (TimeSeries commands module): https://github.com/redis/redis-py/blob/master/redis/commands/timeseries/commands.py
- redis-py source code (TSInfo class): https://github.com/redis/redis-py/blob/master/redis/commands/timeseries/info.py

## Issues Found

### Issue 1: Incorrect iteration over `TSInfo.rules` in "Listing All Rules for a Key" section
- **What was wrong:** The code treated `info.rules` as a list of tuples (`for dest, bucket_ms, aggregator in rules`) and the comment described it as `# List of [dest_key, bucket_duration, aggregator]`. In redis-py, `TSInfo.rules` is actually a **dictionary** with the structure `{dest_key: [bucket_duration, aggregator]}`, not a list of 3-element tuples. The original code would raise a `ValueError` at runtime.
- **What was changed:** Updated the comment to `# Dict of {dest_key: [bucket_duration, aggregator]}` and changed the iteration to `for dest, (bucket_ms, aggregator) in rules.items()`.
- **Why:** Verified against redis-py source code (`redis/commands/timeseries/info.py`), which parses rules as `{r[0]: list(r[1:]) for r in rules}` for RESP2 responses, producing a dict.

### Issue 2: Incorrect iteration over `TSInfo.rules` in "Removing All Rules for a Key" section
- **What was wrong:** The code used `for rule in rules: dest_key = rule[0]`, treating `rules` as a list of lists. Since `rules` is a dict, iterating over it yields string keys directly, and `rule[0]` would return the first character of the key name rather than the destination key.
- **What was changed:** Simplified to `for dest_key in rules:`, which correctly iterates over the dictionary keys (destination key names).
- **Why:** Same root cause as Issue 1 -- `TSInfo.rules` is a dict, not a list.

## Review Notes
- The post uses `r.execute_command('TS.DELETERULE', ...)` and `r.execute_command('TS.CREATERULE', ...)` throughout instead of the native `ts.deleterule()` and `ts.createrule()` methods available in redis-py. Both approaches work correctly, but the native methods are more idiomatic.
- The TS.DELETERULE syntax, parameters, return value, and error messages all match the official Redis documentation.
- The TS.CREATERULE syntax used in the examples is correct.
- The `ts.create()` calls use `retention_msecs`, which is the correct parameter name in redis-py.
- Since RedisTimeSeries 1.8, TS.INFO returns 4 elements per rule (including alignment timestamp). The redis-py TSInfo class abstracts this into the dict format, so the blog's Python code is not affected by this protocol-level detail.
