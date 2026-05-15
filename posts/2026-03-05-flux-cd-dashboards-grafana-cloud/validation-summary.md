# Validation Summary: How to Set Up Flux CD Dashboards in Grafana Cloud

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Grafana Cloud
- Grafana Alloy
- Prometheus
- Prometheus Operator PodMonitor
- kube-state-metrics
- Grafana dashboards
- PromQL

## Sources Consulted
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux monitoring example repository: https://github.com/fluxcd/flux2-monitoring-example
- Flux monitoring example PodMonitor: https://raw.githubusercontent.com/fluxcd/flux2-monitoring-example/main/monitoring/configs/podmonitor.yaml
- Flux monitoring example kube-state-metrics configuration: https://raw.githubusercontent.com/fluxcd/flux2-monitoring-example/main/monitoring/controllers/kube-prometheus-stack/kube-state-metrics-config.yaml
- Grafana Cloud Prometheus remote write documentation: https://grafana.com/docs/grafana-cloud/send-data/metrics/metrics-prometheus/
- Grafana Alloy prometheus.remote_write documentation: https://grafana.com/docs/grafana-cloud/send-data/alloy/reference/components/prometheus/prometheus.remote_write/
- Grafana Alloy Helm chart values: https://raw.githubusercontent.com/grafana/alloy/main/operations/helm/charts/alloy/values.yaml
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Grafana dashboard 21150, Flux / Cluster Stats (cluster): https://grafana.com/grafana/dashboards/21150-flux-cluster-stats-cluster/
- Grafana dashboard 21149, Flux / Control Plane (cluster): https://grafana.com/grafana/dashboards/21149-flux-control-plane-cluster/

## Issues Found
- The Grafana Alloy HelmRelease was placed in the `monitoring` namespace while relying on `install.createNamespace: true`. Flux can create the target namespace for the Helm release, but the HelmRelease object's own namespace must already exist. I changed the HelmRelease namespace to `flux-system` and added `spec.targetNamespace: monitoring` so Flux can create and install into `monitoring`.
- The Prometheus remote write values selected Flux PodMonitors by label but did not include `podMonitorNamespaceSelector`. Because the Flux PodMonitor is created in `flux-system`, a Prometheus instance in another namespace may not discover it unless cross-namespace PodMonitor discovery is configured. I added `podMonitorNamespaceSelector.matchNames: [flux-system]`.
- The source metrics description said the dashboards show source artifact size. The official Flux monitoring example's kube-state-metrics configuration exposes source readiness, revision, URL, and related labels through `gotk_resource_info`, but not artifact size. I changed the wording to "Source readiness, revisions, and fetch frequency."

## Review Notes
The Grafana Cloud remote write endpoint shown is region-specific and users should replace it with the `/api/prom/push` URL from their own Grafana Cloud Metrics details page. The official Flux dashboards depend on Flux custom resource state metrics from kube-state-metrics for `gotk_resource_info`, as the post notes.
