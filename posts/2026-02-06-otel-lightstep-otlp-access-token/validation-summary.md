# Validation Summary: How to Send OpenTelemetry Data to Lightstep via OTLP with Access Token Headers

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Protocol (OTLP)
- Lightstep / ServiceNow Cloud Observability
- Go OpenTelemetry SDK and OTLP gRPC exporters
- Python OpenTelemetry SDK and OTLP gRPC exporters
- Node.js OpenTelemetry SDK and OTLP gRPC exporter
- OTLP exporter environment variables

## Sources Consulted
- Lightstep / ServiceNow Cloud Observability: Already using OpenTelemetry and the Collector? https://docs.lightstep.com/docs/already-using-collectors
- Lightstep / ServiceNow Cloud Observability: End of Life notice for Cloud Observability https://docs.lightstep.com/changelog/eol-notice
- Lightstep / ServiceNow Cloud Observability: Send telemetry data via OTLP/HTTP https://docs.lightstep.com/docs/send-otlp-over-http-to-lightstep
- Lightstep / ServiceNow Cloud Observability: Ingest metrics using the OpenTelemetry SDK https://docs.lightstep.com/docs/ingest-metrics-otel-sdk
- OpenTelemetry: OTLP Exporter Configuration https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/
- OpenTelemetry Specification: OpenTelemetry Protocol Exporter https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Go exporters documentation https://opentelemetry.io/docs/languages/go/exporters/
- Go package documentation: go.opentelemetry.io/otel/semconv/v1.24.0 https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.24.0
- OpenTelemetry Python OTLP exporter API documentation https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html
- OpenTelemetry JavaScript exporters documentation https://opentelemetry.io/docs/languages/js/exporters/
- npm package API/type definitions for @opentelemetry/resources, @opentelemetry/sdk-trace-node, @opentelemetry/sdk-trace-base, and @opentelemetry/exporter-trace-otlp-grpc

## Issues Found
- The HTTP endpoint description omitted the URL scheme and only listed the traces path. Updated it to the Lightstep-documented signal-specific HTTP endpoints for traces and metrics.
- The Go example imported `log` but did not use it, which would cause a Go compile error. Removed the unused import.
- The Node.js example used the removed/stale `new Resource(...)` and `provider.addSpanProcessor(...)` APIs with current OpenTelemetry JS 2.x packages. Updated it to use `resourceFromAttributes(...)` and the `spanProcessors` constructor option.
- The Node.js gRPC exporter URL used a `grpc://` scheme. Updated it to an OTLP-compatible `https://ingest.lightstep.com:443` endpoint while keeping TLS credentials and metadata configuration.
- The post implied Lightstep / Cloud Observability was a general migration target. Official documentation includes an end-of-life notice tied to March 1, 2026 or the customer's contract term end, so the wording now scopes the guidance to active Lightstep or Cloud Observability projects.

## Review Notes
- The corrected Node.js snippet was checked locally with current OpenTelemetry JS packages and loaded successfully.
- Go was not installed in the review environment, so the Go example was verified against official OpenTelemetry Go and pkg.go.dev documentation rather than compiled locally.
- The article uses `deployment.environment`, which is still commonly accepted but has evolved in newer semantic convention versions. A future refresh could consider newer semantic convention names if the article updates its semconv version.
