# Validation Summary: How to Send OpenTelemetry Traces and Metrics to Last9 via OTLP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry Collector
- OpenTelemetry Python SDK
- OTLP gRPC exporters
- Last9 observability platform
- Collector internal telemetry metrics

## Sources Consulted
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry OTLP exporter configuration specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python OTLP exporter API documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- Last9 product documentation and public product pages for OTLP/OpenTelemetry support, LogMetrics, and TraceMetrics: https://last9.io/
- ToolJet Last9 OpenTelemetry integration documentation: https://docs.tooljet.com/docs/tj-setup/observability/last9/

## Issues Found
- The Collector configuration used `Authorization: "Basic ${LAST9_AUTH_TOKEN}"`, which can be ambiguous because Last9 integrations commonly provide a complete auth header. Changed it to `Authorization: "${env:LAST9_OTLP_AUTH_HEADER}"` so the value can be copied from Last9 as the full authorization header and so the Collector uses the documented environment-variable substitution form.
- The Python example used `your-org-id:your-api-key` as the Basic Auth input. Updated the placeholder to `your-last9-username:your-last9-password`, matching the username/password style documented by Last9 integrations and OTLP Basic Auth examples.
- The TraceMetrics section listed concrete metric names such as `trace.duration`, `trace.error.rate`, and `trace.throughput` without a verifiable Last9 source for those exact names. Changed them to describe the generated metric categories instead of asserting exact metric identifiers.

## Review Notes
The OpenTelemetry Collector receiver/exporter structure, batch and resource processors, Python `TracerProvider`, `BatchSpanProcessor`, `MeterProvider`, `PeriodicExportingMetricReader`, counter usage, OTLP exporter headers, and Collector self-telemetry metric names are consistent with current OpenTelemetry documentation. The example function still assumes `do_payment_logic` exists in the application, which is acceptable for a focused instrumentation snippet but would need a real implementation in a runnable sample.
