# Validation Summary: How to Use INTERPOLATE in ClickHouse for Missing Data

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse SQL
- `ORDER BY ... WITH FILL` modifier
- `INTERPOLATE` clause
- Time-series query patterns (gap filling, carry-forward)
- ClickHouse `MergeTree` engine
- DateTime / numeric `INTERVAL` types

## Sources Consulted
- ClickHouse official documentation: ORDER BY clause — https://clickhouse.com/docs/sql-reference/statements/select/order-by
- ClickHouse docs source on GitHub — https://github.com/ClickHouse/ClickHouse/blob/master/docs/en/sql-reference/statements/select/order-by.md
- ClickHouse `FillingTransform.cpp` source code — https://github.com/ClickHouse/ClickHouse/blob/master/src/Processors/Transforms/FillingTransform.cpp
- Related GitHub issues: #33203 (PARTITION BY/POPULATE), #34903 (last values), #41166 (multiple IDs)

## Issues Found
1. **Basic Carry-Forward example — `host` column missing from `INTERPOLATE`.** In the first SELECT the columns selected are `ts, host, cpu_pct`. `host` is neither in `ORDER BY` (so it cannot be treated as a sorting-prefix partition key) nor in the `INTERPOLATE (...)` list. Per the ClickHouse docs ("All missed values of `expr` column will be filled sequentially and other columns will be filled as defaults"), generated rows would receive the default value `''` for `host` — not `'web-1'` as the expected output table claims. Fixed by changing `INTERPOLATE (cpu_pct)` to `INTERPOLATE (host, cpu_pct)` so the previous `host` value is repeated into generated rows. This now matches the expected output.

## Review Notes
- Verified `FROM` is inclusive and `TO` is exclusive against the ClickHouse `FillingTransform.cpp` source code (constraint check uses strict `<`). The post's "Filling Numeric Sequences" claim that `FROM 1 TO 11 STEP 1` produces ranks 1–10 is consistent with this.
- The "Resetting Carry-Forward Between Groups" example correctly relies on `use_with_fill_by_sorting_prefix` (default ON) for per-`host` partitioning of fill rows; the leading `host` in `ORDER BY` preserves the value in generated rows without needing `INTERPOLATE (host)`.
- Documented INTERPOLATE syntax matches the official grammar `INTERPOLATE [(col [AS expr], ... colN [AS exprN])]`.
- Default carry-forward semantics ("If `expr` is not present will repeat previous value") quoted from official docs match the post's description.
- `STEP INTERVAL 1 HOUR` and numeric `STEP 1` forms are both supported per the documentation.
- The post does not mention the `STALENESS` modifier (added more recently) or the `use_with_fill_by_sorting_prefix` setting by name. These are out of scope for an introductory post but could be added in a future revision for completeness.
