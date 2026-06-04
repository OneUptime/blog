# Validation Summary: How to Monitor etcd Latency and Disk IO for Cluster Health

## Status
validated

## Post Type
Tutorial / operational monitoring guide

## Technologies Covered
- Kubernetes
- etcd and etcdctl
- Prometheus and PromQL
- Prometheus Operator ServiceMonitor and PrometheusRule resources
- Grafana dashboard JSON
- Node Exporter
- Linux sysstat/iostat, systemd journal, cron

## Sources Consulted
- etcd metrics documentation: https://etcd.io/docs/v3.6/metrics/
- etcd monitoring guide: https://etcd.io/docs/v3.6/op-guide/monitoring/
- etcd performance guide: https://etcd.io/docs/v3.6/op-guide/performance/
- etcd FAQ latency thresholds: https://etcd.io/docs/v3.4/faq/
- etcd configuration flags for `--listen-metrics-urls`: https://etcd.io/docs/v3.6/op-guide/configuration/
- etcdctl command reference via Go package docs: https://pkg.go.dev/go.etcd.io/etcd/etcdctl/v3
- Kubernetes Services without selectors: https://kubernetes.io/docs/concepts/services-networking/service/
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus Node Exporter guide: https://prometheus.io/docs/guides/node-exporter/
- Prometheus Node Exporter releases: https://github.com/prometheus/node_exporter/releases
- Prometheus Operator ServiceMonitor design: https://prometheus-operator.dev/docs/getting-started/design/
- Grafana dashboard JSON model: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/
- Linux iostat manual page: https://man7.org/linux/man-pages/man1/iostat.1.html

## Issues Found
- The post stated that etcd exposes Prometheus metrics on port 2381. Updated this to explain that etcd exposes `/metrics` on its client port and optionally on `--listen-metrics-urls`; port 2381 is common in kubeadm setups, not an etcd universal default.
- The Kubernetes Service used both a selector and manually defined Endpoints. Removed the selector so the manually managed Endpoints are consistent with Kubernetes Services without selectors.
- The frequent leader changes alert used `rate(...[15m]) > 3`, which compares a per-second rate to a count threshold. Changed it to `increase(...[15m]) > 3`.
- The Grafana JSON snippet was not a complete importable dashboard and used old panel-axis fields. Replaced it with a valid dashboard JSON model using time series panels, grid positions, field units, and Prometheus targets.
- Dashboard histogram queries were updated to use `sum by (..., le)` before `histogram_quantile`, matching Prometheus guidance for classic histogram aggregation.
- The database size growth query used `rate()` on a gauge. Changed it to `deriv(etcd_mvcc_db_total_size_in_bytes[1h])`.
- Updated the Node Exporter image from `prom/node-exporter:v1.7.0` to the current documented release line, `prom/node-exporter:v1.11.1`.
- The monitoring script assigned `ETCDCTL_*` variables without exporting them, so `etcdctl` would not read them from the environment. Changed them to `export`.
- The monitoring script labeled a single histogram bucket counter as p99 latency. Renamed the variables and comments to describe them as threshold bucket counters and left p99 calculation to Prometheus `histogram_quantile`.
- The cron example replaced root's crontab with a single entry. Changed it to preserve existing crontab entries before appending the monitoring job.

## Review Notes
The `etcd_debugging_mvcc_keys_total` metric is technically valid but belongs to etcd's debugging namespace, which the etcd docs describe as implementation-dependent and volatile. It is acceptable for troubleshooting dashboards, but production alerts should prefer stable `etcd_` metrics where possible.
