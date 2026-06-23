# Validation Summary: How to Get Total and Free Disk Space with Prometheus

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Prometheus
- PromQL
- Prometheus Node Exporter
- Prometheus alerting rules
- Prometheus recording rules
- Grafana dashboard queries
- Kubernetes kubelet volume metrics

## Sources Consulted
- Prometheus querying basics: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus PromQL operators: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus PromQL functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus recording rules: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus Node Exporter guide: https://prometheus.io/docs/guides/node-exporter/
- Node Exporter filesystem collector source: https://github.com/prometheus/node_exporter/blob/master/collector/filesystem_common.go
- Node Exporter Linux filesystem collector source: https://github.com/prometheus/node_exporter/blob/master/collector/filesystem_linux.go
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics/

## Issues Found
- The descriptions of `node_filesystem_free_bytes` and `node_filesystem_avail_bytes` were inaccurate. Node Exporter describes `free_bytes` as filesystem free space and `avail_bytes` as space available to non-root users, so the table was corrected.
- The `predict_linear` example said it predicted when the disk would be full "in seconds", but `predict_linear(v, t)` returns the predicted metric value `t` seconds from now. The comment was corrected to say it predicts available bytes 24 hours from now.
- The "stale metrics" example joined `node_filesystem_avail_bytes` with `node_disk_reads_completed_total` on `device` and `instance`, but filesystem `device` labels commonly do not match diskstats `device` labels and recent disk reads do not indicate whether a filesystem metric is stale. The section was corrected to show filtering filesystems with `node_filesystem_device_error == 0`, which matches Node Exporter's filesystem collector behavior.

## Review Notes
- The PromQL arithmetic, regex label matchers, `predict_linear`, alert rule structure, and recording rule structure are consistent with current Prometheus documentation.
- The Kubernetes persistent volume metric `kubelet_volume_stats_available_bytes` is present in the Kubernetes metrics reference and is documented as an alpha kubelet metric.
- The alert examples are technically valid but intentionally broad; in production, the same filesystem filters used earlier in the post should usually be applied to reduce noise from pseudo or container filesystems.
