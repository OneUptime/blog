# Validation Summary: How to Implement Span Links in OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry span links
- JavaScript / Node.js OpenTelemetry API
- Python OpenTelemetry API
- Go OpenTelemetry API
- Java OpenTelemetry API
- Distributed tracing, context propagation, async processing, batch processing, and message queues

## Sources Consulted
- OpenTelemetry specification: Tracing API - https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry specification overview: Links between spans - https://opentelemetry.io/docs/specs/otel/overview/
- OpenTelemetry JavaScript instrumentation docs: span links, status, exceptions - https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript propagation docs: manual context inject/extract - https://opentelemetry.io/docs/languages/js/propagation/
- OpenTelemetry Python instrumentation docs: adding links - https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Go trace package docs - https://pkg.go.dev/go.opentelemetry.io/otel/trace
- OpenTelemetry Java API docs: SpanBuilder, addLink, context, span lifecycle - https://opentelemetry.io/docs/languages/java/api/

## Issues Found
- The JavaScript basic example used numeric status code `2` directly. Changed it to import and use `SpanStatusCode.ERROR`, which matches the documented public API and avoids relying on enum internals.
- The Java example used `LinkData`, which is SDK data rather than the public API shown by the imports. Reworked the example to add links directly with `SpanBuilder.addLink(SpanContext, Attributes)`, matching the documented Java API.
- The JavaScript message queue example called `context.active()` without importing `context`. Added `context` to the import.
- The JavaScript message queue example only filtered truthy contexts. Updated it to also use `trace.isSpanContextValid(...)` so invalid extracted contexts are excluded before creating links.
- The message header preservation snippet used `context`, `propagation`, and `trace` without showing the required import. Added the OpenTelemetry API import.
- The conceptual bullet labeled links as "Multi-directional", which could imply symmetric links. Changed the label to "Many-to-many" while preserving the intended explanation that a span can link to multiple other spans.

## Review Notes
- The article is technically relevant and implementation-focused.
- The OpenTelemetry specification recommends adding links at span creation when the linked context is already available, because head sampling can only use information present during span creation. The post's examples generally follow that pattern.
- Some JavaScript examples are illustrative and omit broader application setup such as SDK initialization, context manager setup, propagator configuration, and definitions for helper functions and domain types. That is acceptable for a focused span-links tutorial.
