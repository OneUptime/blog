# Validation Summary: How to Establish OpenTelemetry Code Review Guidelines

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry metrics
- OpenTelemetry context propagation
- OpenTelemetry Python API
- OpenTelemetry Go API
- OpenTelemetry Java API
- OpenTelemetry JavaScript/TypeScript metrics API
- ESLint configuration

## Sources Consulted
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry recording errors semantic conventions: https://opentelemetry.io/docs/specs/semconv/general/recording-errors/
- OpenTelemetry exception semantic conventions: https://opentelemetry.io/docs/specs/otel/trace/exceptions/
- OpenTelemetry Context specification: https://opentelemetry.io/docs/specs/otel/context/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry Go instrumentation documentation: https://opentelemetry.io/docs/languages/go/instrumentation/
- OpenTelemetry Java API documentation: https://opentelemetry.io/docs/languages/java/api/
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- Python contextvars documentation: https://docs.python.org/3/library/contextvars.html
- ESLint no-restricted-syntax documentation: https://eslint.org/docs/latest/rules/no-restricted-syntax

## Issues Found
- The Go error-handling example explicitly set `codes.Ok` on the successful path. Current OpenTelemetry error-recording guidance says span status should be left unset when an operation ends without errors, so the success status call was removed.
- The Python context propagation example claimed that `asyncio.create_task` starts in a new context. That is misleading for modern Python, where `contextvars` are natively supported by `asyncio`. The example was changed to a `ThreadPoolExecutor` boundary, where passing and attaching the OpenTelemetry context is a valid manual propagation pattern.
- The Python context propagation example attached context without detaching it. OpenTelemetry context guidance says every attach should have a corresponding detach, so the corrected example stores the token from `context.attach(ctx)` and detaches it in a `finally` block.

## Review Notes
The `<verb>.<noun>` span naming convention and the "more than 100 unique values" cardinality threshold are local team guidelines rather than OpenTelemetry-wide requirements. They are reasonable as review rules, but teams should align them with their own telemetry backend limits and semantic convention registry.
