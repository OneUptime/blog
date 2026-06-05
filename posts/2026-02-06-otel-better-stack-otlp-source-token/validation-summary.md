# Validation Summary: How to Send OpenTelemetry Logs and Metrics to Better Stack via Their

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Better Stack Telemetry
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry Collector
- OpenTelemetry Python SDK and OTLP HTTP exporters
- OpenTelemetry Go SDK and OTLP HTTP exporters
- OpenTelemetry JavaScript SDK and OTLP HTTP trace exporter

## Sources Consulted
- Better Stack OpenTelemetry documentation: https://betterstack.com/docs/logs/open-telemetry/
- Better Stack ingesting traces documentation: https://betterstack.com/docs/logs/ingesting-data/http/traces/
- OpenTelemetry OTLP exporter configuration specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry OTLP exporter configuration docs: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- OpenTelemetry Python OTLP exporter API docs: https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html
- OpenTelemetry Go OTLP trace HTTP exporter docs: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp
- OpenTelemetry Go semantic conventions v1.24.0 docs: https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.24.0
- OpenTelemetry JavaScript SDK 2.0 announcement and migration notes: https://opentelemetry.io/blog/2025/otel-js-sdk-2-0/
- OpenTelemetry JavaScript Resource API docs: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_resources.Resource.html

## Issues Found
- The post used `https://in-otel.logs.betterstack.com` as a fixed Better Stack OTLP endpoint. Better Stack's current docs use the source-specific ingesting host from the dashboard. Updated the endpoint text and examples to use `https://your-ingesting-host`, and updated the setup step to tell readers to copy both the source token and ingesting host.
- The Node.js example used `new Resource(...)`, but the current OpenTelemetry JavaScript resources package exposes resources through helper functions such as `resourceFromAttributes`; `Resource` is an interface, not a constructor. Updated the snippet to import and call `resourceFromAttributes(...)`.
- The Node.js example used `provider.addSpanProcessor(...)`, which is removed in the current stable OpenTelemetry JavaScript SDK 2.x API. Updated the snippet to pass `spanProcessors` in the `NodeTracerProvider` constructor.
- The Node.js example imported `OTLPLogExporter` but did not use it. Removed the unused import.

## Review Notes
The Python, Go, Collector, and environment variable examples match the documented OTLP HTTP paths, bearer token header format, and exporter configuration model. Better Stack's docs recommend gzip compression for direct OTLP HTTP exporter setup, but the reviewed snippets are still structurally valid without adding compression.
