# Validation Summary: How to Monitor Talos Linux with Prometheus

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Prometheus
- Alertmanager
- Grafana
- kube-prometheus-stack (Helm chart)
- Prometheus Operator (ServiceMonitor, PrometheusRule)
- node-exporter
- kube-state-metrics
- etcd
- Kubernetes (kubelet)
- Helm
- kubectl

## Sources Consulted
- Prometheus Node Exporter documentation — https://prometheus.io/docs/guides/node-exporter/
- Talos Linux etcd Metrics Endpoint — https://www.talos.dev/v1.11/kubernetes-guides/configuration/etcd-metrics/
- kube-prometheus-stack Helm chart — https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack
- Prometheus Operator API reference — https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes system metrics documentation — https://kubernetes.io/docs/concepts/cluster-administration/system-metrics/
- Alertmanager CHANGELOG — https://github.com/prometheus/alertmanager/blob/main/CHANGELOG.md

## Issues Found
1. **Incorrect scheme for node-exporter scrape config**: The `talos-machine-metrics` job used `scheme: https` with `tls_config: { insecure_skip_verify: true }` while targeting port 9100. The Prometheus node-exporter listens on HTTP by default at port 9100 (TLS is opt-in and not enabled by default), so an HTTPS scrape would fail. Changed `scheme` to `http` and removed the unused `tls_config` block.
2. **Invalid `port` value in etcd ServiceMonitor**: The endpoint specified `port: "2381"`. In Prometheus Operator's ServiceMonitor, the `port` field must reference the Service port **name**, not the port number. Using a numeric-string would not resolve to an endpoint. Changed it to `port: metrics`, which is the conventional port name used when defining a corresponding Service for etcd metrics.

## Review Notes
- The "Monitoring Talos System Services" section uses static IP-based scrape configs at port 9100 to gather node metrics. This works for externally reachable node-exporter instances, but readers should be aware that kube-prometheus-stack already deploys node-exporter as a DaemonSet and discovers it via Kubernetes service discovery — the static config approach is mostly useful when running node-exporter outside the cluster or when targeting hosts directly.
- The etcd `ServiceMonitor` example assumes a Service with label `component: etcd` and a named port `metrics` exists in `kube-system`. Talos does not create this Service automatically; users following the ServiceMonitor approach will need to create one. The alternative static scrape config shown right after will work without additional Services.
- Alertmanager's `match` (and `match_re`) routing keys are deprecated in favor of `matchers` (since Alertmanager v0.22, May 2021). The shown configuration still works in current versions but will produce deprecation warnings. Future revisions should migrate to `matchers`.
- The `nodeExporter.tolerations` block uses `operator: Exists, effect: NoSchedule`, which tolerates all `NoSchedule` taints. This is broad but acceptable for ensuring node-exporter runs on Talos control-plane nodes; a more targeted toleration on `node-role.kubernetes.io/control-plane` would be more conservative.
- All Prometheus metric names referenced (`node_cpu_seconds_total`, `node_memory_MemAvailable_bytes`, `node_memory_MemTotal_bytes`, `node_filesystem_avail_bytes`, `node_filesystem_size_bytes`, `etcd_server_has_leader`, `etcd_disk_wal_fsync_duration_seconds_bucket`, `etcd_disk_backend_commit_duration_seconds_bucket`, `kubelet_running_pods`, `kube_pod_container_status_restarts_total`) are valid and current.
