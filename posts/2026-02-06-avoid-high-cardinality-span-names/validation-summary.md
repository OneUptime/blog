# Validation Summary: How to Avoid the Anti-Pattern of Putting High-Cardinality Values in Span Names

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry traces and spans
- OpenTelemetry span names and attributes
- OpenTelemetry Python API
- OpenTelemetry JavaScript API
- OpenTelemetry HTTP and Express instrumentation
- SQL-style trace backend queries

## Sources Consulted
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry HTTP span semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry Python manual instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry JavaScript API tracing docs: https://github.com/open-telemetry/opentelemetry-js-api/blob/main/docs/tracing.md
- OpenTelemetry JavaScript Express instrumentation README: https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/packages/instrumentation-express
- OpenTelemetry common attribute and limit concepts: https://opentelemetry.io/docs/specs/otel/common/

## Issues Found
- The first Python example used `trace.get_tracer` without importing `trace`. Added `from opentelemetry import trace` so the snippet matches the official Python API usage.
- The "good" JavaScript examples declared `const span` multiple times in one code block, which is a syntax error if copied as a single snippet. Renamed the variables to `routeSpan`, `jobSpan`, and `searchSpan`.
- The Express snippet only imported `ExpressInstrumentation`. The official Express instrumentation README says it relies on HTTP calls also being instrumented, so the snippet now registers both `HttpInstrumentation` and `ExpressInstrumentation`.
- Backend impact statements were too absolute. Reworded claims about indexing, aggregation, and storage costs to account for differences between tracing backend implementations.
- The SQL interval example used `INTERVAL 1 HOUR`, which is not portable SQL syntax. Changed it to `INTERVAL '1 hour'`, which is the common PostgreSQL-style form for this illustrative query.

## Review Notes
The core guidance is consistent with the OpenTelemetry Trace API specification: span names should identify a general class of spans, while per-instance values such as user IDs belong in attributes when they are safe and useful to record. High-cardinality attributes can still affect backend indexing, privacy, and cost depending on the backend configuration, so teams should avoid indexing sensitive or unbounded attributes unnecessarily.
