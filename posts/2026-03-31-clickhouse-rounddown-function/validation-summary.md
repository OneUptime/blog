# Validation Summary: How to Use roundDown() Function in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, MergeTree engine)
- `roundDown()` rounding/bucketing function
- `arrayJoin()` function
- CASE expressions for label mapping

## Sources Consulted
- ClickHouse official documentation — Rounding Functions: https://clickhouse.com/docs/en/sql-reference/functions/rounding-functions#rounddownx-n
- ClickHouse source code (`src/Functions/FunctionsRound.h`) for edge-case behavior confirmation

## Issues Found
No technical issues found.

## Review Notes
- The post states the array "must be a sorted array." In practice, ClickHouse sorts the array internally (and deduplicates it), so pre-sorting is not strictly required. However, recommending sorted arrays is reasonable advice and does not cause any functional issues.
- The post states the array should be "of the same numeric type as x." ClickHouse performs implicit type promotion, so exact type matching is not strictly necessary. Again, this is a reasonable simplification for a tutorial audience.
- All five code examples (basic usage, price tiers, latency buckets, age demographics, grade discretization) were traced through and produce correct results matching the CASE labels.
- The `roundDown(0.5, [1, 5, 10, 50, 100])` example correctly returns 1 (the lowest bound), consistent with documented behavior: "If the value is less than the lowest bound, the lowest bound is returned."
