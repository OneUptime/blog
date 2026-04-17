# Validation Summary: How to Build Cohort Analysis Queries in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL, MergeTree engine)
- ClickHouse aggregate/parametric functions: `retention`, `min`, `count`, `uniqExact` via `count(DISTINCT ...)`
- ClickHouse date functions: `toStartOfMonth`, `dateDiff`

## Sources Consulted
- ClickHouse parametric aggregate functions docs (retention): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/parametric-functions
- ClickHouse date/time functions (toStartOfMonth, dateDiff): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse MergeTree engine docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse CTE / WITH clause docs: https://clickhouse.com/docs/en/sql-reference/statements/select/with

## Issues Found
- The `retention` example referenced an undefined column `signup_time` (`created_at >= signup_time + INTERVAL 7 DAY`). The `user_events` table defined earlier in the post only has `user_id`, `event_type`, and `created_at`, so this query would fail with a "missing columns" error. Replaced the example with a valid two-condition `retention` call (`event_type = 'signup'`, `event_type = 'purchase'`) and added a brief sentence describing how `retention`'s element-pairing semantics actually work, since that behavior is non-obvious.

## Review Notes
- The CTE syntax, `MergeTree` table definition, `toStartOfMonth`, `dateDiff('month', ...)`, `INTERVAL n DAY`, and `count(DISTINCT ...)` usages are all valid current ClickHouse syntax.
- In the "Computing Monthly Retention" query, the `count(DISTINCT a.user_id)` is technically redundant because `user_activity` already deduplicates `(user_id, active_month)` pairs, but it is not incorrect — left as written to preserve the author's style.
- The `retention` aggregate function in ClickHouse evaluates each condition per row, so true time-windowed cohort logic generally requires either a fixed/explicit date condition or a join with each user's first-event time before the aggregation. The simplified example now reflects how the function is typically used directly against the events table.
