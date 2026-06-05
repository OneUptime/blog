# Validation Summary: How to Build Multi-Burn-Rate SLO Alerts from OpenTelemetry Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry metrics
- OpenTelemetry HTTP semantic conventions
- Prometheus recording rules
- Prometheus alerting rules
- PromQL
- SLO burn-rate alerting

## Sources Consulted
- Google SRE Workbook, "Alerting on SLOs": https://sre.google/workbook/alerting-on-slos/
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- OpenTelemetry Prometheus and OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- Prometheus guide for using Prometheus as an OpenTelemetry backend: https://prometheus.io/docs/guides/opentelemetry/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus histograms and summaries documentation: https://prometheus.io/docs/practices/histograms/

## Issues Found
- The recording-rule examples used `http_server_request_errors_total` and `http_server_request_total`, which are not the standard OpenTelemetry HTTP semantic convention metrics. Updated them to use the Prometheus-translated `http.server.request.duration` histogram count series, `http_server_request_duration_seconds_count`, filtering 5xx responses with `http_response_status_code=~"5.."`.
- The examples filtered on `service="payment-service"`, but OpenTelemetry `service.name` is translated into Prometheus identity labels such as `job` by the Collector/Prometheus interoperability path. Updated the examples to filter on `job="payment-service"`.
- The critical alert annotation used `{{ $value | humanizePercentage }}` as if it were the burn rate per hour. In that expression, `$value` is the left-hand error-rate ratio, not a burn-rate multiplier. Updated the annotation to state the configured 14.4x burn rate directly.
- The same annotation said a 14.4x burn rate exhausts a 30-day budget in less than 2 days. The calculation is 30 / 14.4 = about 2.08 days, so the wording was changed to "about 2 days."
- The latency SLO PromQL used `http_server_request_duration_bucket` and `http_server_request_duration_count` with `le="200"`. The OpenTelemetry HTTP duration metric has unit seconds and translates to `http_server_request_duration_seconds_bucket` / `_count`; 200 ms is represented as `le="0.2"`. Updated the query accordingly.

## Review Notes
- The burn-rate thresholds and alert windows match the Google SRE Workbook's multiwindow, multi-burn-rate recommendations.
- The Prometheus rule snippets follow the documented recording-rule and alerting-rule structure. `promtool` was not installed in this workspace, so I could not run Prometheus' native rule syntax checker locally.
