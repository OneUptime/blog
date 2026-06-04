# Validation Summary: How to Build a Kubernetes Cluster Health Dashboard

## Status
validated

## Post Type
Tutorial / Operations guide

## Technologies Covered
- Kubernetes
- Grafana
- Grafana Operator
- Prometheus and PromQL
- kube-state-metrics
- Prometheus Go client library
- Kubernetes Deployments, Services, and ConfigMaps

## Sources Consulted
- Grafana dashboard JSON model: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/
- Grafana Operator examples for GrafanaDashboard v1beta1: https://github.com/grafana/grafana-operator
- Grafana time series visualization documentation: https://grafana.com/docs/grafana/latest/panels/visualizations/time-series/graph-time-series-stacking/
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics node metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/node-metrics.md
- kube-state-metrics pod metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Prometheus PromQL functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Go application instrumentation guide: https://prometheus.io/docs/guides/go-application/
- Prometheus promhttp package documentation: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus/promhttp
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- Kubernetes Service API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- Kubernetes ConfigMap API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/config-map-v1/

## Issues Found
- The cluster overview dashboard JSON was wrapped in a top-level `dashboard` object. Grafana's dashboard JSON model and the Grafana Operator `spec.json` example expect the dashboard fields such as `title` and `panels` at the root. Removed the wrapper and kept the dashboard as a direct Grafana dashboard object.
- The cluster status panel threshold override matched a field named `Total Nodes`, but the query did not define that legend. Added `legendFormat: "Total Nodes"` so the override targets the intended field.
- The Grafana Operator example used `"panels": [...]`, which is not valid JSON. Replaced it with `"panels": []` so the snippet remains syntactically valid while still indicating where panels belong.
- The application health dashboard used the legacy Grafana `graph` panel type. Updated those panels to `timeseries`, matching current Grafana visualization guidance.
- The Resource Utilization Dashboard label was missing Markdown heading syntax. Added the `##` heading marker so the section renders correctly.
- The final deployment section claimed to deploy Prometheus, Grafana, and dashboards together, but the manifest only deployed Grafana and a Service. Updated the wording to describe deploying Grafana alongside Prometheus and dashboard resources.
- The final Grafana Deployment mounted an undefined `grafana-dashboards` ConfigMap into Grafana's provisioning dashboard config directory without a valid dashboard provider configuration. Removed the broken mount and volume reference.

## Review Notes
- The PromQL examples use common metric names from kube-state-metrics, cAdvisor/node-exporter, blackbox exporter, and application instrumentation. Actual availability depends on the monitoring stack's scrape jobs and labels.
- The image `grafana/grafana:latest` is valid but not ideal for production reproducibility; a pinned version would be preferable in a production guide.
- Anonymous Grafana access with Viewer permissions is technically valid but should be restricted or protected in production environments.
