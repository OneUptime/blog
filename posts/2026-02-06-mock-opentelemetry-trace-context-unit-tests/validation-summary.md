# Validation Summary: How to Mock OpenTelemetry Trace Context in Unit Tests

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry JavaScript API and SDK
- OpenTelemetry Python API and SDK
- Jest unit testing
- Python unittest
- W3C Trace Context propagation
- In-memory span exporting

## Sources Consulted
- OpenTelemetry JavaScript Context documentation: https://opentelemetry.io/docs/languages/js/context/
- OpenTelemetry JS NodeTracerProvider API: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-trace-node.NodeTracerProvider.html
- OpenTelemetry JS ReadableSpan API: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_sdk-trace-base.ReadableSpan.html
- OpenTelemetry JS Span API: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api._opentelemetry_api.Span.html
- OpenTelemetry Python trace API: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry Python propagate API: https://opentelemetry-python.readthedocs.io/en/latest/api/propagate.html
- OpenTelemetry Python InMemorySpanExporter source: https://github.com/open-telemetry/opentelemetry-python/blob/main/opentelemetry-sdk/src/opentelemetry/sdk/trace/export/in_memory_span_exporter.py

## Issues Found
- The JavaScript setup used `provider.addSpanProcessor(...)`, but the current OpenTelemetry JS SDK documents span processors through the `NodeTracerProvider` / `BasicTracerProvider` configuration object. Changed the example to pass `spanProcessors: [new SimpleSpanProcessor(exporter)]` when constructing the provider.
- The JavaScript reset helper called `context.disable()`, which disables and removes the global context manager. That would break later `context.with()` and async propagation examples unless the provider/context manager were registered again. Removed that call and kept exporter reset as the test-state cleanup.
- The JavaScript finished span assertions used `parentSpanId`, but current `ReadableSpan` exposes the parent through `parentSpanContext`. Updated assertions to use `parentSpanContext?.spanId`.
- The JavaScript tracer mock used invalid trace/span ID lengths for a `SpanContext`. Replaced them with valid W3C-format hex IDs.
- The JavaScript mock example referenced `NotificationService` without importing it. Added an import matching the style of the earlier `OrderService` example.
- The Python test setup repeatedly called `trace.set_tracer_provider(...)` in `setUp`. OpenTelemetry Python documents that the global tracer provider can only be set once, so repeated per-test setup is misleading. Updated the examples to use a per-test `TracerProvider` directly via `self.provider.get_tracer(...)`.
- The Python examples were missing imports needed to run as shown. Added `unittest` to the propagation example and an illustrative import for `process_payment`.
- The Python cleanup shut down only the exporter. Updated cleanup to shut down the per-test provider so processors and exporters are cleaned up together.
- The Python examples imported `InMemorySpanExporter` from a module path that is not present in the current OpenTelemetry Python SDK source. Updated the imports to `opentelemetry.sdk.trace.export.in_memory_span_exporter`.
- The best-practices cleanup paragraph recommended resetting active context directly. Reworded it to match the corrected JavaScript and Python examples.

## Review Notes
The examples still assume application functions such as `OrderService.processOrder`, `NotificationService.sendEmail`, `process_payment`, and `asyncDatabaseQuery` create and end spans as described. Those functions are intentionally outside the post, so the review focused on the OpenTelemetry-specific test code and claims.
