# Validation Summary: How to Debug Span Links Not Appearing in Trace Views

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry span links
- OpenTelemetry Python SDK and OTLP exporter
- OpenTelemetry Go SDK
- OpenTelemetry Collector
- OTLP trace export

## Sources Consulted
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Trace SDK specification, span limits: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry SDK environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry Python Span API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.span.html
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html
- OpenTelemetry Python SDK trace and SpanLimits documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.html
- OpenTelemetry Go trace package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/trace
- OpenTelemetry Go SDK trace package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/trace
- OpenTelemetry Collector troubleshooting documentation: https://opentelemetry.io/docs/collector/troubleshooting/

## Issues Found
- The post stated that links cannot be added after span creation and that Python spans do not provide `add_link`. Current OpenTelemetry Python provides `Span.add_link`, and the OpenTelemetry API supports adding links to active spans. Updated the section to explain the accurate caveat: adding links at span creation is preferred because head samplers can only consider data available at span start.
- The Python end-to-end verification example imported and used `BatchSpanExporter`, which is not the current SDK span processor class. Changed it to `BatchSpanProcessor`, matching the official Python OTLP exporter setup.
- The first Go example used `attribute.KeyValue` and `attribute.String` without importing the `attribute` package. Added the missing import.
- The Go span limits example used deprecated `trace.WithSpanLimits` and left the tracer provider assigned to an unused local variable. Updated it to `trace.NewSpanLimits()` with `trace.WithRawSpanLimits(...)` and registered the provider with `otel.SetTracerProvider(tp)`.
- The Collector processor section said to add a debug exporter at both the beginning and end of one processor chain, but exporters receive data after processors in a pipeline. Updated the text to inspect post-processor data with the debug exporter and compare by temporarily removing processors or using separate test pipelines.
- The invalid span context and span limit sections made overly absolute claims about silent dropping. Adjusted the wording to reflect that SDKs may ignore invalid links when attributes and TraceState are empty, and that limit behavior can drop additional data or discard older links depending on the SDK.

## Review Notes
The remaining examples are illustrative and still rely on application-specific placeholders such as `get_source_span_contexts`, `batch`, `Message`, `extractSpanContext`, `processMessage`, `message_queue`, and `process`. Those placeholders are acceptable for a troubleshooting guide, but they are not standalone runnable programs.
