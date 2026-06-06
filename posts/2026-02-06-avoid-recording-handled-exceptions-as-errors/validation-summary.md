# Validation Summary: How to Avoid the Anti-Pattern of Recording Every Exception as a Span Error

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry Python API
- OpenTelemetry JavaScript API
- Span status and span events
- Exception recording and error handling

## Sources Consulted
- OpenTelemetry specification: Exceptions: https://opentelemetry.io/docs/specs/otel/trace/exceptions/
- OpenTelemetry semantic conventions: Recording errors: https://opentelemetry.io/docs/specs/semconv/general/recording-errors/
- OpenTelemetry Python manual instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API reference: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry JavaScript Span API reference: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api._opentelemetry_api.Span.html
- OpenTelemetry JavaScript Tracer API reference: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api._opentelemetry_api.Tracer.html

## Issues Found
- The JavaScript example caught every cache exception and treated it as an expected cache miss. This contradicted the surrounding guidance that unexpected failures should be marked as span errors. I added an `instanceof CacheMissError` check and rethrow for non-cache-miss errors so unexpected cache failures flow to the outer error handler.

## Review Notes
- The main guidance is consistent with OpenTelemetry documentation: span status should be set to `ERROR` when the operation fails, and OpenTelemetry does not recommend recording handled exceptions as errors. The post's alert metric names are illustrative rather than standard OpenTelemetry metric names, so production examples should map them to the metric names emitted by the user's tracing backend.
