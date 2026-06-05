# Validation Summary: How to Trace Marketplace Seller Order Routing and Commission Calculation

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry metrics
- Python
- Marketplace order routing and commission calculation

## Sources Consulted
- OpenTelemetry Python documentation: https://opentelemetry.io/docs/languages/python/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry common specification concepts for attributes: https://opentelemetry.io/docs/specs/otel/common/
- OpenTelemetry HTTP semantic conventions for span status behavior: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- Python time module documentation: https://docs.python.org/3/library/time.html

## Issues Found
- The commission calculation snippet set `commission.rate` to the entire `rate` dictionary. OpenTelemetry Python span attributes accept primitive values or homogeneous sequences, so the snippet now records `rate["percentage"]` and keeps the rate source in `commission.rate_source`.
- The routing latency snippet used `time.time()` to measure elapsed duration. Python documents `time.perf_counter()` as the high-resolution performance counter intended for short duration measurements, so the snippet now uses `time.perf_counter()` for latency timing.

## Review Notes
The examples are illustrative and assume application-specific repositories, HTTP clients, ledger services, and omitted routing methods exist. No deprecated OpenTelemetry APIs were found in the shown tracing and metrics calls.
