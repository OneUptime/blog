# Validation Summary: How to Use ClickHouse for Education Analytics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, SQL queries, date/time functions, aggregate functions)
- SQL (CTEs, JOINs, conditional aggregation)

## Sources Consulted
- ClickHouse MergeTree engine docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse data types (LowCardinality, DateTime, UInt/Float): https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse aggregate functions (countIf, count, avg, sum, uniqExact/countDistinct): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference
- ClickHouse date/time functions (today, toStartOfWeek, toYYYYMM): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse conditional functions (nullIf, round): https://clickhouse.com/docs/en/sql-reference/functions/conditional-functions
- ClickHouse CTEs / WITH clause: https://clickhouse.com/docs/en/sql-reference/statements/select/with

## Issues Found
No technical issues found.

- Table schema uses valid ClickHouse data types and a correct `MergeTree` engine definition with `PARTITION BY toYYYYMM(event_time)` and a composite `ORDER BY` tuple — a standard pattern for time-series analytics.
- All aggregate functions (`count`, `countIf`, `countDistinct`, `sum`, `avg`) and conditional helpers (`nullIf`, `round`) are valid ClickHouse functions. `countDistinct` is a valid alias for `uniqExact`.
- Date arithmetic (`today() - 180`, `today() - 14`, `BETWEEN today() - 28 AND today() - 14`) is valid; `Date` minus integer returns `Date`, and comparisons against a `DateTime` column are permitted via implicit conversion.
- CTEs using `WITH name AS (SELECT ...)` are supported in modern ClickHouse, and the subsequent JOIN across the `recent` and `prior` CTEs is syntactically and semantically correct.
- The `HAVING students >= 100` clause correctly references a `SELECT`-level alias, which ClickHouse permits.

## Review Notes
- Minor semantic observation (not a technical error): in the At-Risk Student Detection query, the boundary moment `today() - 14` is included in both the `recent` and `prior` windows. For production use, consider `event_time < today() - 14` on the prior CTE to make the windows strictly non-overlapping.
- The queries assume `event_time` rows exist densely enough for `today() - 84` / `today() - 180` to be meaningful; this is a data-shape consideration, not a correctness issue.
