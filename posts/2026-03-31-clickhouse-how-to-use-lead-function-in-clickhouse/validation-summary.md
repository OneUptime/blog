# Validation Summary: How to Use LEAD() Function in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- SQL window functions (`leadInFrame`, `lagInFrame`)
- MergeTree table engine
- ClickHouse data types: `UInt64`, `UInt32`, `DateTime`, `Date`, `Float64`, `LowCardinality(String)`
- `dateDiff` function

## Sources Consulted
- [ClickHouse Window Functions documentation](https://clickhouse.com/docs/sql-reference/window-functions)
- [ClickHouse leadInFrame documentation](https://clickhouse.com/docs/sql-reference/window-functions/leadInFrame)
- [ClickHouse leadInFrame source on GitHub](https://github.com/ClickHouse/ClickHouse/blob/master/docs/en/sql-reference/window-functions/leadInFrame.md)
- [Altinity KB: Lag / Lead](https://kb.altinity.com/altinity-kb-queries-and-syntax/lag-lead/)
- [GitHub issue #72354 — leadInFrame returning only defaults with OVER (ORDER BY ...)](https://github.com/ClickHouse/ClickHouse/issues/72354)

## Issues Found
The original post was written as if ClickHouse supported the standard SQL `LEAD()` (and `LAG()`) window function. It does not. ClickHouse only implements `leadInFrame()` and `lagInFrame()`, which differ from standard SQL in two important ways:

1. They are named differently — the standard-SQL `LEAD`/`LAG` identifiers are not recognized.
2. They respect the window frame. The default frame in the presence of `ORDER BY` is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`, which excludes future rows — so `leadInFrame` with that default frame returns only the default value. To get standard forward-looking LEAD semantics, you must explicitly add `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`.

Fixes applied:
- Replaced every `LEAD(...)` call with `leadInFrame(...)` and every `LAG(...)` call with `lagInFrame(...)`.
- Added `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` to every `OVER (...)` clause where future rows are needed. Used `WINDOW w AS (...)` named-window syntax where the same frame was repeated to avoid verbose duplication.
- Updated the "What Is …" section to describe the correct ClickHouse function, note the absence of standard `LEAD()`, and warn about the window-frame behaviour.
- Rewrote the "Last event in each session" query: `leadInFrame` does not return `NULL` by default — it returns the column type's default — so the `IS NULL` filter would never match. Replaced with an explicit sentinel default (`toDateTime(0)`) and an equality filter.
- Rewrote the "Page Flow" query: replaced the `IS NOT NULL` filter with an empty-string sentinel (`''`), consistent with `leadInFrame` behaviour for `String`.
- Rewrote the "Detecting Intervals" and "Sales Forecasting" queries to hoist the `leadInFrame` calls into a subquery (the original referenced the window expression in the outer `WHERE`, which is not valid) and use a sentinel default to drop the final row per partition.
- Updated section headings, summary paragraph, and the "LEAD vs LAG" comparison table to use the correct ClickHouse function names.

## Review Notes
- The post retains its original title "How to Use LEAD() Function in ClickHouse" and the `LEAD` tag so the content is still discoverable by readers searching for the standard-SQL name. The body now makes the ClickHouse-specific naming clear.
- `leadInFrame` does not accept `NULL` as a default out of the box (the default is typed); if a Nullable column is desired, callers need to wrap with `toNullable(...)` or supply a `Nullable`-typed expression. The examples sidestep this by using typed sentinels.
- GitHub issue #72354 (opened Nov 2024) reports that `leadInFrame` returns only the default when used with `OVER (ORDER BY ...)` and no explicit frame. The fixed queries use explicit `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`, which avoids that code path and is also what the official docs example uses — so the examples should work on current ClickHouse versions regardless of how that issue is ultimately resolved.
