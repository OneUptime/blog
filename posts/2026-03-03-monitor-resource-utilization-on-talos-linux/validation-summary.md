# Validation Summary: How to Monitor Resource Utilization on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (talosctl CLI)
- Kubernetes
- Prometheus (kube-prometheus-stack Helm chart)
- Prometheus node_exporter
- cAdvisor (container_* metrics)
- kube-state-metrics
- Grafana (community dashboards)
- Kubernetes Metrics Server
- Helm
- PromQL

## Sources Consulted
- Sidero Labs Talos documentation — cgroups analysis & talosctl CLI reference (https://docs.siderolabs.com/talos/v1.9/build-and-extend-talos/cluster-operations-and-maintenance/cgroups-analysis, https://docs.siderolabs.com/talos/v1.7/reference/cli)
- Prometheus node_exporter source (vmstat_linux.go) (https://github.com/prometheus/node_exporter/blob/master/collector/vmstat_linux.go)
- Robust Perception — iostat to node_exporter metric mapping (https://www.robustperception.io/mapping-iostat-to-the-node-exporters-node_disk_-metrics/)
- kube-state-metrics pod-metrics docs (https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md)
- Grafana community dashboards 1860, 315, 747 (https://grafana.com/grafana/dashboards/1860-node-exporter-full/, https://grafana.com/grafana/dashboards/315, https://grafana.com/grafana/dashboards/747-pod-metrics/)
- prometheus-community Helm charts repository

## Issues Found
- **`talosctl stats` description** — Original comment said "CPU and memory overview", which implies node-level stats. The command actually reports per-container CPU/memory/disk usage from containerd. Updated the comment to "Per-container CPU, memory, and disk stats" for accuracy.
- **Grafana dashboard 747 name** — Original text said "Pod resource usage". The actual published title on grafana.com is "Kubernetes Pod Metrics". Updated to match the official name so readers can find it.

All other technical content verified correct:
- `talosctl processes` and `talosctl read /proc/...` are valid commands.
- node_exporter metrics (`node_cpu_seconds_total`, `node_memory_*`, `node_disk_*_bytes_total`, `node_disk_io_time_seconds_total`, `node_network_*`, `node_filesystem_*`, `node_vmstat_oom_kill`) are all correctly named.
- cAdvisor metrics (`container_cpu_usage_seconds_total`, `container_cpu_cfs_throttled_seconds_total`, `container_memory_working_set_bytes`) are correctly named.
- kube-state-metrics `kube_pod_container_resource_requests{resource="..."}` / `kube_pod_container_resource_limits{resource="..."}` uses the current unified form (since kube-state-metrics v1.9).
- PromQL syntax and semantics are correct (CPU utilization formula, disk I/O time percentage, filesystem usage, network drop/error rates).
- Helm install command, chart name, repo URL, and kube-prometheus-stack values structure (prometheusSpec, nodeExporter, grafana sub-keys) are correct.
- PrometheusRule manifest (`monitoring.coreos.com/v1`) is the correct API group/version used by the Prometheus Operator.
- Metrics Server install URL and `kubectl top` usage are correct.
- Grafana dashboard IDs 1860 ("Node Exporter Full") and 315 ("Kubernetes cluster monitoring (via Prometheus)") are correct.

## Review Notes
- The `talosctl stats` command shows container-level stats — readers who want node-level CPU/memory totals should use `talosctl memory` (not mentioned in the post) or rely on node_exporter once Prometheus is deployed. Not a correctness issue, but a future revision could note this.
- The kube-prometheus-stack `prometheusSpec.retention: 30d` plus 100Gi storage may be too small for large clusters; appropriate for the example but worth a sizing note for production.
- The `HighNetworkDropRate` alert threshold of `> 100` packets/sec is arbitrary and will need tuning per environment, but this is stated implicitly as an example.
- The `node_network_receive_drop_total` and `node_network_transmit_drop_total` metrics had their suffix renamed in newer node_exporter versions to drop the `_total` (still aliased), but the current names used here remain valid.
- The kube-prometheus-stack does not deploy `kube_pod_container_resource_limits` / `_requests` unless kube-state-metrics is enabled — it is enabled by default in the chart, so the queries in the right-sizing section will work out of the box with the provided values file.
