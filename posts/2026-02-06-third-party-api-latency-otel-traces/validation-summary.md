# Validation Summary: How to Track Third-Party API Dependency Latency Impact on Your Application

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry JavaScript tracing API
- OpenTelemetry HTTP semantic conventions
- OpenTelemetry Collector Span Metrics Connector
- OpenTelemetry Collector Prometheus exporter
- Prometheus and PromQL
- Grafana dashboard JSON
- Node.js and axios

## Sources Consulted
- OpenTelemetry Tracing API: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry HTTP semantic conventions stability update: https://opentelemetry.io/blog/2023/http-conventions-declared-stable/
- OpenTelemetry Collector Span Metrics Connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- OpenTelemetry Collector exporter documentation: https://opentelemetry.io/docs/collector/components/exporter/
- Prometheus histogram documentation: https://prometheus.io/docs/practices/histograms/
- Prometheus PromQL vector matching documentation: https://prometheus.io/docs/prometheus/3.0/querying/operators/

## Issues Found
- The JavaScript span attributes used older HTTP semantic convention names such as `http.method`, `http.url`, and `http.status_code`. Updated them to current stable names such as `http.request.method`, `url.full`, and `http.response.status_code`.
- The body size attributes used underscore names. Updated them to dot-separated semantic convention names: `http.request.body.size` and `http.response.body.size`.
- The error type was stored as a custom `dependency.error_type` attribute. Updated it to the standard `error.type` attribute while leaving the custom dependency error flag intact.
- The Collector snippet used the deprecated `spanmetrics` component name and referenced undeclared `otlp` receiver and `otlp/tempo` exporter components. Updated it to `span_metrics` and added minimal valid receiver/exporter definitions.
- The span metrics queries used metric names that did not match the current Span Metrics Connector output when exported to Prometheus. Added a `dependency` namespace in the connector config and updated PromQL, dashboard queries, and alert rules to use `dependency_duration_milliseconds_*`.
- The status code label in PromQL used the old sanitized label `http_status_code`. Updated it to `http_response_status_code`, matching the updated span attribute.
- The "percentage of total request time" query needed explicit many-to-one PromQL vector matching. Added `ignoring(dependency_name) group_left`.
- The final dependency latency ratio query referenced raw span attributes as if they were Prometheus metrics. Replaced it with a ratio based on histogram sum/count rates.

## Review Notes
- The JavaScript snippets were checked with `node --check`.
- The dashboard JSON block was parsed successfully with Python's `json` module.
- `otelcol`, `otelcol-contrib`, and `promtool` were not installed in the local environment, so Collector and Prometheus rule validation was performed against official documentation rather than local CLI validation.
