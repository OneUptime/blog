# Validation Summary: How to Configure Policy Report CRDs for Compliance Dashboard Integration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes PolicyReport and ClusterPolicyReport CRDs
- Kyverno policy reporting
- Policy Reporter and Policy Reporter UI
- Helm
- Prometheus and Prometheus Operator ServiceMonitor
- Grafana dashboards
- Slack and Elasticsearch Policy Reporter targets
- Kubernetes CronJob
- Python requests

## Sources Consulted
- Kubernetes Policy Working Group PolicyReport v1alpha2 Go API: https://pkg.go.dev/sigs.k8s.io/wg-policy-prototypes/policy-report/apis/wgpolicyk8s.io/v1alpha2
- Kyverno Policy Reports documentation: https://kyverno.io/docs/policy-reports/
- Policy Reporter Helm chart documentation: https://kyverno.github.io/policy-reporter/guide/helm-chart-core/
- Policy Reporter chart values: https://github.com/kyverno/policy-reporter/blob/main/charts/policy-reporter/values.yaml
- Policy Reporter API reference: https://kyverno.github.io/policy-reporter/core/api-reference/
- Policy Reporter config reference: https://kyverno.github.io/policy-reporter/core/config-reference/
- Policy Reporter targets documentation: https://kyverno.github.io/policy-reporter/core/targets/
- Policy Reporter report filter documentation: https://kyverno.github.io/policy-reporter/core/report-filter/
- Policy Reporter Service and ServiceMonitor templates: https://github.com/kyverno/policy-reporter/tree/main/charts/policy-reporter/templates

## Issues Found
- Updated the introductory policy engine claim to avoid implying OPA Gatekeeper natively emits PolicyReport resources in the same way as Kyverno. The post now refers to Kyverno and tools that emit PolicyReport resources.
- Corrected the Helm install command from `kyvernoPlugin.enabled=true` to the current chart value `plugin.kyverno.enabled=true`, and enabled metrics because later Prometheus examples depend on them.
- Removed the invalid `targets.prometheus` configuration. Policy Reporter exposes metrics through `metrics.enabled`; Prometheus scrapes the `/metrics` endpoint.
- Corrected the ServiceMonitor endpoint port from `metrics` to `http`, matching the Policy Reporter service template.
- Fixed Prometheus and Grafana queries so totals include both `policy_report_result` and `cluster_policy_report_result`.
- Updated Grafana panel types from older `graph`/`bar` values to current `timeseries`/`barchart` values.
- Corrected Slack and Elasticsearch configuration snippets by removing the obsolete `targets:` wrapper and invalid `enabled` flags for config-file examples.
- Corrected the report filter example. Policy Reporter's report filter supports namespace include/exclude and cluster report disabling; priorities and sources belong to target or metric filters, not `reportFilter`.
- Fixed the CronJob example by using an Alpine image that can install both `curl` and `jq`, and changed the API call and `jq` expression to match the Policy Reporter status-counts response.
- Replaced invalid Policy Reporter API endpoints such as `/v1/policy-reports` and `/v1/namespaced-resources/targets` with documented `/v1/namespaced-resources/results`, `/v1/cluster-resources/results`, and status-count endpoints.
- Fixed the Python automation example to use the documented status-counts API response shape and removed the undefined `send_alert()` call.
- Clarified that the custom template ConfigMap is for a user-owned report generator, not a built-in Policy Reporter templating feature.

## Review Notes
Kyverno documentation notes OpenReports (`openreports.io/v1alpha1`) is available as an alpha alternative and may eventually replace `wgpolicyk8s` for permanent reports. The post remains valid for the `wgpolicyk8s.io/v1alpha2` PolicyReport CRDs it explicitly discusses.
