# Validation Summary: How to Integrate Istio with Grafana for Dashboards

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Grafana
- Prometheus
- Kubernetes
- PromQL
- Grafana dashboard provisioning and HTTP API
- Grafana Helm chart dashboard sidecar

## Sources Consulted
- Istio Grafana integration documentation: https://istio.io/latest/docs/ops/integrations/grafana/
- Istio Visualizing Metrics with Grafana task: https://istio.io/latest/docs/tasks/observability/metrics/using-istio-dashboard/
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio release-1.29 sample Grafana add-on manifest: https://raw.githubusercontent.com/istio/istio/release-1.29/samples/addons/grafana.yaml
- Istio release-1.29 sample Prometheus add-on manifest: https://raw.githubusercontent.com/istio/istio/release-1.29/samples/addons/prometheus.yaml
- Istio release-1.29 dashboard JSON files in the Istio repository: https://github.com/istio/istio/tree/release-1.29/manifests/addons/dashboards
- Grafana provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana Prometheus data source and template variable documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/
- Grafana Node Graph documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/node-graph/
- Prometheus storage and retention documentation: https://prometheus.io/docs/prometheus/latest/storage/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/

## Issues Found
- The quick-start commands and dashboard download URLs used Istio `release-1.20`, which is outdated for a 2026 post. Updated the sample add-on URLs and dashboard download URLs to `release-1.29`.
- The mesh dashboard file path was no longer correct in the current Istio dashboard directory. Updated `istio-mesh-dashboard.json` to `istio-mesh-dashboard.gen.json`.
- The post described control-plane metrics under the Istio Performance Dashboard. Updated the Performance Dashboard description to match its resource-usage focus and added the current Istio Control Plane Dashboard with the correct `pilot-dashboard.gen.json` download.
- The Grafana Node Graph guidance implied the raw PromQL query could be used directly as a Node Graph panel. Clarified that Grafana's Node Graph requires edge fields such as `id`, `source`, and `target`, so the query should be used in a table or transformed before using Node Graph.
- The alerting section labeled Prometheus-style YAML as a Grafana alerting rule. Reworded it to describe Prometheus-compatible alert rules that Grafana can evaluate from Prometheus data.
- The Prometheus retention YAML used an inaccurate retention structure. Updated it to the current Prometheus configuration shape under `storage.tsdb.retention.time` and `storage.tsdb.retention.size`.

## Review Notes
The post remains version-specific to Istio `release-1.29`. Future Istio releases may change dashboard filenames, dashboard IDs, or sample add-on manifests, so these links should be rechecked during later reviews.
