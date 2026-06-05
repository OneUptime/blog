# Validation Summary: How to Understand OpenTelemetry Signal Correlation

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry traces, logs, metrics, exemplars, resources, and context propagation
- W3C Trace Context
- OpenTelemetry Go, Python, JavaScript, Java, and Ruby APIs
- OpenTelemetry Collector OTLP receiver, OTLP HTTP exporter, batch processor, resource detection processor, and Kubernetes attributes processor
- OpenTelemetry semantic conventions for HTTP metrics and resource attributes

## Sources Consulted
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry Metrics Data Model exemplars: https://opentelemetry.io/docs/reference/specification/metrics/data-model/
- OpenTelemetry Logs Data Model: https://opentelemetry.io/docs/specs/otel/logs/data-model/
- OpenTelemetry Logging specification: https://opentelemetry.io/docs/reference/specification/logs/
- OpenTelemetry Python instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python logging instrumentation docs: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/logging/logging.html
- OpenTelemetry JavaScript instrumentation docs: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry HTTP metric semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry OTLP specification and exporter configuration: https://opentelemetry.io/docs/specs/otlp/ and https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector processors list: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector attributes processor docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Kubernetes attributes processor docs: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry Ruby SpanContext API docs: https://open-telemetry.github.io/opentelemetry-ruby/opentelemetry-api/v1.6.0/OpenTelemetry/Trace/SpanContext.html

## Issues Found
- The Python logging example used `StatusCode.ERROR` without importing it and called `span.set_status` with the wrong object shape for current OpenTelemetry Python examples. Added `Status` and `StatusCode` imports and changed the call to `span.set_status(Status(StatusCode.ERROR, str(e)))`.
- The Python logging explanation described injected `trace_id`, `span_id`, and `trace_flags` fields. Current Python logging instrumentation injects `otelTraceID`, `otelSpanID`, `otelServiceName`, and `otelTraceSampled` into Python log records, while OpenTelemetry log records carry `TraceId`, `SpanId`, and `TraceFlags`. Updated the text and instrumentation call accordingly.
- The JavaScript metric example created a span with `startSpan` but recorded metrics using `context.active()`, so the recording context would not necessarily contain that span for exemplar correlation. Changed the example to use `startActiveSpan`.
- The JavaScript HTTP metric example used older HTTP semantic convention names and milliseconds. Updated it to `http.server.request.duration`, unit `s`, and current attributes such as `http.request.method` and `http.response.status_code`.
- The Ruby logging example manually unpacked binary IDs. Updated it to use the current `hex_trace_id` and `hex_span_id` helpers.
- The Collector configuration tried to create log `trace_id` and `span_id` attributes with the attributes processor using `from_context: trace_id` and `from_context: span_id`. The attributes processor context lookup is for receiver metadata, authentication info, and client address, while OpenTelemetry logs already carry trace context as top-level log record fields. Removed those actions.
- The Collector OTLP HTTP exporter endpoint was set to `/v1/traces` while used by traces, logs, and metrics pipelines. Changed it to a base endpoint so OTLP HTTP can use the signal-specific paths.
- The Collector snippet claimed resource detection added cloud/k8s attributes while relying on pod and namespace correlation. Added the Kubernetes attributes processor to the pipelines for Kubernetes resource enrichment.
- The Go example assigned trace and span IDs without using them, which would produce unused variable errors in Go if copied into a compilable function. Added blank identifier assignments to keep the snippet syntactically valid while preserving the author’s example.

## Review Notes
The article is technically relevant and accurate after the fixes. The examples remain illustrative rather than complete standalone programs; readers still need normal application setup such as SDK providers, exporters, imports, and application-specific variables.
