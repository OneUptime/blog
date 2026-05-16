# Validation Summary: How to Monitor Cluster Availability in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- Prometheus (kube-prometheus-stack Helm chart)
- Alertmanager
- Grafana
- Blackbox Exporter
- Node Exporter
- kube-state-metrics
- CoreDNS
- etcd
- PromQL (alerting and recording rules)
- Helm

## Sources Consulted
- Talos Linux docs (API listens on port 50000 over gRPC/mTLS): https://www.talos.dev/latest/learn-more/components/
- kube-prometheus-stack values reference: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml
- kube-state-metrics deployment metric reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/deployment-metrics.md
- CoreDNS metrics plugin: https://coredns.io/plugins/metrics/
- Kubernetes instrumentation metrics: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Prometheus Alertmanager configuration: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Blackbox Exporter: https://github.com/prometheus/blackbox_exporter

## Issues Found

1. **Mislabeled Talos "API" scrape job (port 9100)** — The original `additionalScrapeConfigs` entry was named `talos-api` with the comment "Scrape Talos API metrics" and targeted port 9100 on three Talos nodes. Port 9100 is the standard `node-exporter` port; the Talos API listens on port 50000 over gRPC/mTLS and is not directly Prometheus-scrapable. Renamed the job to `talos-nodes` and rewrote the comment to clarify that these targets are the node-exporter system extension running on Talos nodes, and that the Talos API on port 50000 is not Prometheus-scrapable.

2. **Incorrect kube-state-metrics metric name** — The `DeploymentReplicasMismatch` alert referenced `kube_deployment_status_available_replicas`. The actual metric exposed by kube-state-metrics is `kube_deployment_status_replicas_available` (the word order differs). Fixed the alert expression to use the correct metric name.

## Review Notes

- The Alertmanager PagerDuty receiver uses `service_key`, which is the legacy Events API v1 field. It still works and is not formally deprecated, but the modern recommendation is `routing_key` (Events API v2). Left as-is since both remain valid; a future stylistic update could switch to `routing_key`.
- `valid_http_versions: ["HTTP/1.1", "HTTP/2.0"]` is a valid blackbox_exporter setting, but blackbox_exporter typically accepts `HTTP/2.0` only when the target negotiates ALPN; the snippet is fine for the documented purpose.
- The Grafana panel JSON snippet is a partial example (`panels` array only), not a fully importable dashboard. This is consistent with the post's intent of "Import these panels" but a reader will need to wrap it in a full dashboard definition.
- The `kube_pod_status_phase{phase=~"Pending|Unknown"} == 1` query is correct; `kube_pod_status_phase` is a gauge with `phase` labels per pod and equals 1 for the current phase.
- The PromQL formula for downtime minutes — `(1 - cluster:apiserver:availability:30d) * 30 * 24 * 60` — is mathematically correct given the recording rule definition.
- The external health check Bash script is portable and correct; using `-k` suppresses TLS verification, which is acceptable for a `healthz` reachability probe but should be replaced with a CA bundle for stricter production checks.
