# Validation Summary: How to Create Grafana Dashboards for Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Prometheus Operator
- Prometheus / PromQL
- kube-state-metrics
- Grafana
- Grafana Operator

## Sources Consulted
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux custom Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/custom-metrics/
- Flux monitoring example PodMonitor and dashboards: https://github.com/fluxcd/flux2-monitoring-example
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Grafana Operator dashboard examples: https://grafana.github.io/grafana-operator/docs/examples/dashboard_from_url/readme/
- Grafana alerting documentation: https://grafana.com/docs/grafana/latest/alerting/alerting-rules/
- Grafana alerting provisioning documentation: https://grafana.com/docs/grafana/latest/alerting/set-up/provision-alerting-resources/file-provisioning/
- Grafana.com dashboard API for dashboard 16714: https://grafana.com/api/dashboards/16714

## Issues Found
- The post described `gotk_reconcile_condition` and `gotk_suspend_status` as current Flux controller metrics. Current Flux documentation distinguishes controller metrics from Flux custom resource state metrics, and the current monitoring example uses `gotk_resource_info` from kube-state-metrics for readiness and suspension state. Updated the overview, prerequisites, PromQL examples, dashboard JSON, recording rule, and summary to use `gotk_resource_info`.
- The scraping section led with a ServiceMonitor for Flux controllers. Flux's monitoring example uses a PodMonitor selecting controller Pods on the `http-prom` port. Updated the primary example to a PodMonitor and kept ServiceMonitor as an option only when metrics are exposed through Services.
- The Grafana sidecar ConfigMap example wrapped the dashboard JSON in a `dashboard` object, which is the HTTP API import shape rather than the dashboard JSON model expected by file/sidecar provisioning. Updated the example to store the dashboard JSON object directly.
- The alerting section said to add Grafana alert rules directly on dashboard panels, but current Grafana alerting treats alert rules as managed resources that may be linked to panels. Updated the wording to use PrometheusRule recording rules that dashboard panels and alerts can reuse.
- The post described Grafana.com dashboard ID 16714 as a maintained Flux community dashboard. The Grafana.com metadata shows an older third-party dashboard last updated in 2022. Updated the wording to present it as an existing starting point and added a reminder to check its queries against the user's Flux and kube-state-metrics versions.

## Review Notes
The edited YAML snippets and embedded dashboard JSON were parsed locally. PromQL examples were reviewed against the current Flux monitoring documentation and the Flux monitoring example dashboards.
