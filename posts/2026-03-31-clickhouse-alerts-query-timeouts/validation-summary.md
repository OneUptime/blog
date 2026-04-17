# Validation Summary: How to Set Up ClickHouse Alerts for Query Timeouts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (system.query_log, system.processes, KILL QUERY, user profiles)
- ClickHouse settings (`max_execution_time`, `timeout_overflow_mode`)
- Prometheus alerting rules (PromQL)
- ClickHouse built-in Prometheus `/metrics` endpoint
- `clickhouse-client` CLI

## Sources Consulted
- [system.query_log documentation](https://clickhouse.com/docs/en/operations/system-tables/query_log) — verified column names, `type` enum values (`QueryStart`, `QueryFinish`, `ExceptionBeforeStart`, `ExceptionWhileProcessing`)
- [ClickHouse Prometheus integration docs](https://clickhouse.com/docs/integrations/prometheus) — verified actual metric prefixes (`ClickHouseProfileEvents_*`, `ClickHouseMetrics_*`, `ClickHouseAsyncMetrics_*`)
- ClickHouse documentation for `KILL QUERY`, `max_execution_time`, `timeout_overflow_mode` settings, and `system.processes` table

## Issues Found
1. **Incorrect Prometheus metric names.** The original Prometheus rules referenced `ClickHouseQueryExceptions`, `ClickHouseQueries`, and `ClickHouseQueryDurationMs{quantile="0.99"}`. None of these are real metrics exposed by ClickHouse's built-in `/metrics` endpoint. ClickHouse exposes profile events with the `ClickHouseProfileEvents_` prefix and does not natively emit a quantile-based query duration histogram.
   - **Fix:** Rewrote the two alerts using real metrics: `ClickHouseProfileEvents_FailedQuery / ClickHouseProfileEvents_Query` for failure rate, and `rate(ClickHouseProfileEvents_QueryTimeMicroseconds) / rate(ClickHouseProfileEvents_Query) / 1e6 > 30` for the average query duration alert (since no native quantile histogram exists). Updated the alert names and summaries accordingly.

All other technical content was verified as accurate:
- `TIMEOUT_EXCEEDED` is a real ClickHouse exception name.
- `system.query_log` columns (`query_id`, `user`, `event_time`, `query_duration_ms`, `exception`, `type`, `event_date`) and the `type = 'ExceptionWhileProcessing'` filter are correct.
- `system.processes` columns (`query_id`, `user`, `elapsed`, `memory_usage`, `query`) are correct; `elapsed` is in seconds.
- `KILL QUERY WHERE query_id = '...'` syntax is valid.
- `max_execution_time` and `timeout_overflow_mode` (with value `throw`) are valid user-profile settings.

## Review Notes
- The `dashboard_user` / `analyst` profile XML snippet is illustrative; in practice users still need a `<users>` section that references these profiles, but that's outside the scope of this post.
- ClickHouse's native `/metrics` endpoint only exposes counters and gauges. If readers want true latency quantiles, they need a sidecar exporter (e.g., the community ClickHouse exporter) or to compute quantiles from `system.query_log` via a query-driven exporter — worth mentioning in a future revision.
- Polling `system.processes` every 30 seconds (as suggested) creates a small but non-zero load; for very busy clusters, increasing the poll interval or filtering by user/initial_query_id may be preferable.
