# Validation Summary: How to Build Error Rate Tracking with Materialized Views in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide — practical walkthrough with SQL examples for building incremental error-rate aggregation in ClickHouse.

## Technologies Covered
- ClickHouse
- MergeTree table engine
- SummingMergeTree table engine
- ClickHouse Materialized Views (incremental, with `TO` target table)
- ClickHouse aggregate functions (`count`, `countIf`, `toStartOfMinute`, `nullIf`, `round`)
- ClickHouse `WITH` (CTE) and `INTERVAL` syntax
- SLO / error-budget burn-rate alerting (Google SRE Workbook)

## Sources Consulted
- ClickHouse incremental materialized view docs: https://clickhouse.com/docs/materialized-view/incremental-materialized-view
- ClickHouse SummingMergeTree engine docs: https://clickhouse.com/docs/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse aggregate functions (`count`, `countIf`): https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/count
- ClickHouse date/time functions (`toStartOfMinute`, `toYYYYMM`): https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- Google SRE Workbook, Chapter 5 "Alerting on SLOs", multi-window multi-burn-rate (Tables 5-2 / 5-4): https://sre.google/workbook/alerting-on-slos/

## Issues Found
- **Burn-rate claim was incorrect.** The post stated: *"A burn rate > 14.4 means the error budget will be exhausted in under an hour."* That is wrong. Per the Google SRE Workbook, a burn rate of 14.4 sustained over 1 hour consumes 2% of a 30-day error budget — full exhaustion would take ~50 hours. To exhaust a 99.9% / 30-day budget in 1 hour requires a burn rate of ~720, not 14.4. The 14.4 figure is the standard *fast-burn page* threshold (2%/1h alerting window), not the exhaust-in-an-hour threshold.
  - Fix: replaced the sentence with: *"A burn rate of 14.4 sustained over 1 hour consumes 2% of a 30-day error budget and is the standard fast-burn page threshold from the Google SRE Workbook."*

## Review Notes
- All ClickHouse SQL is syntactically valid and matches the official idiomatic pattern for `SummingMergeTree` + `MATERIALIZED VIEW ... TO` (target table columns and ORDER BY align with the MV's GROUP BY; `count()`/`countIf()` return UInt64 matching the target columns).
- The MV is created without `POPULATE`, which is the recommended approach (only forward fill on new inserts); historical backfill would need a separate `INSERT INTO ... SELECT` against the base table.
- The "Alerting Query Pattern" example divides without a `nullIf` guard. Not strictly incorrect (an empty 2-minute window simply omits the row from results because the HAVING comparison on NaN is false), but a `nullIf(sum(total_requests), 0)` would be more defensive. Left as-is since it is not technically wrong.
- The `error_timeouts` column treats any request with `duration_ms > 5000` as a timeout error, which is a definitional choice rather than a strict error condition — readers may want to combine it with status-code logic in real deployments.
- Partitioning by `toYYYYMM(window_start)` on the aggregated table is appropriate for retention/management; same as the base table.
