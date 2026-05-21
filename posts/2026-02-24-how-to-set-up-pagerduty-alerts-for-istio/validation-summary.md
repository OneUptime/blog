# Validation Summary: How to Set Up PagerDuty Alerts for Istio

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Istio
- PagerDuty Events API v2
- Prometheus alerting rules and PromQL
- Alertmanager routing, receivers, templates, API v2 alerts, and silences
- Kubernetes Secrets, ConfigMaps, and kubectl port-forward
- Prometheus Operator PrometheusRule CRD

## Sources Consulted
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus notification template reference: https://prometheus.io/docs/alerting/latest/notifications/
- PagerDuty Prometheus Integration Guide: https://www.pagerduty.com/docs/guides/prometheus-integration-guide/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio pilot-discovery metrics reference: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Prometheus Operator API reference for PrometheusRule and Alertmanager secret mounts: https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes kubectl create secret generic reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/

## Issues Found
- The PagerDuty setup allowed either "Prometheus" or "Events API v2", but the Alertmanager configuration used the Events API v2 URL. PagerDuty and Alertmanager distinguish Events API v2 `routing_key` from Prometheus/Events API v1 `service_key`, so the post now tells readers to select Events API v2 and uses `routing_key_file`.
- The PagerDuty key file path did not match the Kubernetes secret name when using the Prometheus Operator's documented secret mount path. Updated the file path to `/etc/alertmanager/secrets/pagerduty-config/integration-key`.
- The Alertmanager routing example used deprecated `match` and `match_re` fields. Updated routes to use current `matchers` syntax.
- The route order and `continue: true` could send duplicate critical Istio incidents and prevent warning Istio alerts from reaching the Istio-specific receiver. Reordered the Istio route first and removed the duplicate-routing behavior.
- The `IstioServiceDown` PromQL expression only worked when a current zero-rate series still existed. Updated it to use `unless` so workloads with traffic one hour ago and no current positive traffic are detected.
- The `IstioProxySyncStale` rule queried `pilot_proxy_convergence_time{quantile="0.99"}`, but current Istio exposes this distribution as histogram-style Prometheus series. Updated it to use `histogram_quantile` over `pilot_proxy_convergence_time_bucket`.

## Review Notes
- All YAML snippets in the post were parsed successfully after the changes.
- `kubectl`, `amtool`, and `promtool` were not installed in the local environment, so CLI execution and Alertmanager/Prometheus rule validation were checked against official documentation rather than those local binaries.
- The Alertmanager secret path assumes the secret is mounted into Alertmanager, such as through the Prometheus Operator `Alertmanager.spec.secrets` mechanism.
