# Validation Summary: How to Build a Custom SpanProcessor That Adds Request-Scoped Attributes at Span

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry SDK
- OpenTelemetry Python tracing
- Python `contextvars`
- Flask request middleware
- OpenTelemetry Java tracing
- OTLP trace exporter

## Sources Consulted
- OpenTelemetry Trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry Python SDK trace source documentation: https://opentelemetry-python.readthedocs.io/en/stable/_modules/opentelemetry/sdk/trace.html
- OpenTelemetry Python Flask instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/flask/flask.html
- OpenTelemetry Python in-memory span exporter source: https://raw.githubusercontent.com/open-telemetry/opentelemetry-python/main/opentelemetry-sdk/src/opentelemetry/sdk/trace/export/in_memory_span_exporter.py
- OpenTelemetry Java SDK documentation: https://opentelemetry.io/docs/languages/java/sdk/
- OpenTelemetry Java SpanProcessor source: https://raw.githubusercontent.com/open-telemetry/opentelemetry-java/main/sdk/trace/src/main/java/io/opentelemetry/sdk/trace/SpanProcessor.java

## Issues Found
- The post claimed the custom Python SpanProcessor added attributes at end time, but its `on_end` implementation was a no-op and the test manually set attributes inside the span body. Updated the processor to apply request attributes in `_on_ending`, which the Python SDK invokes during `span.end()` before `on_end` receives a `ReadableSpan`.
- The introductory wording implied `on_end` could be used for end-time mutation. Clarified that `on_end` receives a readable span and that attributes must be applied before that callback runs.
- The Python attribute store imported `threading` without using it and typed a `ContextVar` with a `None` default as `Dict[str, Any]`. Removed the unused import and changed the type to `Optional[Dict[str, Any]]`.
- The Flask middleware example imported unused `g` and `context`. Removed those imports.
- The Java section was titled "End-Time Attribute Injection" even though Java's current `SpanProcessor` interface exposes writable spans in `onStart` and readable spans in `onEnd`. Renamed the section and text to describe start-time enrichment accurately.
- The Java snippet was missing imports for `HashMap` and `Map`. Added the imports and added handling for common attribute value types beyond `String` and `Long`.
- The Python test used the stale `opentelemetry.sdk.trace.export.in_memory` import path for `InMemorySpanExporter`. Updated it to `opentelemetry.sdk.trace.export.in_memory_span_exporter`.
- The test manually applied request attributes before the span ended, so it did not validate the processor behavior. Removed the manual attribute loop so the assertions verify the processor's pre-end hook.

## Review Notes
- OpenTelemetry's language implementations differ: the OpenTelemetry specification describes `OnEnding` as a development-status hook, Python currently exposes it as `_on_ending`, and the current Java `SpanProcessor` source does not expose an equivalent hook. Middleware or framework response hooks remain the more portable way to add response-scoped attributes before a server span ends.
