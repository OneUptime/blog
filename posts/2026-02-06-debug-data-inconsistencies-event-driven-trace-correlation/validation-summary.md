# Validation Summary: How to Debug Data Inconsistencies in Event-Driven Systems Using OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry Python API
- OpenTelemetry context propagation
- Event-driven architecture
- Message queues and event consumers
- Trace correlation and reconciliation checks

## Sources Consulted
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry Python `opentelemetry.propagate` API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/propagate.html
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry tracing API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry messaging span semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/

## Issues Found
- The publisher example formatted `correlation_id` with `format(correlation_id, '032x')` even when a caller reused the string value returned by a previous publish call. That would raise a `ValueError` or `TypeError` because `:032x` is an integer formatter. Updated the example to normalize `correlation_id` once: generate a 32-character hex string from the trace ID when absent, format integer IDs if supplied, and preserve supplied string IDs as strings.
- Removed an unused `context` import from the first Python snippet.
- The summary said trace context was propagated through queue headers, while the sample stores the injected carrier in the event envelope metadata. Updated the wording to "message metadata or queue headers" so it matches the sample and the OpenTelemetry text-map propagation model.

## Review Notes
- The code uses current OpenTelemetry Python APIs for `trace.get_tracer`, `tracer.start_as_current_span`, `SpanKind.PRODUCER`, `SpanKind.CONSUMER`, `inject`, `extract`, `set_attribute`, and `record_exception`.
- OpenTelemetry messaging semantic conventions recommend span links as the default producer-consumer correlation mechanism for many messaging scenarios, especially batching or ambient contexts. The post's direct parent-child continuation is acceptable for the single-message flow shown, but a future expansion could mention links for batch consumers or consumers already running inside another active span.
- The reconciliation examples assume trace data has already been exported and loaded into the shown dictionary shape. That is reasonable for illustrative code, but production implementations should account for the specific backend's trace query/export format.
