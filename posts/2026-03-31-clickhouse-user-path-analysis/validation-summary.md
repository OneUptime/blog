# Validation Summary: How to Implement User Path Analysis in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, window functions, aggregate functions)
- ClickHouse `lead()` window function
- ClickHouse `sequenceMatch()` parametric aggregate function
- ClickHouse `groupArray()` aggregate function
- ClickHouse `arrayStringConcat()` string function
- ClickHouse `uniq()` aggregate function
- ClickHouse `first_value()` window function

## Sources Consulted
- [ClickHouse Window Functions - lead](https://clickhouse.com/docs/sql-reference/window-functions/lead)
- [ClickHouse Parametric Aggregate Functions (sequenceMatch)](https://clickhouse.com/docs/sql-reference/aggregate-functions/parametric-functions)
- [ClickHouse first_value Window Function](https://clickhouse.com/docs/sql-reference/window-functions/first_value)
- [ClickHouse String Splitting/Merging Functions (arrayStringConcat)](https://clickhouse.com/docs/sql-reference/functions/splitting-merging-functions)
- [ClickHouse Aggregate Functions Reference (uniq, count, groupArray)](https://clickhouse.com/docs/sql-reference/aggregate-functions/reference)
- [ClickHouse Rounding Functions (round)](https://clickhouse.com/docs/sql-reference/functions/rounding-functions)
- [ClickHouse Arithmetic Functions](https://clickhouse.com/docs/sql-reference/functions/arithmetic-functions)
- [ClickHouse Date Type - arithmetic operations](https://clickhouse.com/docs/sql-reference/data-types/date)
- [GitHub Issue #19857 - Nested aggregate in window function not supported](https://github.com/ClickHouse/ClickHouse/issues/19857)

## Issues Found
- **Nested aggregate in window function (`sum(count()) OVER ()`)**: In the "Top Next Actions" query, the expression `round(count() / sum(count()) OVER () * 100, 2)` used a nested aggregate function inside a window function. ClickHouse does not support this pattern (confirmed by GitHub issue #19857). Fixed by wrapping the GROUP BY in a subquery first, then applying `sum(occurrences) OVER ()` as a window function on the already-aggregated `occurrences` column. This avoids nesting aggregates and is fully supported in ClickHouse.

## Review Notes
- The `today() - 7` date arithmetic syntax is valid in ClickHouse — the Date type supports subtraction of integers (interpreted as days).
- The `sequenceMatch('(?1)(?t<=1800)(?2)')` pattern syntax is correct for specifying a 1800-second (30-minute) time constraint between events.
- The `uniq()` function provides approximate unique counts (relative error typically under 1.6%). If exact counts are needed, `uniqExact()` could be used instead, but `uniq()` is the standard recommendation for analytics workloads.
- The funnel analysis query uses `UNION ALL` with separate `uniq()` calls per step, which counts users independently at each level rather than enforcing sequential completion. This is noted as a simple funnel approach in the post, which is appropriate for the tutorial context.
- The `groupArray()` function collects values in insertion order within the group, which is correct for building session paths when data is already ordered by `event_time` in the source table; however, for guaranteed ordering, `groupArray` combined with `ORDER BY` in the subquery or `arraySort` could be considered.
