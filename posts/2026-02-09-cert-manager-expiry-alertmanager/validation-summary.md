# Validation Summary: How to Implement cert-manager Certificate Expiry Alerting with Alertmanager

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes
- cert-manager
- Prometheus
- Prometheus Operator PodMonitor and PrometheusRule CRDs
- Alertmanager
- PromQL
- Grafana

## Sources Consulted
- cert-manager Prometheus metrics documentation: https://cert-manager.io/docs/devops-tips/prometheus-metrics/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- cert-manager v1.18 to v1.19 upgrade notes for ACME metric label changes: https://cert-manager.io/docs/releases/upgrading/upgrading-1.18-1.19/
- cert-manager metrics source: https://github.com/cert-manager/cert-manager/blob/master/pkg/metrics/metrics.go
- cert-manager certificate metric tests: https://github.com/cert-manager/cert-manager/blob/master/pkg/metrics/certificates_test.go
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus template reference: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/

## Issues Found
- The scraping example used a ServiceMonitor with a non-current cert-manager port name. Updated the section to use a PodMonitor with the current cert-manager component labels and `http-metrics` port, matching cert-manager's current metrics documentation.
- The apply command still referenced `servicemonitor.yaml`. Updated it to `podmonitor.yaml`.
- The expiry alert expressions divided remaining lifetime by 86400, then used `humanizeDuration`, which expects seconds. Updated the expressions to compare seconds directly and added a positive remaining-time check so the descriptions report accurate durations.
- The ACME failure alert matched `status="error"`, but the current `certmanager_http_acme_client_request_count` metric uses HTTP status-code labels. Updated the matcher to `status=~"4..|5.."`.
- The Alertmanager routing example used deprecated `match` and `match_re` fields. Updated routes to use the current `matchers` syntax.
- The advanced issuance-rate alert used `rate()` on `certmanager_certificate_renewal_timestamp_seconds`, which is a timestamp gauge and not a counter. Replaced it with a backlog-style alert that counts certificates scheduled to renew in the next 15 minutes.
- The testing prose said a warning would arrive within 30 minutes, but the configured alert `for` duration and renewal behavior did not support that timing. Updated the wording to refer to the configured `for` period.
- The troubleshooting command used a ServiceMonitor lookup and service port-forward. Updated it to check PodMonitor and port-forward the cert-manager deployment metrics endpoint.

## Review Notes
- The raw Alertmanager Secret example is valid for Alertmanager setups that load configuration from the `alertmanager.yaml` key. In Prometheus Operator installations, the exact Secret name depends on the Alertmanager resource's `spec.configSecret` or the operator's default naming convention.
- `kubectl` and `promtool` were not installed in the review environment, so those CLI commands could not be executed locally. YAML snippets were parsed with PyYAML, and command/config correctness was checked against official documentation.
