# Validation Summary: How to Handle Multiple Time Granularities in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine, materialized views, TTL policies)
- SQL (DDL, aggregation functions, UNION ALL)
- Python (application-side query routing)

## Sources Consulted
- ClickHouse documentation on MergeTree engine and TTL: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse documentation on materialized views: https://clickhouse.com/docs/en/sql-reference/statements/create/view#materialized-view
- ClickHouse documentation on date/time functions (`toStartOfMinute`, `toStartOfHour`): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse documentation on `LowCardinality` type: https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality
- ClickHouse documentation on aggregate functions (`avg`, `min`, `max`, `count`, `sum`): https://clickhouse.com/docs/en/sql-reference/aggregate-functions

## Issues Found

1. **Incorrect average-of-averages in chained materialized view**: The `mv_to_1h` materialized view used `avg(avg_val)` to compute hourly averages from minute-level pre-aggregated data. This is mathematically incorrect because averaging pre-computed averages does not account for differing row counts per minute bucket. Fixed to `sum(avg_val * cnt) / sum(cnt)` which computes the correct weighted average.

2. **Wrong column name in Python query for raw table**: The query routing function always selected `avg_val` regardless of the table. However, `metrics_raw` has a `value` column, not `avg_val`, so the generated SQL would fail when querying the raw table. Fixed by introducing a `val_col` variable that maps to `value` for the raw table and `avg_val` for the aggregated tables.

3. **Non-existent column reference in UNION ALL query**: The first SELECT in the UNION ALL example used `SELECT ts AS bucket` but the `metrics_1h` table has `ts_bucket`, not `ts`. The WHERE clause correctly referenced `ts_bucket`, making the SELECT inconsistent and erroneous. Fixed to `SELECT ts_bucket AS bucket`.

## Review Notes
- The Python query routing example uses string interpolation to build SQL, which is vulnerable to SQL injection. This is acceptable for a blog post illustrating the pattern but should not be used in production without parameterized queries.
- The chained materialized view pattern (mv_to_1h reading from metrics_1m) works in ClickHouse because MVs trigger on any INSERT to the source table, including inserts from other MVs. This is correct but worth noting as a ClickHouse-specific behavior.
- The TTL thresholds and query routing thresholds are well-aligned (2h raw, 3d minute, 90d hourly), which is good design practice.
