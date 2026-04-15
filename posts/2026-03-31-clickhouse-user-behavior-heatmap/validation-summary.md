# Validation Summary: How to Build a User Behavior Heatmap with ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, MergeTree engine, window functions, aggregate functions)
- SQL (DDL, DML, window functions, scalar subqueries)

## Sources Consulted
- ClickHouse documentation: Data Types (UInt64, Float32, LowCardinality, DateTime) — https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse documentation: MergeTree engine family — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse documentation: Aggregate functions (count, uniq) — https://clickhouse.com/docs/en/sql-reference/aggregate-functions
- ClickHouse documentation: Window functions — https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse documentation: Arithmetic operators and type promotion rules — https://clickhouse.com/docs/en/sql-reference/operators
- ClickHouse documentation: dateDiff function — https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#datediff
- ClickHouse documentation: round function — https://clickhouse.com/docs/en/sql-reference/functions/rounding-functions#round

## Issues Found

### 1. Integer division in Scroll Depth Distribution query (line 62)
- **What was wrong:** `round(count() / max(count()) OVER () * 100, 2)` — both `count()` (UInt64) and `max(count()) OVER ()` (UInt64) are integers, so ClickHouse performs integer division. The result would be 0 for all rows except the one with the maximum count (which would be 1), then multiplied by 100 yields either 0 or 100 instead of a proper percentage.
- **What was changed:** Reordered to `round(count() * 100.0 / max(count()) OVER (), 2)`. Multiplying by the float literal `100.0` first promotes the expression to Float64 before division occurs, producing correct decimal percentages.
- **Why:** ClickHouse follows C-style integer division semantics — dividing two integers truncates toward zero. This is a common pitfall when computing ratios or percentages.

### 2. Integer division in Click Heatmap by Element query (line 79)
- **What was wrong:** `round(uniq(user_id) / (SELECT uniq(user_id) ...) * 100, 2)` — same integer division issue. `uniq()` returns UInt64, so the division truncates to 0 or 1 before the multiplication by 100.
- **What was changed:** Reordered to `round(uniq(user_id) * 100.0 / (SELECT uniq(user_id) ...), 2)`. The float literal `100.0` forces float promotion before the division.
- **Why:** Same root cause as issue 1.

## Review Notes
- The Scroll Depth Distribution query references a `scroll_events` table that is never defined in the post. The post only provides a CREATE TABLE for `click_events`. This is not technically incorrect (the query is valid assuming the table exists), but readers would benefit from either a schema definition for `scroll_events` or a note that it follows a similar structure.
- The bucketing approach using `round(x / N) * N` produces center-aligned buckets (e.g., values 0-2.5 map to bucket 0, values 2.5-7.5 map to bucket 5). An alternative using `floor(x / N) * N` would produce left-aligned buckets, which is sometimes more intuitive for heatmap grids. Both approaches are valid.
- All ClickHouse-specific functions (`toYYYYMM`, `toUInt8`, `uniq`, `dateDiff`, `today()`, `LowCardinality`) are used correctly and are current as of ClickHouse 24.x+.
- The `dateDiff` usage in the Rage Click Detection HAVING clause correctly uses aggregate functions (`min`, `max`) as arguments, which is valid in ClickHouse.
