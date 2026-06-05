# Validation Summary: How to Manually Set Span Context for Cross-Service Tracing in Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- OpenTelemetry Python API and SDK
- OpenTelemetry span context propagation
- W3C Trace Context
- SQLite
- JSON message serialization

## Sources Consulted
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python context API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/context.html
- OpenTelemetry tracing API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/

## Issues Found
- `SpanContext.is_valid` was used as a method in several examples. OpenTelemetry Python exposes it as a boolean property, so calls such as `parent_context.is_valid()` would raise `TypeError`. Changed those uses to `parent_context.is_valid`.
- `TraceState` serialization used `str(span_ctx.trace_state)`, which produces OpenTelemetry Python's debug representation rather than a W3C `tracestate` header value. Changed serialization to `span_ctx.trace_state.to_header()` and deserialization to `TraceState.from_header([trace_state_str])`.
- The trace flags comment described the field as only containing the sampling decision. Updated it to describe trace flags as trace options while keeping the sampled bit explanation.

## Review Notes
- Verified all Python code blocks parse successfully.
- Executed the combined Python examples against current `opentelemetry-api` and `opentelemetry-sdk` packages installed into a temporary target directory. The examples ran successfully after the fixes.
- For asynchronous messaging systems, span links may sometimes be more semantically appropriate than parent-child relationships, especially for batch or fan-out/fan-in workflows. The parent-context examples remain technically valid for the scenarios shown.
