# Validation Summary: How to Find Consecutive Values in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, MergeTree engine)
- SQL window functions (`row_number() OVER (...)`)
- Common Table Expressions (WITH clause)
- Date/interval arithmetic (`toIntervalDay`)
- `VALUES` table expression

## Sources Consulted
- [ClickHouse WITH Clause docs](https://clickhouse.com/docs/sql-reference/statements/select/with)
- [ClickHouse FROM Clause docs](https://clickhouse.com/docs/sql-reference/statements/select/from)
- [ClickHouse VALUES table function docs](https://clickhouse.com/docs/sql-reference/table-functions/values)
- [ClickHouse date-time functions docs](https://clickhouse.com/docs/sql-reference/functions/date-time-functions)
- [ClickHouse GitHub discussion #48820 — nested CTE support](https://github.com/ClickHouse/ClickHouse/discussions/48820)

## Issues Found
- **Logical bug in "Detecting Consecutive Errors in Logs" query.** The original CTE filtered `WHERE is_error = 1` *before* computing the two `row_number()` window functions. After that filter, every remaining row has `is_error = 1`, so `row_number() OVER (PARTITION BY service ORDER BY log_time)` and `row_number() OVER (PARTITION BY service, is_error ORDER BY log_time)` produce identical sequences. The group key `(rn - rn_per_status)` is then always `0`, which collapses every error for a service into a single group regardless of whether non-error rows appeared between them — defeating the purpose of the islands-and-gaps pattern. Fix: move `WHERE is_error = 1` out of the CTE into the outer query, so both window functions see the full, unfiltered ordering over all service logs, and only the final aggregation is restricted to error rows.

## Review Notes
- The `VALUES` table-expression syntax used in "Finding Consecutive Numbers" (`FROM (VALUES (1), (2), ...) AS t(value)`) is supported in recent ClickHouse versions (26.3+). On older ClickHouse releases, readers may need to fall back to `SELECT * FROM VALUES('value Int32', 1, 2, ...)` or `SELECT arrayJoin([...]) AS value`.
- The nested `WITH ... AS (WITH ... AS (...) SELECT ...) SELECT ...` in "Finding the Longest Streak Per User" is accepted by ClickHouse's parser (no column-list notation is used, which is the case that fails). A flat, comma-separated chain of CTEs would be the more idiomatic SQL style, but the nested form as written is valid — no change required.
- `toDate(activity_date)` in the group-key expression is redundant since `activity_date` is already declared as `Date`, but harmless — left unchanged to preserve the author's voice.
- The sample-data annotation ("User 1 has streaks of 3, 2, and 1 day(s)") correctly matches the inserted rows: 2024-01-01..03 (3 days), 2024-01-05..06 (2 days), 2024-01-10 (1 day).
