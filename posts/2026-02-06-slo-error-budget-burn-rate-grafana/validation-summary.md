# Validation Summary: How to Create an SLO Status Dashboard with Error Budget Burn Rate Visualization

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- OpenTelemetry metrics and semantic conventions
- Prometheus recording rules, alerting rules, and PromQL
- Grafana dashboard panels and thresholds
- SLOs, SLIs, error budgets, and burn-rate alerting

## Sources Consulted
- OpenTelemetry HTTP semantic convention metrics: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry Prometheus and OpenMetrics compatibility: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Google SRE Workbook, Alerting on SLOs: https://sre.google/workbook/alerting-on-slos/
- Grafana Gauge visualization documentation: https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/gauge/
- Grafana Time series visualization documentation: https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/time-series/

## Issues Found
- The PromQL examples used the older/non-current HTTP status label `http_status_code`. Current OpenTelemetry HTTP semantic conventions use `http.response.status_code`, which is typically exposed to Prometheus as `http_response_status_code` after name translation. Updated all availability and burn-rate queries to use `http_response_status_code`.
- The SLI recording-rule introduction did not state the OpenTelemetry-to-Prometheus name translation assumptions for metric and label names. Added a concise note explaining the expected translations for `http.server.request.duration`, `http.response.status_code`, and `service.name`.
- The availability "good request" comment said successful requests were both non-5xx and under 500ms, but that query only filtered non-5xx responses. Updated the comment to say "non-5xx responses"; the latency SLO query separately handles the 500ms condition.

## Review Notes
The Prometheus recording rule and alerting rule structure is valid, and the 14.4x / 6x / 3x burn-rate thresholds are consistent with the multi-window SLO alerting approach described in the Google SRE Workbook. The examples assume resource attributes such as `service.name` are copied into Prometheus labels; deployments that do not enable that behavior will need to adjust the grouping label.
