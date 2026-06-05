# Validation Summary: How to Track Failed Login Attempts and Suspicious Authentication Patterns

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python metrics API
- OpenTelemetry Python tracing API
- FastAPI request handling
- Python authentication monitoring patterns

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry metrics SDK cardinality limits: https://opentelemetry.io/docs/specs/otel/metrics/sdk/
- OpenTelemetry metrics concepts: https://opentelemetry.io/docs/concepts/signals/metrics/
- FastAPI custom response documentation: https://fastapi.tiangolo.com/advanced/custom-response/

## Issues Found
- The `auth_monitor.py` snippet used metric instruments and the tracer without importing them. Added imports from `login_metrics` so the snippet is copyable as a separate module.
- The examples used `auth.source_ip` and `auth.username_hash` as metric attributes. OpenTelemetry metric streams are identified by their attribute sets, and the Metrics SDK defines cardinality limits for unique attribute combinations, so per-IP and per-account metric attributes can create excessive cardinality. Updated metric attributes to use lower-cardinality `auth.method` and kept source IP and hashed username on spans/events.
- The username hashing comment said it avoided metric cardinality explosion. Hashing preserves uniqueness, so it helps avoid exposing raw identifiers but does not reduce cardinality. Updated the comment accordingly.
- The FastAPI endpoint returned `JSONResponse` without importing it. Added `from fastapi.responses import JSONResponse`, matching FastAPI's documented response class import.
- The FastAPI endpoint referenced `AuthenticationMonitor` without importing it. Added `from auth_monitor import AuthenticationMonitor`.
- The endpoint assumed `request.client` was always present. Starlette/FastAPI can expose it as optional request state, so the example now falls back to `"unknown"` when it is unavailable.
- The `reset_window` docstring called the counters a sliding window, but the shown method performs a manual full reset. Updated the docstring to "Reset window counters."

## Review Notes
The OpenTelemetry `create_counter`, `create_histogram`, `Counter.add`, `Histogram.record`, and `Tracer.start_as_current_span` usage is current and valid. The endpoint still relies on application-specific placeholders such as `LoginCredentials`, `authenticate`, `user_exists`, and `generate_token`, which is acceptable for an integration snippet but would need concrete implementations in a real application.
