# Validation Summary: How to Set Up Grafana Dashboards for Istio Service Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Grafana
- Prometheus
- PromQL
- Kubernetes kubectl
- istioctl

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Prometheus integration: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio Grafana integration: https://istio.io/latest/docs/ops/integrations/grafana/
- Istio Grafana dashboard task: https://istio.io/latest/docs/tasks/observability/metrics/using-istio-dashboard/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Supported Releases: https://istio.io/latest/docs/releases/supported-releases/
- Grafana dashboard JSON model: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/
- Grafana dashboard import documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/import-dashboards/
- Grafana Prometheus template variables: https://grafana.com/docs/grafana-cloud/connect-externally-hosted/data-sources/prometheus/template-variables/
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The Istio addon installation commands referenced the unsupported `release-1.20` branch. Updated the Prometheus and Grafana addon URLs to `release-1.30`, which matches the current Istio documentation and supported release table on 2026-05-21.
- The TCP "Open connections" example subtracted raw cumulative counters, which is misleading for a time-series panel and does not account for counter reset behavior. Replaced it with separate connection open and close rate queries using `rate(...)`.
- The gRPC query comment said "by method" but the query grouped by `grpc_response_status`. Updated the comment to "by status".
- The dashboard JSON example used the HTTP API import wrapper shape with a top-level `dashboard` key while the surrounding instructions describe pasting a dashboard JSON model into the Grafana import UI. Changed the JSON to use the dashboard model at the root and added basic `schemaVersion` and `version` fields.

## Review Notes
The core Istio metric names, labels, `istioctl dashboard grafana` command, Prometheus `rate(...)` usage, and `histogram_quantile(...)` examples are consistent with the official documentation. The Istio sample addon manifests are documented by Istio as quick-start/demo installations and are not tuned for production performance or security.
