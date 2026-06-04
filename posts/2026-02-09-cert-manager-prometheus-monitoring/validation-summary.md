# Validation Summary: How to Implement cert-manager Certificate Monitoring with Prometheus Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- cert-manager
- Prometheus and PromQL
- Prometheus Operator ServiceMonitor and PrometheusRule resources
- Alertmanager
- Grafana dashboards
- ACME certificate issuance metrics

## Sources Consulted
- cert-manager Prometheus metrics documentation: https://cert-manager.io/docs/devops-tips/prometheus-metrics/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- cert-manager metrics source definitions: https://raw.githubusercontent.com/cert-manager/cert-manager/master/pkg/metrics/metrics.go
- cert-manager certificate collector source: https://raw.githubusercontent.com/cert-manager/cert-manager/master/internal/collectors/certificate_collector.go
- cert-manager Helm chart ServiceMonitor and Service templates: https://github.com/cert-manager/cert-manager/tree/master/deploy/charts/cert-manager/templates
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus metric types documentation: https://prometheus.io/docs/concepts/metric_types/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Grafana visualization documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/
- Grafana dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/

## Issues Found
- The post treated `certmanager_certificate_ready_status` as a single ready/not-ready gauge. The current metric includes a `condition` label with `True`, `False`, and `Unknown` series, so `== 0` counts healthy certificates incorrectly. Updated readiness queries, alerts, dashboard panels, and recording rules to filter `condition="True"` for ready certificates or `condition!="True" == 1` for not-ready certificates.
- The post described `certmanager_certificate_renewal_timestamp_seconds` as a last-renewal timestamp. cert-manager exposes it as the scheduled renewal time. Updated comments, queries, alert naming, dashboard wording, and lifecycle examples to describe scheduled renewal time instead of last renewal.
- Several PromQL examples used `increase()` or `rate()` on gauge timestamp/status metrics. Replaced these with gauge-appropriate comparisons or `changes()` where the goal was to track status or scheduled-renewal changes.
- Expiration queries and alerts did not exclude unset expiration timestamps, which cert-manager can expose as `0`. Added `certmanager_certificate_expiration_timestamp_seconds > 0` filters to avoid false alerts and misleading dashboard values.
- The renewal failure alert used counter-only logic on a gauge. Replaced it with a renewal-overdue alert based on scheduled renewal time and certificate expiration.
- The controller sync failure query used a non-existent `status="error"` label on `certmanager_controller_sync_call_count`. Updated it to use `certmanager_controller_sync_error_count`.
- The slow ACME operation query used `histogram_quantile()` against a non-existent `_bucket` metric. cert-manager exposes ACME request duration as a summary, so the query now uses the `quantile="0.99"` series.
- The post referenced a non-existent `certmanager_controller_queue_depth` metric. Replaced it with a controller sync volume query using `certmanager_controller_sync_call_count`.
- Several issuer and namespace aggregation examples counted every readiness condition series, effectively triple-counting certificates. Updated these examples to count only `condition="True"` series.
- The Alertmanager routing examples used deprecated `match` syntax. Updated them to current `matchers` syntax.
- Grafana graph panels used the legacy `graph` panel type. Updated the examples to use the current `timeseries` visualization.

## Review Notes
The ServiceMonitor example is plausible for Helm-created cert-manager Services using the `tcp-prometheus-servicemonitor` Service port. Current cert-manager documentation also recommends enabling the chart-managed PodMonitor or ServiceMonitor when possible, which reduces the chance of selector or port-name drift.
