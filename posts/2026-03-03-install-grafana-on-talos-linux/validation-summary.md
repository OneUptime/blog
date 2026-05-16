# Validation Summary: How to Install Grafana on Talos Linux

## Status
validated

## Post Type
Tutorial / Installation Guide

## Technologies Covered
- Grafana (Helm chart deployment)
- Talos Linux
- Kubernetes (kubectl, ConfigMaps, PersistentVolumeClaims, Services/NodePort)
- Helm 3
- Prometheus (as data source)
- Loki (as data source)
- Alertmanager (as data source)
- PromQL (queries for cluster, node, pod, network, disk metrics)
- kube-state-metrics
- node-exporter
- Grafana unified alerting (provisioning files)
- Grafana dashboard provisioning (file provider, sidecar)

## Sources Consulted
- Official Grafana Helm chart documentation and values reference: https://github.com/grafana/helm-charts/tree/main/charts/grafana
- Grafana provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana unified alerting provisioning: https://grafana.com/docs/grafana/latest/alerting/set-up/provision-alerting-resources/file-provisioning/
- Grafana configuration reference (grafana.ini): https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/
- Prometheus community Helm chart (service naming `prometheus-server`, `prometheus-alertmanager`): https://github.com/prometheus-community/helm-charts
- kube-state-metrics metric reference: https://github.com/kubernetes/kube-state-metrics/tree/main/docs
- node_exporter metric reference: https://github.com/prometheus/node_exporter
- Grafana community dashboards (IDs 1860, 6417, 315, 12740, 13770): https://grafana.com/grafana/dashboards/
- Kubernetes NodePort range (30000-32767): https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
No technical issues found.

## Review Notes
- The `helm install` command does not include `--create-namespace`. This is acceptable because the prerequisites state Prometheus is already running in the `monitoring` namespace, so the namespace will exist. Worth noting for readers adapting to other namespaces.
- The Prometheus URL `http://prometheus-server.monitoring.svc.cluster.local` (no port) defaults to port 80, which is what the prometheus-community chart exposes. This is correct but implicit.
- The default admin password `changeme-in-production` is clearly flagged as a placeholder; the post correctly notes secret retrieval for the auto-generated case.
- The Alertmanager data source uses `jsonData.implementation: prometheus`, which is correct for the Prometheus-flavored Alertmanager (the alternative is `mimir`).
- Dashboard ID 6336 is labelled "kubernetes-pods" — community dashboard IDs occasionally get deprecated or replaced over time, so readers should verify the dashboard still matches their needs when importing.
- The sidecar `searchNamespace: ALL` will scan every namespace for ConfigMaps with the `grafana_dashboard` label. For large clusters, restricting to a specific namespace may be preferable for performance/security.
- Grafana 11+ has reorganized some UI paths (Configuration > Data Sources is now under "Connections > Data sources" in newer versions). The UI instructions reflect the classic layout that still works via direct navigation.
