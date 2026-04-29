# Validation Summary: How to Monitor Rancher Server Resource Usage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher Server (Kubernetes management platform)
- Prometheus / Prometheus Operator (ServiceMonitor, PrometheusRule CRDs)
- Grafana
- etcd (metrics endpoint)
- kube-state-metrics
- cAdvisor metrics
- OneUptime synthetic monitoring

## Sources Consulted
- Prometheus Operator API reference (ServiceMonitor / PrometheusRule CRDs): https://prometheus-operator.dev/docs/api-reference/api/
- etcd monitoring documentation (metrics on `--listen-metrics-urls`, default port 2381): https://etcd.io/docs/v3.5/op-guide/monitoring/
- etcd metrics reference (`etcd_mvcc_db_total_size_in_bytes`, `etcd_server_quota_backend_bytes`): https://etcd.io/docs/v3.5/metrics/
- kube-state-metrics deployment metrics (`kube_deployment_status_replicas_available`, `kube_deployment_spec_replicas`): https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/deployment-metrics.md
- cAdvisor container metrics (`container_memory_usage_bytes`, `container_spec_memory_limit_bytes`): https://github.com/google/cadvisor
- Rancher Monitoring documentation: https://ranchermanager.docs.rancher.com/integrations-in-rancher/monitoring-and-alerting
- Rancher built-in dashboards: https://ranchermanager.docs.rancher.com/integrations-in-rancher/monitoring-and-alerting/built-in-dashboards
- grafana.com dashboard library: https://grafana.com/grafana/dashboards/

## Issues Found

1. **Incorrect Grafana dashboard ID** — The post claimed "the official Rancher monitoring dashboard from grafana.com (Dashboard ID: `2728`)". This ID returns a 404 on grafana.com, and is not an official Rancher dashboard. Rancher's official approach is to install the `rancher-monitoring` chart via Cluster Tools, which bundles its dashboards (Cluster, Workload, etcd, etc.) directly with the chart rather than referencing a single grafana.com ID. I replaced the sentence with an instruction to install the `rancher-monitoring` chart for the bundled pre-built dashboards.

## Review Notes

- The ServiceMonitor for Rancher uses `port: https-internal` with `insecureSkipVerify: true` — this matches the port name on the Rancher service in `cattle-system`. Operators with proper PKI in place should use a real `caFile`/`serverName` instead of skipping verification, but this is acceptable as an example.
- The etcd metrics ServiceMonitor assumes etcd runs in `kube-system` with a `component: etcd` label and exposes a port named `metrics`. This works on RKE/RKE2 with `--listen-metrics-urls` on port 2381, but distributions vary; users may need to adjust the selector or create an Endpoints/Service if etcd isn't already exposed as a Service.
- The PromQL alert expressions use valid cAdvisor and kube-state-metrics names. Note that `container_spec_memory_limit_bytes` returns 0 for containers with no memory limit, which would make the ratio undefined — adding `container_spec_memory_limit_bytes > 0` as a guard would be a future improvement but isn't strictly incorrect.
- "Websocket connections" and "Reconcile queue depth" rows in the Key Metrics table are conceptually correct concerns for Rancher Server health, but the post doesn't show specific metric names for them; that's fine for a metrics overview but readers will need to inspect Rancher's `/metrics` endpoint to find current names.
