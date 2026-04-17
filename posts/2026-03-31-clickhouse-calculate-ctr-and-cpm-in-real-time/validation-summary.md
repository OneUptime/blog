# Validation Summary: How to Calculate CTR and CPM in Real-Time with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL, materialized views, SummingMergeTree engine)
- Real-time analytics
- Ad tech metrics: CTR (click-through rate), CPM (cost per mille)

## Sources Consulted
- ClickHouse docs: CREATE MATERIALIZED VIEW (https://clickhouse.com/docs/en/sql-reference/statements/create/view#materialized-view)
- ClickHouse docs: SummingMergeTree engine (https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree)
- ClickHouse docs: INTERVAL operator (https://clickhouse.com/docs/en/sql-reference/data-types/special-data-types/interval)
- ClickHouse docs: Date/time functions `today()`, `now()`, `toStartOfMinute`, `toStartOfHour`
- ClickHouse docs: Conditional aggregate functions `countIf`, `sumIf`

## Issues Found
1. **Materialized view impression counting bug**: The MV used `count() AS impressions`, which counts every row in `ad_events` (both impression and click event types). Since the adjacent line uses `countIf(event_type = 'click')` — implying clicks are their own event-type rows — `count()` would double-count and inflate the impressions metric. Changed to `countIf(event_type = 'impression') AS impressions` to match the established filtering pattern.
2. **Missing `device_type` column in MV**: The "CPM by Device Type" query groups by `device_type` and selects from `campaign_minute_stats`, but the MV definition did not include `device_type`, so that query would have failed with an unknown-identifier error. Added `device_type` to the MV's `SELECT`, `GROUP BY`, and `ORDER BY` clauses so all downstream queries in the post resolve correctly.

## Review Notes
- CTR/CPM formulas match industry standards.
- `SummingMergeTree` is appropriate here since the aggregate columns (`impressions`, `clicks`, `spend`) are numeric and not part of the sorting key, so they are summed on merges automatically.
- `INTERVAL N HOUR/MINUTE` unquoted syntax and `today() - 1` are both idiomatic and valid in ClickHouse.
- No division-by-zero guards in the CTR/CPM queries. For empty-impression partitions ClickHouse will return `inf` or `nan`. Wrapping with `nullIf(sum(impressions), 0)` or the `if()` function would be safer in production dashboards, but the current queries are syntactically correct.
- `round(..., 4)` on percentage values gives 4 decimal places; this is technically fine but slightly over-precise for CTR display. Not a correctness issue.
