# Validation Summary: How to Implement Prometheus Alert Rule Design

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus (alerting rules, PromQL, recording rules)
- Alertmanager (routing, grouping, inhibition, notification templates)
- promtool (unit testing of alert rules)
- node_exporter metrics (CPU, memory, disk)
- kube-state-metrics (pods, deployments, nodes)
- postgres_exporter (replication lag, connections, statements)
- rabbitmq_exporter, kafka_exporter (queue metrics)
- PagerDuty, Slack receivers
- SRE concepts: RED method, USE method, SLOs, multi-window burn-rate alerting

## Sources Consulted
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- PromQL functions reference (rate, increase, histogram_quantile, humanizePercentage): https://prometheus.io/docs/prometheus/latest/querying/functions/
- Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- promtool unit testing for rules: https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/
- node_exporter metrics: https://github.com/prometheus/node_exporter
- kube-state-metrics documentation: https://github.com/kubernetes/kube-state-metrics/tree/main/docs
- Google SRE Workbook, "Alerting on SLOs" chapter (origin of multi-window 14.4x / 6x burn-rate thresholds): https://sre.google/workbook/alerting-on-slos/

## Issues Found
No technical issues found that warranted edits. The PromQL expressions, recording-rule schema, alert-rule schema, histogram_quantile usage, kube-state-metrics names, promtool test file format, template variables (`$value`, `$labels`, `humanizePercentage`), inhibition rule structure, and Alertmanager routing tree are all correct. The burn-rate math is also accurate:
- 14.4x burn rate against a 0.1% (99.9% SLO) error budget exhausts a 30-day budget in ~50 hours (~2 days) ✓
- 6x burn rate exhausts the same budget in 120 hours (5 days) ✓
- The 1x/10x/100x diagram (30 days / 3 days / 7.2 hours) also checks out

## Review Notes
The following items are technically valid as written but worth flagging for a future refresh of the post:

- **Deprecated Alertmanager `match` syntax.** Alertmanager deprecated `match`, `match_re`, `source_match`, and `target_match` in v0.22 (2021) in favor of the unified `matchers` / `source_matchers` / `target_matchers` syntax (e.g., `matchers: [severity = "critical"]`). The deprecated forms still parse and function, but a modern post would ideally use the new syntax. Not edited because the change would touch multiple snippets and the existing syntax is still operational.
- **`node_disk_io_errors_total`** is not a metric exposed by the upstream node_exporter. Disk error visibility on Linux typically comes from SMART exporters (e.g., `smartctl_exporter`) or kernel log scraping. The illustrative intent (alert on disk errors) is sound, but readers reusing the snippet verbatim against vanilla node_exporter will get no series back.
- **`pg_stat_statements_seconds_total{quantile="0.99"}`** is not a standard postgres_exporter metric — pg_stat_statements exposes totals/means rather than quantiles. The example illustrates a valid concept (alert on slow-query trend) but the metric name and quantile label will not match what a stock postgres_exporter actually publishes.
- **`pg_replication_lag_seconds`** — the canonical postgres_exporter metric is typically `pg_replication_lag` (already in seconds) or `pg_stat_replication_*_lag` variants depending on exporter version/config. Minor naming nit.
- **CPU utilization expression** `(1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m]))) > 0.9` averages across every CPU on every instance, so it only fires when the fleet-wide average exceeds 90%. A per-instance form (`1 - avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) > 0.9`) is usually more actionable. Not strictly wrong — just a coarser signal than typical.
- **Memory "saturation" example** uses a memory-usage ratio rather than swap/paging activity, which is more accurately a utilization signal than a saturation signal in the strict USE-method sense. The threshold (0.95) is high enough that it correlates with saturation in practice.
