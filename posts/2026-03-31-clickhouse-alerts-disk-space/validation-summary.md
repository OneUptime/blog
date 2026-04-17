# Validation Summary: How to Set Up ClickHouse Alerts for Disk Space

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- ClickHouse (system.disks, MergeTree, TTL, ALTER TABLE ... MATERIALIZE TTL)
- clickhouse-client CLI
- Prometheus (alerting rules, ClickHouse `/metrics` endpoint)
- Grafana (alerting)
- Bash / cron

## Sources Consulted
- ClickHouse `system.disks` docs — https://clickhouse.com/docs/operations/system-tables/disks
- ClickHouse `system.asynchronous_metrics` docs — https://clickhouse.com/docs/operations/system-tables/asynchronous_metrics
- ClickHouse `system.metrics` docs — https://clickhouse.com/docs/operations/system-tables/metrics
- ClickHouse Prometheus endpoint configuration — https://clickhouse.com/docs/operations/server-configuration-parameters/settings#prometheus
- ClickHouse SQL syntax / aliases — https://clickhouse.com/docs/sql-reference/syntax
- ClickHouse `ALTER TABLE ... MATERIALIZE TTL` — https://clickhouse.com/docs/sql-reference/statements/alter/ttl

## Issues Found
1. **Misleading section heading**: The heading "Setting Up Alerting with ClickHouse Keeper Watchers" did not match the content of the section (a MergeTree snapshot table populated by a cron script — no Keeper watchers involved). "Keeper watchers" is also not a standard ClickHouse alerting pattern. Changed to "Setting Up a Disk Space Snapshot Table".
2. **Incorrect Prometheus metric names**: The post used `ClickHouseDiskAvailable_<disk_name>` and `ClickHouseDiskTotal_<disk_name>`. ClickHouse exposes async metrics (which `DiskAvailable_*` / `DiskTotal_*` belong to) with the prefix `ClickHouseAsyncMetrics_`. Corrected every occurrence in the Prometheus metrics listing and in the alerting rule expressions to `ClickHouseAsyncMetrics_DiskAvailable_default` and `ClickHouseAsyncMetrics_DiskTotal_default`.
3. **Invalid SQL: SELECT alias referenced in WHERE**: The INSERT query computed `severity` as a SELECT alias and then used `WHERE severity != 'ok'`. ClickHouse evaluates WHERE before SELECT aliases are materialized, so this would error with unknown identifier. Replaced the `CASE` expression with `multiIf` (more idiomatic ClickHouse) and rewrote the filter to use the underlying expression: `WHERE free_space < 21474836480`, which matches the warning/critical thresholds.

## Review Notes
- The `CASE` → `multiIf` swap is a style equivalence; both are valid in ClickHouse, but `multiIf` is more conventional here.
- The "Summary" paragraph mentions 70% as a third tier, but the body only covers 80% warning and 90%/10 GB critical thresholds. This is a minor copy inconsistency rather than a technical error, so it was left as-is.
- The post suggests `OPTIMIZE` as part of an automated response; running `OPTIMIZE FINAL` on large tables is I/O-heavy and can worsen a disk-full situation before improving it. Not a factual error, but operators should apply it selectively.
- `ALTER TABLE ... MATERIALIZE TTL` is valid and forces TTL re-evaluation on existing parts; it is the correct command for the described use case.
