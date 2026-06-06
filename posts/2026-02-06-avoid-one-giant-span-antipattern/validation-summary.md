# Validation Summary: How to Avoid the Anti-Pattern of Creating One Giant Span Instead of Breaking

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry Python API
- OpenTelemetry JavaScript API
- Span design and parent-child relationships
- Span attributes, status, and exception recording

## Sources Consulted
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript Tracer API reference: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api._opentelemetry_api.Tracer.html
- OpenTelemetry JavaScript Span API reference: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api._opentelemetry_api.Span.html
- OpenTelemetry JavaScript SpanStatusCode API reference: https://open-telemetry.github.io/opentelemetry-js/enums/_opentelemetry_api._opentelemetry_api.SpanStatusCode.html
- OpenTelemetry semantic conventions for recording errors: https://opentelemetry.io/docs/specs/semconv/general/recording-errors/

## Issues Found
- The JavaScript example used `opentelemetry.trace.getTracer` and `SpanStatusCode.ERROR` without showing the required `@opentelemetry/api` import. Added `const opentelemetry = require('@opentelemetry/api');` and destructured `SpanStatusCode` so the snippet is runnable as shown.
- The text said "context propagation automatically creates parent-child relationships" for local nested spans. Changed this to "active OpenTelemetry context" to match the OpenTelemetry API model more precisely; propagation usually refers to carrying context across process boundaries.

## Review Notes
The span granularity guidance is reasonable as practical advice, but the "5 to 15 spans per trace" recommendation is a rule of thumb rather than a formal OpenTelemetry limit. Exact span counts should be adjusted based on request complexity, storage costs, sampling, and backend query/UI behavior.
