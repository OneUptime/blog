# Validation Summary: How to Monitor Multiple Talos Clusters Centrally

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- Prometheus (kube-prometheus-stack Helm chart)
- Prometheus Operator (Prometheus CRD, ServiceMonitor)
- Thanos (Sidecar, Query, Store, Compactor, Receive, Ruler)
- Bitnami Thanos Helm chart
- Grafana (Helm chart, datasource provisioning)
- PromQL
- Alertmanager / Prometheus alert rules
- Loki and Promtail (log aggregation)
- node-exporter
- S3 object storage

## Sources Consulted
- prometheus-community/kube-prometheus-stack values.yaml: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml
- Prometheus Operator ThanosSpec API reference: https://github.com/prometheus-operator/prometheus-operator/blob/main/Documentation/api-reference/api.md
- Prometheus Operator Thanos guide: https://prometheus-operator.dev/docs/platform/thanos/
- Thanos Receive docs: https://thanos.io/tip/components/receive.md/
- Thanos Sidecar docs: https://thanos.io/tip/components/sidecar.md/
- Bitnami Thanos chart: https://github.com/bitnami/charts/blob/main/bitnami/thanos/values.yaml
- Talos monitoring docs: https://www.talos.dev/latest/advanced/monitoring-cluster/
- Prometheus node_exporter: https://github.com/prometheus/node_exporter
- Robust Perception on staleness/PromQL: https://www.robustperception.io/staleness-and-promql/

## Issues Found

1. **Invalid `prometheus.prometheusSpec.thanos.create=true` Helm flag.** The Prometheus Operator `ThanosSpec` has no `create` field; the sidecar is injected whenever the `thanos` block is non-empty. Removed the `--set ...thanos.create=true` flag from the install command and updated the surrounding bullet list to explain that populating any field under `prometheus.prometheusSpec.thanos` (such as `objectStorageConfig`) is what triggers sidecar injection.

2. **Incorrect `ClusterMetricsStale` PromQL.** The original alert expression `time() - max by (cluster) (prometheus_build_info) > 600` is broken: `prometheus_build_info` is a gauge whose *value* is always `1` (build labels carry the information), so subtracting it from `time()` always yields a huge number and the alert would fire constantly. Replaced with `time() - max by (cluster) (timestamp(up{job="prometheus"})) > 600`, which correctly compares the current time against the timestamp of the most recent `up` sample per cluster.

3. **Talos-specific metrics section conflated machine API with node-exporter.** The original text said "Talos Linux exposes its own metrics through the machine API" and then showed a scrape config pointing at port `9100`, which is the node-exporter default port, not a Talos machine API port. Reworded the introductory paragraph to clarify that node-level metrics on port `9100` come from a `node-exporter` DaemonSet (which kube-prometheus-stack already deploys), while the Talos gRPC machine API is a separate source that requires a dedicated exporter. The scrape config example itself was left intact since the targets/port pairing is correct for node-exporter.

## Review Notes
- Bitnami `thanos` chart value paths (`query.enabled`, `queryFrontend.enabled`, `storegateway.enabled`, `compactor.enabled`, `ruler.enabled`) are all valid.
- Thanos sidecar default gRPC port `10901` and Thanos Receive default tenant header `THANOS-TENANT` are both correct.
- PromQL queries for `kube_node_status_condition`, `kube_pod_container_status_restarts_total`, `apiserver_request_duration_seconds_bucket`, `etcd_server_leader_changes_seen_total`, `node_cpu_seconds_total`, `node_memory_MemAvailable_bytes`, and `node_memory_MemTotal_bytes` reference the correct metric and label names exposed by kube-state-metrics, kubelet/apiserver, etcd, and node-exporter respectively.
- The `THANOS-TENANT` header in the remote-write `headers` block is correct, but note that some HTTP/2 clients lowercase header names and Thanos compares them case-insensitively — both forms work in practice.
- The Grafana datasource URL `http://thanos-query:9090` assumes a service literally named `thanos-query`. With the bitnami chart the service is typically `<release>-thanos-query` (e.g. `thanos-thanos-query`); readers should adjust to match their release name.
- The Grafana `--set datasources."datasources\.yaml".datasources[0]...` chain is escaping-sensitive; some shells require additional quoting. Functionally correct for bash.
- Promtail has been superseded by Grafana Alloy upstream. The Promtail Helm chart still works, but readers starting fresh in 2026 may want to evaluate Alloy.
- The post defaults to a single replicated cluster label (e.g. `cluster-a`); in production, this should be templated per cluster rather than hard-coded.
