# Validation Summary: How to Use TS.INCRBY and TS.DECRBY in Redis Time Series

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis
- RedisTimeSeries module (TS.INCRBY, TS.DECRBY, TS.CREATE, TS.ADD, TS.GET, TS.RANGE)

## Sources Consulted
- Official Redis TimeSeries TS.INCRBY documentation: https://redis.io/commands/ts.incrby/
- Official Redis TimeSeries TS.DECRBY documentation: https://redis.io/commands/ts.decrby/
- Official Redis TimeSeries TS.RANGE documentation: https://redis.io/commands/ts.range/

## Issues Found

1. **Incorrect `*` wildcard placement in TS.INCRBY/TS.DECRBY commands (throughout post):** The blog used `TS.INCRBY key * value` (e.g., `TS.INCRBY requests * 1`), placing `*` as a positional timestamp argument between the key and the addend. This is incorrect — unlike `TS.ADD` which has the syntax `TS.ADD key timestamp value`, `TS.INCRBY` uses `TS.INCRBY key addend [TIMESTAMP timestamp]`. The timestamp defaults to current server time and does not take a positional `*`. Fixed all ~20 occurrences to `TS.INCRBY key value` (e.g., `TS.INCRBY requests 1`).

2. **`TSCREATE` typo (First Insert Behavior section):** `TSCREATE new-counter` was missing the dot separator. Fixed to `TS.CREATE new-counter`.

3. **Invalid `TS.RANGE` end timestamp `-1` (With Explicit Timestamp section):** `TS.RANGE page-views 0 -1` used `-1` as the toTimestamp, which is not valid in Redis TimeSeries. Valid special values are `-` (earliest) and `+` (latest). Fixed to `TS.RANGE page-views - +`.

4. **Invalid `-1h` relative timestamp in TS.RANGE (Request Counter section):** `TS.RANGE requests:api:checkout -1h + AGGREGATION sum 60000` used `-1h` as a relative timestamp. Redis TimeSeries does not support relative timestamp notation — only absolute millisecond timestamps or the `-`/`+` special values. Fixed to use an explicit millisecond timestamp with a comment explaining the client computes this value.

5. **Outdated `[UNCOMPRESSED]` syntax option (Syntax section):** The syntax showed bare `[UNCOMPRESSED]` as a standalone flag. The current Redis TimeSeries syntax uses `[ENCODING <COMPRESSED|UNCOMPRESSED>]`. Fixed in both TS.INCRBY and TS.DECRBY syntax blocks.

6. **Parameter names updated (Syntax section):** Changed `value` to `addend`/`subtrahend` to match the official Redis documentation parameter naming.

## Review Notes
- The syntax section omits two optional parameters present in the official docs: `DUPLICATE_POLICY` and `IGNORE`. These are advanced options and their omission is acceptable for a tutorial-level post, but readers needing full coverage should consult the official docs.
- The O(M) complexity claim is correct but incomplete — the official docs note O(1) when there are no compaction rules. This is a minor omission.
- The `TS.ADD inventory * 1000` usage in the Basic Decrement example is correct — `TS.ADD` does accept `*` as a positional timestamp argument, unlike `TS.INCRBY`/`TS.DECRBY`.
