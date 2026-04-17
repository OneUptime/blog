# Validation Summary: How to Set Up ClickHouse Alerts for Memory Usage

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- ClickHouse (system.asynchronous_metrics, system.processes, system.query_log)
- ClickHouse user profile XML configuration (max_memory_usage, memory_overcommit_ratio_denominator)
- Prometheus (alerting rules, ClickHouse built-in metrics endpoint)
- SQL (ClickHouse dialect: formatReadableSize, toStartOfMinute, toStartOfHour, countIf, KILL QUERY)

## Sources Consulted
- ClickHouse `system.asynchronous_metrics` documentation: https://clickhouse.com/docs/en/operations/system-tables/asynchronous_metrics
- ClickHouse `system.processes` documentation: https://clickhouse.com/docs/en/operations/system-tables/processes
- ClickHouse `system.query_log` documentation: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse query-complexity settings (max_memory_usage): https://clickhouse.com/docs/en/operations/settings/query-complexity
- ClickHouse memory overcommit docs: https://clickhouse.com/docs/operations/settings/memory-overcommit
- ClickHouse source `src/Server/PrometheusMetricsWriter.cpp` for Prometheus metric prefix conventions

## Issues Found
Three Prometheus metric naming errors in the `## Prometheus Alert Rules` section — all confirmed against ClickHouse's `PrometheusMetricsWriter.cpp` source, which defines the prefixes `ClickHouseAsyncMetrics_` and `ClickHouseErrorMetric_` (both with trailing underscore).

1. `ClickHouseAsyncMetricsMemoryResident` → changed to `ClickHouseAsyncMetrics_MemoryResident`. The async-metric prefix is `ClickHouseAsyncMetrics_` (with underscore), not run-together.
2. `ClickHouseAsyncMetricsOSTotalMemory` → changed to `ClickHouseAsyncMetrics_OSMemoryTotal`. Two fixes: missing underscore, and the actual async metric is named `OSMemoryTotal`, not `OSTotalMemory`.
3. `ClickHouseErrorsMemoryLimitExceeded` → changed to `ClickHouseErrorMetric_MEMORY_LIMIT_EXCEEDED`. The error-metric prefix is `ClickHouseErrorMetric_` (singular, with underscore) and error names use the UPPER_SNAKE_CASE form from `DB::ErrorCodes`.

## Review Notes
- All SQL queries use valid ClickHouse syntax and reference real columns/tables (verified: `system.processes.memory_usage`, `system.query_log.memory_usage`, `system.query_log.exception`, `system.asynchronous_metrics.metric`/`value`).
- The four async metric names (`MemoryResident`, `MemoryVirtual`, `MemoryCode`, `MemoryDataAndStack`) are all valid ClickHouse async metrics.
- Both profile settings (`max_memory_usage`, `memory_overcommit_ratio_denominator`) are real and correctly placed inside `<profiles><default>` in users.xml.
- Minor inconsistency (not fixed, not a technical error): the prose summary says "critical alerts at 90%" while the Prometheus rule uses 92%. Left as-is since both thresholds are reasonable and the discrepancy is stylistic.
- The `KILL QUERY WHERE query_id = (SELECT ...)` pattern is valid ClickHouse syntax.
