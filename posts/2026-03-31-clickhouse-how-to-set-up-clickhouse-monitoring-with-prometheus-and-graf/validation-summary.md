# Validation Summary: How to Set Up ClickHouse Monitoring with Prometheus and Grafana

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (Prometheus endpoint, system.metrics, system.events, system.asynchronous_metrics)
- Prometheus (scrape_configs, relabel_configs, alerting rules)
- Grafana (grafana-clickhouse-datasource plugin)
- PromQL (rate, metric expressions)

## Sources Consulted
- ClickHouse server configuration docs — `<prometheus>` block (endpoint, port, metrics, events, asynchronous_metrics, errors)
- ClickHouse `system.asynchronous_metrics` reference (`ReplicasMaxRelativeDelay`, `MemoryResident`, `NumberOfTables`)
- ClickHouse `system.metrics` reference (`ReplicatedChecks`, `MemoryTracking`, `BackgroundMergesAndMutationsPoolTask`, `PartsActive`)
- ClickHouse PRs #11639 and #11795 (removal of leader election — `LeaderReplica` is obsolete)
- Prometheus configuration docs (scrape_configs, relabel_configs, lifecycle reload endpoint)
- grafana-clickhouse-datasource plugin docs (installation via `grafana-cli plugins install`)

## Issues Found
1. `ClickHouseMetrics_ReplicaMaxRelativeDelay` in the metrics list had two problems: it lives in `system.asynchronous_metrics` (not `system.metrics`) so the prefix is `ClickHouseAsyncMetrics_`, and the actual metric name is `ReplicasMaxRelativeDelay` (plural). Corrected to `ClickHouseAsyncMetrics_ReplicasMaxRelativeDelay`.
2. The "Replication Lag" Grafana query used `ClickHouseAsyncMetrics_ReplicaMaxRelativeDelay` (singular). Fixed the spelling to `ReplicasMaxRelativeDelay`.
3. The Prometheus `ClickHouseReplicationLag` alert rule had the same singular/plural typo. Fixed to `ClickHouseAsyncMetrics_ReplicasMaxRelativeDelay`.
4. `ClickHouseMetrics_LeaderReplica` no longer exists — leader election was removed from ReplicatedMergeTree (ClickHouse PRs #11639 / #11795) in favor of multi-leader replication, and the metric was dropped. It was also miscategorized under "Parts". Replaced with `ClickHouseMetrics_PartsActive`, which is a real metric in `system.metrics` that fits the Parts category.

## Review Notes
- The `<prometheus>` config block fields (`endpoint`, `port`, `metrics`, `events`, `asynchronous_metrics`, `errors`) and the conventional port 9363 are all correct.
- The Prometheus scrape config, `POST /-/reload` lifecycle endpoint, and `relabel_configs` syntax are valid.
- `grafana-clickhouse-datasource` is the correct official plugin ID; note that newer Grafana installs can also use `grafana-cli plugins install` or the Plugin Catalog UI — either works.
- SQL against `system.metrics` and `system.events` is correct (columns `metric`/`value`/`description` and `event`/`value`).
- The metric prefixes `ClickHouseProfileEvents_*`, `ClickHouseMetrics_*`, and `ClickHouseAsyncMetrics_*` map to `system.events`, `system.metrics`, and `system.asynchronous_metrics` respectively, which matches ClickHouse's built-in Prometheus exporter behavior.
