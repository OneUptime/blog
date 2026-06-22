# Validation Summary: How to Monitor CloudNativePG with Prometheus

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CloudNativePG
- Kubernetes
- PostgreSQL
- Prometheus
- Prometheus Operator
- Grafana
- PromQL
- YAML

## Sources Consulted
- CloudNativePG monitoring documentation: https://cloudnative-pg.io/docs/1.28/monitoring/
- CloudNativePG default monitoring queries: https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/main/config/manager/default-monitoring.yaml
- CloudNativePG sample Prometheus rules: https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/main/docs/src/samples/monitoring/prometheusrule.yaml
- CloudNativePG Grafana dashboards repository: https://github.com/cloudnative-pg/grafana-dashboards
- Grafana CloudNativePG dashboard listing: https://grafana.com/grafana/dashboards/20417-cloudnativepg/
- PostgreSQL cumulative statistics documentation: https://www.postgresql.org/docs/current/monitoring-stats.html
- Kubernetes kubectl port-forward documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Prometheus Operator PodMonitor API reference: https://github.com/prometheus-operator/prometheus-operator/blob/main/Documentation/api-reference/api.md

## Issues Found
- The post used `.spec.monitoring.enablePodMonitor: true` as the primary setup path. CloudNativePG 1.28 documents this field as deprecated, so the examples now use manually managed `PodMonitor` resources and retain only a note that the field exists but is deprecated.
- The post listed non-documented `cnpg_cluster_instances`, `cnpg_cluster_ready_instances`, and `cnpg_cluster_instances_reported_state` metrics. Replaced them with documented CloudNativePG exporter metrics such as `cnpg_collector_up`, `cnpg_collector_nodes_used`, `cnpg_collector_sync_replicas`, and WAL-related collector metrics.
- Several replication metric names used `_lag_bytes`, but CloudNativePG's default queries expose `_diff_bytes` for WAL byte differences and `_lag_seconds` for time lag. Updated the metric table accordingly.
- The operator monitoring example used a `ServiceMonitor`, but the official CloudNativePG documentation shows a `PodMonitor` targeting the operator pods. Updated the heading and YAML.
- The custom `pg_stat_bgwriter` query selected checkpoint columns that no longer exist in current PostgreSQL versions. Added `runonserver: "<17.0.0"` and a PostgreSQL 17+ `pg_stat_checkpointer` query.
- Custom metric references in Grafana and alert examples omitted CloudNativePG's `cnpg_<MetricName>_<ColumnName>` naming convention. Updated references such as `pg_stat_activity_count` to `cnpg_pg_stat_activity_count_count`, `pg_locks_count` to `cnpg_pg_locks_count_count`, and `pg_stat_user_tables_n_dead_tup` to `cnpg_pg_stat_user_tables_n_dead_tup`.
- The disk usage alert attempted to join `cnpg_pg_database_size_bytes` with `kubelet_volume_stats_capacity_bytes` on a `persistentvolumeclaim` label that the database-size metric does not expose. Replaced it with a WAL usage alert based on `cnpg_collector_pg_wal` values.
- The failover alert referenced `cnpg_collector_up{role="primary"}`, but the documented metric does not expose a `role` label. Updated it to detect role state changes through `cnpg_pg_replication_in_recovery`.
- The conclusion still recommended enabling built-in metrics with `enablePodMonitor: true`. Updated it to recommend scraping built-in metrics with a Prometheus Operator `PodMonitor`.

## Review Notes
JSON and YAML fenced examples were parsed successfully. `promtool` was not available in the local environment, so Prometheus rule validation was performed by documentation review rather than with `promtool check rules`.
