# Validation Summary: How to Build Matchmaking Analytics with ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine, DateTime64, LowCardinality, quantile functions, multiIf, countIf)
- SQL (analytical queries, GROUP BY, HAVING, PARTITION BY)

## Sources Consulted
- ClickHouse documentation on data types: https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse documentation on MergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse documentation on aggregate functions (quantile, countIf, multiIf): https://clickhouse.com/docs/en/sql-reference/aggregate-functions
- ClickHouse documentation on arithmetic operators (division returns Float64): https://clickhouse.com/docs/en/sql-reference/operators#arithmetic
- ClickHouse documentation on date/time functions (toStartOfHour, today, now): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions

## Issues Found
1. **`ORDER BY skill_rating` after `GROUP BY bracket` in the Match Outcome by Skill Bracket query (line 109):** `skill_rating` is not in the GROUP BY clause and is not wrapped in an aggregate function. ClickHouse allows this by implicitly applying `any()`, which picks an arbitrary value from the group. While this happens to produce correct ordering here because the bracket ranges are non-overlapping, it is non-deterministic and poor practice for a tutorial. **Fixed** to `ORDER BY min(skill_rating)` which is explicit and deterministic.

## Review Notes
- All ClickHouse-specific syntax is correct: `quantile(0.95)(column)` parametric function syntax, `LowCardinality(String)`, `DateTime64(3)`, `countIf()`, `multiIf()`, and date arithmetic with integers (`today() - 7`).
- The `/` operator in ClickHouse returns `Float64` for integer operands (unlike many SQL databases), so the win rate calculation `countIf(...) / count() * 100` works correctly without explicit casting.
- The `HAVING` clause correctly references a column alias, which ClickHouse supports.
- The `now()` function returns `DateTime` while `event_time` is `DateTime64(3)`, but ClickHouse handles this comparison via implicit type conversion.
