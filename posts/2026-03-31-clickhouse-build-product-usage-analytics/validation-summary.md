# Validation Summary: How to Build Product Usage Analytics with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, SQL, aggregate functions)
- SQL (CTEs, JOINs, window/date functions)
- Product usage analytics concepts (DAU, retention cohorts, feature usage)

## Sources Consulted
- ClickHouse official documentation — Data Types (DateTime64, LowCardinality, UUID): https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse official documentation — MergeTree engine & PARTITION BY: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse official documentation — Date/Time functions (toDate, toYYYYMMDD, toStartOfWeek, dateDiff): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse official documentation — Aggregate functions (uniqExact, count, countIf) and -If combinator: https://clickhouse.com/docs/en/sql-reference/aggregate-functions
- ClickHouse official documentation — CTEs / WITH clause and JOIN syntax: https://clickhouse.com/docs/en/sql-reference/statements/select

## Issues Found
No technical issues found.

All SQL statements use valid, current ClickHouse syntax:
- Column types (`DateTime64(3)`, `UInt64`, `UUID`, `LowCardinality(String)`) are standard.
- `ENGINE = MergeTree()` with `PARTITION BY toYYYYMMDD(ts)` and a compound `ORDER BY` key is idiomatic.
- Aggregate functions (`uniqExact`, `uniqExactIf`, `countIf`) and the `-If` combinator are valid.
- `dateDiff('second', start, end)` uses the correct signature.
- `toStartOfWeek(ts) + INTERVAL 7 DAY` returns a `Date`, which is directly comparable to another `Date`.
- The CTE + JOIN in the retention query is supported by ClickHouse.

## Review Notes
- `toStartOfWeek` defaults to mode 0 (Sunday start). For "signup week" cohorts this is fine, but teams that prefer Monday-start weeks should pass mode 1 explicitly: `toStartOfWeek(ts, 1)`.
- The retention query joins the full `product_events` table on `user_id`; on very large tables this can be expensive. A pre-aggregated cohort table or materialized view (mentioned in the Summary) would scale better in production.
- The `session_id` is defined as a `UUID`, but sessions are typically inferred from inactivity gaps in event streams. If the ingestion pipeline doesn't assign session IDs, readers will need an upstream step to generate them — not a correctness issue, just a caveat.
- Partitioning daily via `toYYYYMMDD(ts)` is reasonable for small-to-medium volumes, but very high-volume workloads may prefer `toYYYYMM(ts)` to avoid excessive parts. Not incorrect, just a scaling consideration.
