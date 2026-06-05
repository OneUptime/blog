# Validation Summary: How to Trace Student Assignment Submission and Auto-Grading Pipeline Performance

## Status
validated

## Post Type
Technical tutorial

## Technologies Covered
- OpenTelemetry Python tracing API
- OpenTelemetry Python context propagation
- OpenTelemetry Python metrics API
- Asynchronous queue-based processing
- Auto-grading and sandboxed code execution pipelines

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace span API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.span.html
- OpenTelemetry Python propagation API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/propagate.html
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python metrics SDK documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.html
- OpenTelemetry metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/

## Issues Found
- The grading worker snippet used `SpanKind` and `StatusCode` but did not import them in that code block. Added `from opentelemetry.trace import SpanKind, StatusCode` and removed the unused `context` import so the snippet is self-contained and accurate.
- The metrics snippet used `metrics.get_meter(...)` without importing `metrics`. Added `from opentelemetry import metrics`.
- The queue depth `ObservableGauge` was created without a callback, so it would not actually observe queue depth. Added a callback using `CallbackOptions` and `Observation`, and registered it with `callbacks=[observe_queue_depth]`, matching the OpenTelemetry Python metrics API.

## Review Notes
The tracing, propagation, span status, event, histogram, and observable gauge APIs used in the post are current OpenTelemetry Python APIs. The snippets are illustrative and still rely on application-specific functions such as `get_assignment`, `queue.publish`, `compile_code`, and `get_queue_depth`. In a production EdTech system, raw student identifiers should be reviewed for privacy and cardinality impact before being attached to telemetry.
