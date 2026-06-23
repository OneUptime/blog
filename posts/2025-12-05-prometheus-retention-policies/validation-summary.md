# Validation Summary: How to Configure Retention Policies in Prometheus

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus
- Prometheus TSDB
- Prometheus Operator
- Kubernetes StatefulSet and ConfigMap
- PromQL alerting and dashboard queries
- Thanos sidecar
- Prometheus remote write
- Prometheus snapshot API

## Sources Consulted
- Prometheus storage documentation: https://prometheus.io/docs/prometheus/latest/storage/
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus command-line flags: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus 3.12.0 release metadata: https://github.com/prometheus/prometheus/releases/tag/v3.12.0
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Thanos sidecar documentation: https://thanos.io/tip/components/sidecar.md/

## Issues Found
1. **Retention examples used deprecated Prometheus CLI flags.** The post used `--storage.tsdb.retention.time` and `--storage.tsdb.retention.size` in several examples. Current Prometheus documentation marks these flags as deprecated in favor of `storage.tsdb.retention.time` and `storage.tsdb.retention.size` in `prometheus.yml`. I updated the retention examples and the Kubernetes ConfigMap example to use the current config-file fields.

2. **Kubernetes example used an old Prometheus image and omitted the config mount needed for file-based retention.** The StatefulSet referenced `prom/prometheus:v2.47.0` and passed retention as CLI args. I updated it to `prom/prometheus:v3.12.0`, added a ConfigMap containing `prometheus.yml`, and mounted that ConfigMap into the container.

3. **Out-of-order ingestion used the deprecated CLI flag form.** The post showed `--storage.tsdb.out-of-order-time-window=30m`. I changed it to the documented `storage.tsdb.out_of_order_time_window: 30m` configuration field.

4. **Compaction duration queries used the histogram base name directly.** `prometheus_tsdb_compaction_duration_seconds` is exposed as histogram series such as `_bucket`, `_sum`, and `_count`; querying the base name directly is not the useful PromQL form. I changed the dashboard and monitoring examples to use `histogram_quantile(0.99, rate(prometheus_tsdb_compaction_duration_seconds_bucket[5m]))`.

5. **Federation example mixed remote write with pull-based federation.** The section was titled federation and said the long-term Prometheus only scrapes recording rules, but the short-term example also configured `remote_write`, which would push samples instead of using federation. I removed the `remote_write` block from that federation example.

6. **Thanos sidecar retention was too short.** The post set Prometheus retention to `2h` when using Thanos sidecar. Thanos recommends retention not lower than three times the minimum block duration, so I changed it to `6h`.

7. **Snapshot API prerequisites were incomplete.** The post showed the snapshot endpoint but did not mention that Prometheus must be started with `--web.enable-admin-api`. I added that prerequisite before the snapshot command.

## Review Notes
The Prometheus Operator `spec.retention: 15d` field is still valid. The size-based retention alert using `prometheus_tsdb_retention_limit_bytes` is most meaningful when size retention is configured; deployments using only time-based retention should generally add filesystem-level disk alerts as well.
