# Validation Summary: How to Create Custom Alerting Rules for Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio service mesh
- Istio telemetry and control-plane metrics
- Prometheus alerting rules and PromQL
- Prometheus Operator `PrometheusRule` and `AlertmanagerConfig`
- Alertmanager routing
- kube-prometheus-stack
- `kubectl port-forward`
- `promtool`

## Sources Consulted
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio command and exported metrics reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio pilot-agent exported metrics reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Istio 1.22.4 release note for `istio_agent_cert_expiry_seconds`: https://istio.io/latest/news/releases/1.22.x/announcing-1.22.4/
- Prometheus Operator API reference for `AlertmanagerConfig`, receivers, routes, Slack, and PagerDuty fields: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Operator alerting guide: https://prometheus-operator.dev/docs/developer/alerting/
- Prometheus recording and alerting rule configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus template reference for alert annotations and `humanizePercentage`: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- Prometheus `promtool` command reference: https://prometheus.io/docs/prometheus/latest/command-line/promtool/
- Prometheus rule unit testing reference: https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/

## Issues Found
- Updated `AlertmanagerConfig` from `monitoring.coreos.com/v1alpha1` to the current documented `monitoring.coreos.com/v1beta1` API version.
- Updated Alertmanager `groupBy` to use labels produced by the Istio alert queries instead of a generic `service` label that the rules did not set.
- Added `namespace: monitoring` labels to the alert rules and a short note explaining why, because `AlertmanagerConfig` routing applies to alerts with a matching `namespace` label by default.
- Replaced obsolete `pilot_xds_push_errors` with the documented Istio metric `pilot_total_xds_internal_errors` and renamed the alert/annotations accordingly.
- Replaced obsolete Citadel certificate expiry metric usage with `istio_agent_cert_expiry_seconds`, which is the current Istio agent certificate expiry metric name referenced by Istio release notes.
- Changed the certificate alert text from root certificate expiry to workload certificate expiry to match the metric being queried.
- Clarified that the latency spike alert compares against a one-hour baseline, not an hourly average.
- Clarified that `promtool check rules` expects Prometheus native rule files with top-level `groups:`, not Kubernetes `PrometheusRule` manifests.

## Review Notes
- The Istio service metrics, labels, histogram query pattern, Alertmanager receiver field names, Prometheus template function, `kubectl port-forward` usage, and `promtool test rules` command were consistent with official documentation.
- `promtool` was not installed in the local environment, so command execution could not be tested locally; the commands were verified against the official Prometheus documentation.
