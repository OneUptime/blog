# Validation Summary: How to Chain Custom SpanProcessors for Attribute Enrichment Before

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry SDK
- OpenTelemetry Python
- OpenTelemetry Java
- SpanProcessor
- BatchSpanProcessor
- OTLP gRPC exporter
- Flask middleware

## Sources Consulted
- OpenTelemetry Trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry Python SDK trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/_modules/opentelemetry/sdk/trace.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry Java SDK documentation for SpanProcessor: https://opentelemetry.io/docs/languages/java/sdk/
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/

## Issues Found
- The introduction said attributes were added "at export time", but the shown SpanProcessors add attributes during `on_start`, before export. Changed the wording to "before export."
- The Python examples imported `get_current` and Flask `g` without using them. Removed those unused imports so the snippets stay clean and directly runnable when dependencies are installed.
- The Flask middleware docstring said the context was set before any spans are created. That is too broad because framework or auto-instrumentation spans may already exist before Flask `before_request` handlers run. Changed it to "before route handler spans are created."
- The Java `isStartRequired` comment used the Python-style `on_start` method name. Changed it to the Java method name, `onStart`.

## Review Notes
The central OpenTelemetry behavior is correct: `on_start`/`onStart` receives a writable span, `on_end`/`onEnd` receives a readable ended span, and registered processors are invoked in registration order. The examples intentionally use simplified request context storage; production async Python applications may prefer `contextvars` over thread-local storage depending on the framework runtime.
