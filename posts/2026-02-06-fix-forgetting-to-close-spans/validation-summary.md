# Validation Summary: How to Fix the Common Mistake of Forgetting to Close Spans and Leaking Memory

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry Python API
- OpenTelemetry JavaScript API and SDK span processors
- OpenTelemetry Java API
- Python
- JavaScript
- Java

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry Java API documentation: https://opentelemetry.io/docs/languages/java/api/
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry JavaScript SpanProcessor API documentation: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_sdk-trace-node.SpanProcessor.html

## Issues Found
- The post overstated that every unended span object necessarily lives forever in heap memory. The OpenTelemetry specification says implementations may leak memory or other resources when spans are not ended, but whether the object is retained depends on active context or other references. Updated the wording to distinguish missing telemetry from memory leaks caused by retained spans.
- The post said the batch processor would show queue-capacity warnings as a symptom of unclosed spans. The OpenTelemetry SDK specification defines batch processors as batching finished spans, so unended spans do not enter that queue. Replaced this with a started-but-not-ended span count.
- The JavaScript diagnostic snippet read the private `_finishedSpans` field from a span processor and described it as a way to detect unclosed spans. That field is not public API, and finished-span backlog indicates export pressure rather than unended spans. Replaced it with a temporary diagnostic span processor that tracks `onStart` and `onEnd`.
- The JavaScript snippets used `SpanStatusCode` without showing where it comes from. Added `@opentelemetry/api` imports so the examples use the current public API symbol.
- The Java example caught and rethrew `Exception` without declaring it in the method signature. Added `throws Exception` so the snippet is syntactically valid Java.

## Review Notes
The core lifecycle guidance is correct: Python context managers end spans on block exit, JavaScript `try/finally` should call `span.end()`, JavaScript `startActiveSpan` makes the span active but still requires `span.end()`, and Java `Scope` should be closed separately from ending the span.
