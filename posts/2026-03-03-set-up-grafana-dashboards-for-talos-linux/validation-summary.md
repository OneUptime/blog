# Validation Summary: How to Set Up Grafana Dashboards for Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Grafana
- Grafana Helm chart
- Grafana dashboard provisioning and dashboard JSON
- Grafana HTTP Folder API
- kube-prometheus-stack
- Prometheus and PromQL
- Kubernetes and kubectl
- kube-state-metrics
- Prometheus node_exporter
- etcd metrics

## Sources Consulted
- Grafana Helm chart installation documentation: https://grafana.com/docs/grafana/latest/setup-grafana/installation/helm/
- Grafana Helm charts repository usage: https://grafana.github.io/helm-charts/
- Grafana Helm chart values and README: https://github.com/grafana-community/helm-charts/tree/main/charts/grafana
- Grafana provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/
- Grafana Folder HTTP API documentation: https://grafana.com/docs/grafana/latest/developers/http_api/folder/
- kube-prometheus-stack values: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml
- Helm install command documentation: https://docs.helm.sh/docs/helm/helm_install/
- kubectl port-forward documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Prometheus PromQL basics: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus histogram_quantile documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile
- kube-state-metrics pod metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Kubernetes system metrics documentation: https://kubernetes.io/docs/concepts/cluster-administration/system-metrics/
- etcd metrics documentation: https://etcd.io/docs/v3.6/metrics/
- Grafana dashboard pages for dashboard IDs 1860, 6417, and 3070: https://grafana.com/grafana/dashboards/

## Issues Found
1. **Helm install commands assumed the namespace already existed.** The examples used `--namespace monitoring` without creating the namespace. Helm supports `--create-namespace` on `helm install`, so both install commands were updated to include it.
2. **The custom ConfigMap used an obsolete dashboard row layout.** The dashboard JSON used a top-level `rows` array containing nested panels. Current Grafana dashboard JSON uses a top-level `panels` array with panel positions in `gridPos`. Replaced the `rows` block with top-level panels and added `schemaVersion`, `version`, and a default time range.

## Review Notes
- Helm and kubectl are not installed in the local environment, so CLI behavior was verified against official documentation rather than local `--help` output.
- The standalone Grafana chart has `sidecar.dashboards.enabled` disabled by default, while kube-prometheus-stack enables the Grafana dashboard sidecar by default with label `grafana_dashboard: "1"`. The post's ConfigMap auto-discovery statement is correct for kube-prometheus-stack, but standalone Grafana users must enable the sidecar or use file provisioning.
- The Prometheus service URL in the values file depends on the kube-prometheus-stack release name. The shown URL is plausible for a release named `prometheus`, but readers may need to adjust it for their release.
- kube-state-metrics documents `kube_pod_container_resource_requests` as stable, while Kubernetes scheduler metrics such as `kube_pod_resource_request` can be more precise for request accounting. The existing query is valid but may not be the best capacity-planning query for every cluster.
