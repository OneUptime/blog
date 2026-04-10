# Validation Summary: How to Use TS.REVRANGE in Redis Time Series for Reverse Queries

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis
- Redis Time Series (RedisTimeSeries module)
- TS.REVRANGE command
- TS.RANGE, TS.GET (comparison)

## Sources Consulted
- Official Redis documentation for TS.REVRANGE: https://redis.io/commands/ts.revrange/
- Official Redis documentation for TS.RANGE: https://redis.io/commands/ts.range/
- Official Redis documentation for TS.GET: https://redis.io/commands/ts.get/
- Redis Time Series documentation: https://redis.io/docs/data-types/timeseries/

## Issues Found

### 1. Argument order reversed throughout all examples (Critical)
**What was wrong:** Every `TS.REVRANGE` example used `+ -` (fromTimestamp=+, toTimestamp=-), swapping the arguments. In both `TS.RANGE` and `TS.REVRANGE`, `fromTimestamp` is the lower bound (start) and `toTimestamp` is the upper bound (end). `-` means minimum timestamp, `+` means maximum timestamp. Using `+ -` puts the higher bound first, which would return an empty result set.
**What was changed:** All examples corrected from `TS.REVRANGE key + -` to `TS.REVRANGE key - +`.

### 2. Parameter descriptions were swapped (Critical)
**What was wrong:** The post described `fromTimestamp` as the "end boundary" with `+` for most recent data, and `toTimestamp` as the "start boundary" with `-` for oldest data. This is backwards.
**What was changed:** Corrected to: `fromTimestamp` is the start/lower boundary (use `-` for minimum), `toTimestamp` is the end/upper boundary (use `+` for maximum).

### 3. Incorrect note about bound semantics (Critical)
**What was wrong:** The note stated "fromTimestamp is still the higher bound and toTimestamp is the lower bound, same as TS.RANGE." This is the opposite of reality — in both commands, fromTimestamp is the lower bound and toTimestamp is the upper bound.
**What was changed:** Corrected the note to accurately state that fromTimestamp is the lower bound and toTimestamp is the upper bound, and the only difference from TS.RANGE is the result ordering.

### 4. Invalid negative timestamps used as relative time offsets (Moderate)
**What was wrong:** Examples used `-300000` and `-3600000` as timestamp arguments, seemingly intending "5 minutes ago" and "1 hour ago". Redis Time Series does not support relative timestamps — these would be interpreted as invalid negative integers. Timestamps must be actual Unix timestamps in milliseconds, or the special `-`/`+` tokens.
**What was changed:** Replaced with actual example Unix timestamps and added comments instructing readers to compute the timestamp in their application (current time in ms minus the offset).

### 5. Section title mismatch (Minor)
**What was wrong:** Section titled "Get Last 10 Samples" but the code used `COUNT 3`.
**What was changed:** Title corrected to "Get Last 3 Samples" to match the example.

### 6. Invalid pagination syntax (Moderate)
**What was wrong:** The pagination example used `(T_last - 1)` as a single argument, which is not valid Redis syntax. Also the argument order was reversed.
**What was changed:** Corrected to use `(T_last` as the exclusive upper bound (toTimestamp) with the proper `TS.REVRANGE events - (T_last COUNT 100` syntax, using Redis Time Series' `(` prefix for exclusive bounds.

### 7. TS.RANGE comparison used `0` instead of `-` (Minor)
**What was wrong:** The TS.RANGE vs TS.REVRANGE comparison used `TS.RANGE temperature 0 +` — while `0` works, using `-` is idiomatic and consistent with the TS.REVRANGE example.
**What was changed:** Changed to `TS.RANGE temperature - +` for consistency.

## Review Notes
- The syntax block is correct and matches the official documentation.
- The mermaid diagram was also updated to reflect the corrected argument order.
- The performance considerations section is accurate — TS.REVRANGE with COUNT does scan from the latest chunk backward and stops early.
- The TS.GET comparison is accurate.
- Overall the conceptual explanations of what TS.REVRANGE does and its use cases are sound — the issues were primarily with the concrete command syntax having reversed arguments and invalid timestamp values.
