# Validation Summary: How to Choose Between Sync and Async Metric Instruments for Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry metrics
- OpenTelemetry Python API
- Synchronous metric instruments
- Asynchronous/observable metric instruments
- Python instrumentation examples

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API reference: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry Metrics supplementary guidelines: https://opentelemetry.io/docs/specs/otel/metrics/supplementary-guidelines/
- OpenTelemetry Metrics SDK specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk/

## Issues Found
- The asynchronous Python examples used `options.observe(...)`, but current OpenTelemetry Python callbacks should return or yield `Observation` objects. Updated all observable gauge and observable counter examples to import `Observation` and return observations.
- The synchronous Python example used `time.monotonic()` without importing `time`. Added the missing import.
- The synchronous gauge example used `gauge.set(...)`, but the OpenTelemetry Metrics API specifies the synchronous Gauge operation as `record`. Updated it to `gauge.record(...)`.
- The post stated async instruments have "No aggregation overhead." Changed this to "Lower aggregation overhead" because the SDK still processes observations and may aggregate depending on readers/views and attributes.
- The post said the async pool example makes "exactly one call per collection interval." Clarified that this is one callback invocation per collection interval for each metric reader.
- The background-thread cache example used `time.sleep(...)` without importing `time` and used the old callback observation style. Added the import and updated it to return `Observation` objects.
- The observable counter example said "the SDK computes the delta." Revised the comment to say the callback reads the current absolute total, avoiding over-specifying export temporality behavior.

## Review Notes
The main decision framework is consistent with OpenTelemetry's guidance: use synchronous instruments for event-driven measurements and asynchronous instruments for periodically observed state. Some example metric names resemble semantic convention names, but the post is teaching instrument selection rather than providing a semantic convention reference.
