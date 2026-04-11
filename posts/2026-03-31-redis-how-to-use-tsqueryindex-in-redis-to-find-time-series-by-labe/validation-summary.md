# Validation Summary: How to Use TS.QUERYINDEX in Redis to Find Time Series by Labels

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- RedisTimeSeries module
- TS.QUERYINDEX command
- TS.CREATE command
- Python redis-py client library

## Sources Consulted
- Official Redis TS.QUERYINDEX documentation: https://redis.io/docs/latest/commands/ts.queryindex/
- Official Redis TimeSeries data type documentation: https://redis.io/docs/latest/develop/data-types/timeseries/
- redis-py library TimeSeries client source and documentation

## Issues Found

### 1. `label=` and `label!=` filter meanings were swapped (Critical)
- **What was wrong:** The filter expression table stated that `label=` means "Label has no value (label exists but empty)" and `label!=` means "Label does not exist." Per the official Redis documentation, the meanings are the opposite: `label=` means the time series does NOT have a label named `label` (label does not exist), and `label!=` means the time series HAS a label named `label` (label exists with any value).
- **What was changed:** Corrected the table so `label=` reads "Label does not exist" and `label!=` reads "Label exists (any value)."
- **Why:** This is a critical semantic error that would cause users to write incorrect filter queries.

### 2. Incorrect syntax for label existence check
- **What was wrong:** Line 100 used `region!=""` (with quoted empty string) to check that a region label exists. This is not the documented syntax.
- **What was changed:** Corrected to `region!=` (no quotes, no value) which is the proper documented syntax for checking that a label exists.
- **Why:** The quoted empty string form is not part of the official filter expression syntax and could produce unexpected results.

## Review Notes
- The Python examples use `r.execute_command('TS.QUERYINDEX', ...)` despite already creating a `ts = r.ts()` TimeSeries client. The more idiomatic approach would be `ts.queryindex([...])`. This is functional but inconsistent. Not changed since the code works correctly as written.
- The official docs require that at least one filter expression must be a value-matching filter (`label=value` or `label=(v1,v2,...)`). The blog does not mention this constraint, but all examples in the post satisfy it, so no incorrect usage is demonstrated.
