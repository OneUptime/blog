# Validation Summary: How to Fix 'Trace Correlation' Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- OpenTelemetry JavaScript API and Node SDK
- OpenTelemetry context propagation and propagators
- W3C Trace Context
- B3 and Jaeger propagation headers
- OpenTelemetry database semantic conventions
- OpenTelemetry Collector tail sampling processor
- Grafana Loki derived fields and Tempo trace links
- OTLP HTTP trace exporter
- Node.js, Express-style middleware, axios, winston

## Sources Consulted
- OpenTelemetry JavaScript propagation documentation: https://opentelemetry.io/docs/languages/js/propagation/
- OpenTelemetry JavaScript Node.js getting started documentation: https://opentelemetry.io/docs/languages/js/getting-started/nodejs/
- OpenTelemetry JavaScript sampling documentation: https://opentelemetry.io/docs/languages/js/sampling/
- OpenTelemetry OTLP exporter configuration documentation: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/
- OpenTelemetry database semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-spans/
- OpenTelemetry Collector tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- Grafana Loki data source derived fields documentation: https://grafana.com/docs/grafana/latest/datasources/loki/configure-loki-data-source/
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/

## Issues Found
- The manual `startActiveSpan` example used `SpanStatusCode` without importing it. Added `SpanStatusCode` to the `@opentelemetry/api` import so the snippet is syntactically correct.
- The manual database span example used older database semantic convention attributes (`db.system`, `db.statement`, and `db.operation`). Updated them to current stable attributes: `db.system.name`, `db.query.text`, and `db.operation.name`.
- The database example used a non-standard `db.rows_affected` attribute. Replaced it with `db.response.returned_rows` when returned rows are available.
- The parent-based sampling example used `NeverSampler` without importing it. Added `NeverSampler` to the `@opentelemetry/sdk-trace-base` import.
- The OTLP exporter example used `OTEL_EXPORTER_OTLP_ENDPOINT` directly as the trace exporter URL. Updated it to use `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`, which is the signal-specific endpoint expected to include `/v1/traces` for OTLP/HTTP.
- The async context section stated that `setTimeout` loses context categorically. Current OpenTelemetry Node.js context propagation usually preserves standard async context when configured correctly, so the wording was adjusted to describe custom async boundaries and delayed callbacks where context may be missing.

## Review Notes
The remaining examples are illustrative snippets and assume surrounding application setup, installed OpenTelemetry packages, and configured SDK/exporters. The Grafana derived field example is structurally aligned with Grafana's Loki derived fields documentation, but real deployments must ensure the Tempo data source UID matches the provisioned data source.
