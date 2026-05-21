# Validation Summary: How to Set Up Real-Time Monitoring with Istio Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio sidecar telemetry and standard metrics
- Prometheus and Prometheus Operator
- PrometheusRule recording and alerting rules
- PromQL
- Grafana dashboards and Prometheus data source
- Kubernetes `kubectl logs`
- Alertmanager Slack and PagerDuty routing

## Sources Consulted
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio secure metrics scraping documentation: https://istio.io/latest/docs/tasks/observability/metrics/secure-metrics/
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Alertmanager configuration reference: https://prometheus.io/docs/alerting/latest/configuration/
- Grafana Prometheus data source documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/
- Grafana Prometheus template variables documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/
- Grafana Live documentation: https://grafana.com/docs/grafana/latest/setup-grafana/set-up-grafana-live/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The post stated that Prometheus scrape and rule evaluation intervals default to 15 seconds. Upstream Prometheus defaults both to 1 minute, while Prometheus Operator defaults both to 30 seconds. Updated the text and adjusted the expected default end-to-end delay.
- The Istio scrape job targeted port 15090 but omitted `metrics_path: /stats/prometheus`, which would make Prometheus scrape `/metrics` by default. Added the correct Istio metrics path.
- The alert `for: 30s` explanation described exactly three consecutive evaluations. Prometheus waits for the configured duration between first seeing the condition and firing, with checks at each evaluation. Reworded the explanation to say the condition must remain true for about 30 seconds.
- The Grafana streaming paragraph claimed Mimir and Thanos have experimental streaming support for panels. Current official docs describe Mimir and Thanos access through Prometheus-compatible HTTP APIs, while Grafana streaming is provided by Grafana Live-compatible data sources. Updated the paragraph accordingly.
- The Alertmanager route used deprecated `match` syntax. Updated it to `matchers`.
- The PagerDuty receiver used `service_key`. Updated the example to `routing_key` for PagerDuty Events API v2.
- The `resolve_timeout` explanation implied it speeds up normal Prometheus alert resolution. Alertmanager documentation notes that Prometheus alerts include an end time, so `resolve_timeout` does not control their resolution timing. Updated the explanation.

## Review Notes
- The resource sizing example is plausible but inherently workload-dependent; future revisions could frame it as a starting point to load test rather than a general recommendation.
- The Istio scrape example is intentionally focused on Envoy-sidecar metrics. In installations using Istio metrics merging, scraping `:15020/stats/prometheus` via Istio-added annotations is the default path for merged Istio and application metrics.
