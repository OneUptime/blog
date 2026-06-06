# Validation Summary: How to Set Up Automated Performance Alerting When P99 Latency Exceeds SLO

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python metrics
- OpenTelemetry HTTP semantic conventions
- Prometheus recording rules and alerting rules
- PromQL histogram queries
- SLO error budgets and multi-window burn-rate alerting
- OneUptime incident API

## Sources Consulted
- OpenTelemetry Python metrics API: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python SDK metrics and views: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.html
- OpenTelemetry Python metric views: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.view.html
- OpenTelemetry Python OTLP exporter API: https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- Prometheus recording and alerting rule syntax: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus `histogram_quantile` documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Google SRE Workbook, Alerting on SLOs: https://sre.google/workbook/alerting-on-slos/
- OneUptime Incident API reference: https://oneuptime.com/reference/en/incident

## Issues Found
- The SLO definition used `objective: 0.995` and all burn-rate math used a 0.5% error budget, which does not match a P99 latency SLO. Updated the objective and PromQL budget constants to 99% / 1%.
- The OpenTelemetry histogram comments claimed bucket granularity around 500 ms, but the code did not configure custom buckets. Added a `View` with `ExplicitBucketHistogramAggregation` boundaries around the SLO threshold.
- The Python snippet used the old `http.status_code` attribute. Updated it to the stable HTTP metric semantic convention attribute `http.response.status_code`.
- The counter name `slo.latency.total` translated awkwardly to `slo_latency_total_total` in Prometheus. Renamed it to `slo.latency.requests` and updated all PromQL examples to use `slo_latency_requests_total`.
- The slow-burn alert was described as a Google SRE default but used a non-default 3x multiplier with 1d/6h windows. Updated it to the SRE workbook-style 3d/6h, 1x ticket-level burn pattern.
- The OneUptime incident example used `POST /incidents`, Bearer auth, and a flat incident body. Updated it to `POST /api/incident`, `ApiKey` authentication, and a `data` payload with required incident fields.

## Review Notes
- `promtool` was not installed in the local environment, so Prometheus rule validation was done by inspection against the official Prometheus rule syntax and PromQL documentation.
- The incident handler still assumes helper functions such as `query_current_p99` and `query_error_budget` exist elsewhere in the integration, which is reasonable for a focused blog snippet but should be made explicit in a complete production example.
