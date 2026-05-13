# Validation Summary: How to Monitor MySQL Replication Problems in Calico Networks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (replication / SHOW SLAVE STATUS)
- mysqld-exporter (Prometheus exporter for MySQL, v0.15.0)
- Prometheus & Prometheus Operator (PrometheusRule CRD)
- Calico (Kubernetes CNI / network policies)
- Kubernetes (Deployment, CronJob, Secret, NetworkPolicy)
- kube-state-metrics (`kube_networkpolicy_created`)
- Grafana
- Bash `/dev/tcp` for TCP connectivity probing
- nicolaka/netshoot networking image

## Sources Consulted
- mysqld-exporter v0.15.0 release / README: https://github.com/prometheus/mysqld_exporter/blob/v0.15.0/README.md
- mysqld-exporter slave_status collector source: https://github.com/prometheus/mysqld_exporter/blob/v0.15.0/collector/slave_status.go
- kube-state-metrics networkpolicy metrics docs: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/policy/networkpolicy-metrics.md
- Prometheus Operator PrometheusRule API (`monitoring.coreos.com/v1`)
- Kubernetes CronJob API (`batch/v1`, stable since 1.21)

## Issues Found
No technical issues found.

Verification details:
- `prom/mysqld-exporter:v0.15.0` image and port 9104 are correct.
- `--collect.slave_status` (default-enabled) and `--collect.slave_hosts` (default-disabled) flags exist in v0.15.0.
- DSN string format `user:pass@tcp(host:port)/` is the correct Go MySQL driver DSN.
- Metric names `mysql_slave_status_slave_io_running`, `mysql_slave_status_seconds_behind_master`, and `mysql_slave_status_slave_sql_running` are produced by the slave_status collector (YES/NO columns are exported as 1/0 numeric gauges).
- `monitoring.coreos.com/v1` PrometheusRule and `batch/v1` CronJob API versions are correct.
- `kube_networkpolicy_created` is a valid kube-state-metrics gauge.
- Bash `/dev/tcp/host/port` TCP probing pattern is correct, and `nicolaka/netshoot` is a real netdebug image that ships bash.

## Review Notes
- The `mysqld-exporter` project has been moving toward MySQL 8 / "replica" terminology in newer versions. The `slave_status` collector and metric names remain accurate for v0.15.0 as pinned in the post, but readers upgrading to newer mysqld-exporter releases should expect `replica_status` naming to appear and may need to update PromQL queries accordingly.
- `--collect.slave_status` is enabled by default in v0.15.0, so listing it under `args` is redundant but not incorrect (it makes the intent explicit).
- The alert `DatabaseNamespacePolicyChanged` uses `changes(kube_networkpolicy_created{namespace="database"}[10m]) > 0`. Because the creation-timestamp value of an existing series does not change, this expression is primarily useful for detecting newly created policies (a new series with a fresh sample inside the window); it will not reliably fire on modifications or deletions. The post's description ("policies change") is broadly accurate for the most common case (new policies being added) but readers should be aware of this nuance.
- The post does not show the actual `ServiceMonitor` or `PodMonitor` needed to scrape the exporter — readers will need that separately to wire the exporter into Prometheus.
