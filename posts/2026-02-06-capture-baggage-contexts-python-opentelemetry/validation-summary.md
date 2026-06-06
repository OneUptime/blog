# Validation Summary: How to Capture Baggage at Different Contexts in Python OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python API and SDK
- OpenTelemetry baggage
- OpenTelemetry context propagation
- W3C Trace Context and W3C Baggage propagation
- Python asyncio and context variables
- HTTP and message queue context propagation patterns

## Sources Consulted
- OpenTelemetry Python baggage API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/baggage.html
- OpenTelemetry Python baggage propagation documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/baggage.propagation.html
- OpenTelemetry Python context API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/context.html
- OpenTelemetry Python propagation guide: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry baggage concept documentation: https://opentelemetry.io/docs/concepts/signals/baggage/
- OpenTelemetry baggage API specification: https://opentelemetry.io/docs/specs/otel/baggage/api/
- OpenTelemetry propagators API specification: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- W3C Baggage specification: https://www.w3.org/TR/baggage/
- Python contextvars documentation: https://docs.python.org/3/library/contextvars.html

## Issues Found
- The post incorrectly implied baggage is automatically included in spans or span context. OpenTelemetry baggage is propagated alongside context and is not associated with span attributes unless explicitly added. Updated the basic example comments and the performance section wording to reflect this.
- The HTTP example configured `B3MultiFormat`, which is not needed to demonstrate W3C baggage propagation and requires an optional B3 propagator package. Removed the B3 import and propagator from the example so the baggage flow uses the standard `TraceContextTextMapPropagator` and `W3CBaggagePropagator`.
- The introduction and diagram implied thread pool context propagation works the same as async propagation. Clarified that thread pool usage needs explicit context propagation.
- The message queue section stated that queues break automatic propagation in all cases. Updated it to clarify that this is true without instrumentation, since OpenTelemetry instrumentation can propagate context for supported messaging frameworks.
- Removed unused `Dict` and `baggage_data` code from the message queue snippet.
- Replaced inaccurate byte-count comments in the baggage size example with qualitative descriptions, since the listed counts did not accurately represent propagated header size.

## Review Notes
Validated the Python snippets for syntax and executed the blog's Python code blocks in sequence with current OpenTelemetry packages (`opentelemetry-api`, `opentelemetry-sdk`, and related dependencies at 1.42.1). The examples are still illustrative fragments in later sections and rely on earlier definitions such as `tracer`, `inject`, and `extract`.
