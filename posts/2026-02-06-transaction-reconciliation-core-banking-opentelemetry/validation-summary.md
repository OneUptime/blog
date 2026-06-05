# Validation Summary: How to Monitor Real-Time Transaction Reconciliation Between Core Banking

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python metrics API
- OpenTelemetry Python tracing API
- OTLP gRPC metric exporter
- Python schedule library
- Transaction reconciliation monitoring

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python metrics API reference: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry Python trace API reference: https://opentelemetry-python.readthedocs.io/en/latest/api/trace.html
- OpenTelemetry metrics concepts: https://opentelemetry.io/docs/concepts/signals/metrics/
- schedule documentation: https://schedule.readthedocs.io/en/stable/

## Issues Found
- The tracing example used `trace.StatusCode.ERROR` directly in `span.set_status(...)`. The current OpenTelemetry Python examples and API reference use `Status(StatusCode.ERROR)`, so the snippet now imports `Status` and `StatusCode` from `opentelemetry.trace` and passes a `Status` object.
- The unreconciled transaction metric was described as a current-count gauge but implemented with an `UpDownCounter` that only incremented on missing transactions. I changed it to `meter.create_gauge(...)` and record the latest batch's unmatched count with `set(...)`, matching the metric's intended non-additive current-value behavior.
- The reconciliation batch code called `min(...)` and `max(...)` on processor transactions without handling an empty batch. I added an early return for empty batches and records zero summary attributes.
- The reconciliation lag calculation used `datetime.utcnow()`, which returns a naive UTC datetime. I changed it to `datetime.now(timezone.utc)` so the example uses timezone-aware UTC time.
- The scheduler example registered the job but did not call `schedule.run_pending()` in a loop, so scheduled work would not execute. I added the loop shown in the official schedule documentation.

## Review Notes
The snippets remain illustrative and depend on application-specific objects such as `ReconciliationResult`, `MatchResult`, `engine`, `tracer`, and `get_pending_batches`. The Python code blocks were checked for syntax after the fixes.
