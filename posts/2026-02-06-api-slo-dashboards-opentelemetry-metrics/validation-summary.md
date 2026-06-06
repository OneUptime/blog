# Validation Summary: How to Build API SLO Dashboards from OpenTelemetry Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Metrics API
- OpenTelemetry JavaScript API
- OpenTelemetry HTTP semantic conventions
- Prometheus / PromQL
- SLOs, error budgets, and burn-rate alerting
- TypeScript / Express-style middleware

## Sources Consulted
- OpenTelemetry Metrics API: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry HTTP semantic convention migration guide: https://opentelemetry.io/docs/specs/semconv/non-normative/http-migration/
- OpenTelemetry metrics SDK advisory parameters: https://opentelemetry.io/docs/specs/otel/metrics/sdk/
- OpenTelemetry general metric semantic conventions and naming: https://opentelemetry.io/docs/specs/semconv/general/metrics/ and https://opentelemetry.io/docs/specs/semconv/general/naming/
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- OpenTelemetry Prometheus and OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus histograms and summaries documentation: https://prometheus.io/docs/practices/histograms/

## Issues Found
- The HTTP duration histogram used milliseconds. OpenTelemetry's stable HTTP server request duration semantic convention uses seconds (`unit: "s"`) and recommends bucket boundaries in seconds. Updated the code to record seconds and changed the bucket boundaries around `0.5` seconds.
- The code used older HTTP attribute names (`http.method` and `http.status_code`). Updated the example to use stable semantic convention attributes: `http.request.method`, `http.response.status_code`, `http.route`, `url.scheme`, and `error.type` for server errors.
- The text said two instruments were needed while the example created three instruments. Updated the wording to say a histogram and counters.
- The total request counter was named `http.server.request.total`, which would produce confusing Prometheus names such as `http_server_request_total_total` under default counter suffix translation. Renamed it to `http.server.requests` and updated the PromQL queries to use `http_server_requests_total`.
- The latency PromQL used millisecond bucket labels and omitted the default Prometheus unit suffix for an OpenTelemetry duration histogram. Updated the query to use `http_server_request_duration_seconds_bucket{le="0.5"}` and `http_server_request_duration_seconds_count`.
- The alert threshold section described remaining-budget thresholds as burn-rate thresholds. Updated that sentence to say the thresholds are based on remaining error budget.

## Review Notes
The in-process `ErrorBudgetTracker` example is technically valid as a small application-level illustration, but production SLO dashboards should normally calculate rolling windows from the metrics backend so multiple service instances and restarts are handled correctly. Prometheus metric names can vary if an exporter is configured with a non-default translation strategy, so teams should confirm the actual names exposed by their backend.
