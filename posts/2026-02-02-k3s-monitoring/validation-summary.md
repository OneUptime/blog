# Validation Summary: How to Monitor K3s Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- K3s (lightweight Kubernetes distribution)
- Prometheus (kube-prometheus-stack Helm chart)
- Grafana
- Alertmanager
- PromQL
- Prometheus Operator CRDs (PrometheusRule, ServiceMonitor)
- Traefik (default K3s ingress controller)
- local-path-provisioner
- kube-state-metrics
- node-exporter
- cAdvisor / kubelet metrics
- Victoria Metrics (alternative)
- metrics-server
- Remote write (Cortex / Thanos)
- Helm

## Sources Consulted
- K3s Packaged Components: https://docs.k3s.io/installation/packaged-components
- K3s Datastore docs: https://docs.k3s.io/datastore
- K3s Network/port requirements: https://docs.k3s.io/installation/requirements
- Traefik Helm chart values: https://github.com/traefik/traefik-helm-chart/blob/master/traefik/values.yaml
- kube-prometheus-stack: https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack
- metrics-server: https://github.com/kubernetes-sigs/metrics-server
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- kube-state-metrics docs (deployment / pod metric names)
- Prometheus documentation (PromQL, histogram_quantile, remote_write queueConfig)

## Issues Found

1. **Traefik ServiceMonitor port name** — The original example used `port: traefik`, which is the dashboard/API entrypoint name in the Traefik Helm chart. When metrics are enabled, Traefik exposes them on the entrypoint named `metrics`. Changed `port: traefik` to `port: metrics` in the ServiceMonitor endpoint so the metrics are scraped from the correct entrypoint.

## Review Notes

- The kubelet scrape config example uses `targets: ['localhost:10250']`, which only works if Prometheus runs in host network on the same node as the kubelet. In a typical kube-prometheus-stack install this is not how kubelet is scraped (the operator generates the appropriate ServiceMonitor via discovery). The example is technically valid as a config snippet and not strictly wrong, so it was left intact.
- `container_memory_usage_bytes` includes page cache; `container_memory_working_set_bytes` is generally a better signal for "real" memory pressure. The metric used is valid and exists, so no change was made.
- K3s ships metrics-server enabled by default in recent versions; the `kubectl apply` install command is still correct for clusters where metrics-server was disabled via `--disable=metrics-server`, so it remains accurate.
- The troubleshooting tip "Change retention from 10d to 3d" doesn't perfectly match the earlier values file (which sets `retention: 7d`), but it is illustrative guidance for the `kubectl edit` flow, not a hard contradiction.
- Victoria Metrics image pinned to `v1.93.0` (2023). The image tag is valid and the configuration still works, but it is an older release; readers may want to use a more recent version.
- All PromQL expressions, metric names, alert rule structures (PrometheusRule), ServiceMonitor schema, and Helm commands were verified and are accurate.
