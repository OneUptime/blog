# Validation Summary: How to Monitor Flux CD Controller Resource Usage

## Status
validated

## Post Type
Tutorial / Monitoring guide

## Technologies Covered
- Flux CD
- Kubernetes
- Prometheus and PromQL
- kube-state-metrics
- cAdvisor
- Prometheus Operator PrometheusRule
- Kustomize
- Grafana

## Sources Consulted
- Flux controller release documentation: https://fluxcd.io/flux/releases/controllers/
- Flux monitoring guide: https://fluxcd.io/flux/guides/monitoring/
- Flux install manifests: https://github.com/fluxcd/flux2/releases/latest/download/install.yaml
- cAdvisor Prometheus metrics documentation: https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md
- kube-state-metrics pod metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Prometheus Operator documentation: https://github.com/prometheus-operator/prometheus-operator
- Grafana dashboard import documentation: https://grafana.com/docs/grafana/latest/dashboards/export-import/
- Grafana Flux / Control Plane dashboard: https://grafana.com/grafana/dashboards/21149-flux-control-plane-cluster/

## Issues Found
- The CPU usage query returned per-container series and used `{{ container }}` in the legend. Flux controller containers are named `manager`, so this would not distinguish controllers well. Changed the query to aggregate by pod and use `{{ pod }}` in the legend.
- The memory usage and limit panel compared unaggregated cAdvisor and kube-state-metrics series. These metrics have different label sets, so direct comparison or visual pairing can be unreliable. Changed both queries to aggregate by pod and filtered memory limits with `unit="byte"`.
- The high-memory alert divided cAdvisor usage by kube-state-metrics limits without matching compatible label sets. Changed it to aggregate both sides by `namespace` and `pod`, and to ignore zero or absent limits.
- The CPU throttling alert used per-container series while the annotation described controllers. Changed it to aggregate throttled and total CFS periods by pod and clarified the annotation text.
- The OOMKilled alert used only `kube_pod_container_status_last_terminated_reason`, which can remain set after an old termination. Added a recent restart condition using `kube_pod_container_status_restarts_total` so the alert reflects a recent OOMKilled restart.
- The Grafana dashboard ID `16714` points to a Flux2 dashboard that does not include controller resource panels. Replaced it with dashboard ID `21149`, which includes Flux control-plane resource panels.

## Review Notes
- The PrometheusRule resource is technically valid for Prometheus Operator, but clusters must configure Prometheus rule selectors and namespace selectors so rules in `flux-system` are discovered.
- The example Grafana ConfigMaps contain dashboard JSON fragments, not a complete production-ready dashboard provisioning setup. They are acceptable as query examples, but future revisions could clarify provisioning requirements.
