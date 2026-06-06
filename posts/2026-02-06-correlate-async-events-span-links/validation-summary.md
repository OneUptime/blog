# Validation Summary: How to Correlate Asynchronous Event-Driven Flows Across Multiple Services

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Python API
- Span links
- W3C Trace Context propagation
- Event-driven architecture

## Sources Consulted
- OpenTelemetry Specification: Overview, span links: https://opentelemetry.io/docs/specs/otel/overview/
- OpenTelemetry Specification: Trace API, SpanContext and SpanKind: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Python API documentation, Tracer.start_as_current_span and links: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/

## Issues Found
- The propagation example imported `TraceContextTextMapPropagator` from `opentelemetry.trace.propagation`, but the current documented Python import path is `opentelemetry.trace.propagation.tracecontext`. Updated the import so the example uses the official API path.

## Review Notes
- The explanations of span links are consistent with the OpenTelemetry specification: links reference causally related spans by `SpanContext`, can cross traces, and are appropriate for batch, fan-in, and asynchronous processing scenarios where a single parent is not semantically correct.
- The code snippets use placeholder application functions such as `do_processing`, `ship_order`, and `route_event`; these are acceptable for illustrative examples.
