# Validation Summary: How to Use LAG() Function in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (SQL window functions)
- ClickHouse MergeTree engine
- SQL window functions (`lagInFrame`)
- Time-series / analytics query patterns

## Sources Consulted
- [ClickHouse docs — `lagInFrame`](https://clickhouse.com/docs/sql-reference/window-functions/lagInFrame)
- [ClickHouse docs — Window Functions overview](https://clickhouse.com/docs/en/sql-reference/window-functions)
- [Altinity KB — Lag / Lead](https://kb.altinity.com/altinity-kb-queries-and-syntax/lag-lead/)
- [ClickHouse docs — `dateDiff`](https://clickhouse.com/docs/sql-reference/functions/date-time-functions#datediff)

## Issues Found
1. **Incorrect function name — critical.** The entire post used `LAG()` in all code examples. ClickHouse does not support the standard SQL `LAG()` function; the correct native function is `lagInFrame(expr[, offset[, default]])`. Every code example would have failed with an "unknown function" error in ClickHouse. I replaced all `LAG(...)` calls with `lagInFrame(...)` and updated the prose and summary to introduce `lagInFrame` as ClickHouse's version of `LAG()`.
2. **Missing note about frame semantics.** Unlike standard SQL `LAG()`, `lagInFrame` respects the active window frame. I added a brief note explaining that `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` is required for behavior identical to the SQL-standard `LAG()`, so readers aren't surprised by subtle frame-boundary effects.
3. **`IS NOT NULL` check in the state-transitions query.** `lagInFrame` returns the type's default value (an empty string for `String` / `LowCardinality(String)`) when no previous row exists — not NULL. The original `WHERE prev_status IS NOT NULL` filter would never exclude the first row of each partition. I changed it to `WHERE prev_status != ''` and added a short inline comment explaining what the filter is doing.
4. **Division-by-zero risk in month-over-month growth query.** The original query computed `(revenue - LAG(...)) / LAG(...) * 100` without `nullIf` protection, so the first row would divide by 0 (since the query passed `0` implicitly as the default via the two-arg form). I wrapped the divisor in `nullIf(..., 0)` to mirror the safer pattern used in the adjacent YoY example. (The two-arg form of `lagInFrame` returns the type default of 0 for numeric columns, which would otherwise cause a divide-by-zero.)

## Review Notes
- The post's title and section headings still read "LAG()". I intentionally kept those since they match how users search for this concept; the opening paragraph now makes it explicit that ClickHouse's equivalent is `lagInFrame`.
- Every `CREATE TABLE` statement is syntactically valid ClickHouse DDL. Types (`Date`, `DateTime`, `Float64`, `UInt16`, `UInt32`, `UInt64`, `LowCardinality(String)`) and the `MergeTree` engine with `ORDER BY` clauses are all correct.
- `dateDiff('day', start, end)` is valid ClickHouse syntax.
- `nullIf()` and `round()` are correctly used.
- The example queries assume the data tables contain sample rows; no sample inserts are shown, but that's a reasonable tutorial convention.
- For readers on older ClickHouse versions: window function support has been stable since 21.8 (GA). No version caveat needed beyond that.
