# Validation Summary: How to Track Data Completeness Metrics in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, MergeTree engine, window functions, aggregate combinators)

## Sources Consulted
- ClickHouse documentation on arithmetic operators (`/` returns Float64 for integer operands vs `intDiv` for integer division)
- ClickHouse documentation on aggregate function combinators (`countIf`)
- ClickHouse documentation on window functions (`lagInFrame` vs `lag`)
- ClickHouse documentation on `LowCardinality` data type
- ClickHouse documentation on `HAVING` clause (requires `GROUP BY`; window functions execute after `HAVING` in evaluation order)
- ClickHouse documentation on Date type arithmetic (`today() - N`)

## Issues Found
1. **HAVING without GROUP BY referencing a window function alias** (Alerting on Completeness Drops section): The original query used `HAVING completeness_pct < prev_completeness - 5` without a `GROUP BY` clause, where `prev_completeness` was a window function alias. This is invalid in ClickHouse — `HAVING` requires `GROUP BY`, and window functions are evaluated after `HAVING` in SQL execution order, so their aliases cannot be referenced there. **Fix:** Wrapped the query in a subquery and moved the filter condition to an outer `WHERE` clause, which correctly filters on the window function result after it has been computed.

## Review Notes
- All other SQL examples are syntactically correct and use valid ClickHouse functions and types.
- ClickHouse's `/` operator returns `Float64` even for integer operands, so the null rate and coverage rate calculations (e.g., `countIf(...) / count()`) correctly return decimal values without needing explicit casts.
- `lagInFrame()` is used instead of the standard `lag()`. Both work here, but `lagInFrame` respects the window frame specification while `lag` always operates on the full partition. For this use case with a default frame, either would produce correct results.
- The post correctly notes that columns need to be Nullable for `IS NULL` checks to be meaningful — ClickHouse columns are non-nullable by default, so readers should ensure their schema uses `Nullable(T)` types where null tracking is needed.
