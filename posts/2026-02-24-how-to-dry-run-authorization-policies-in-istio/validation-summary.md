# Validation Summary: How to Dry-Run Authorization Policies in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio dry-run authorization annotation
- Envoy RBAC debug logs and metrics
- Kubernetes `kubectl logs`
- Prometheus and PrometheusRule alerting

## Sources Consulted
- Istio dry-run authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-dry-run/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Telemetry access logging documentation: https://istio.io/latest/docs/tasks/observability/logs/telemetry-api/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post said dry-run decisions appear in Envoy access logs as `rbac_access_logged_only`, `shadow_denied`, and `shadow_allowed` response flags. Istio's dry-run documentation shows dry-run results in RBAC proxy debug logs as `shadow denied` / `shadow allowed` messages. Updated the logging explanation, setup command, example log line, and grep commands.
- The post queried `istio_requests_total` with a `response_flags` label for dry-run denials. Istio documents dry-run results through Envoy RBAC metrics such as `envoy_http_inbound_0_0_0_0_80_rbac` with `authz_dry_run_action` and `authz_dry_run_result` labels. Updated the PromQL examples and alert rule to use Envoy RBAC metrics.
- The alerting section treated dry-run metric output as a stable monitoring API. Istio documents dry-run log, metric, and trace output as troubleshooting signals that may change. Updated the wording to frame alerts as temporary rollout alerts that should be reviewed after upgrades.

## Review Notes
The AuthorizationPolicy examples use the current `security.istio.io/v1` API and valid dry-run annotation. The dry-run feature is still documented by Istio as Alpha/experimental, so future Istio upgrades should re-check the exact log and metric output before relying on these examples operationally.
