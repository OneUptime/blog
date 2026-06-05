# Validation Summary: How to Instrument Hotel Property Management System Check-In/Check-Out Flows

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python tracing API
- OpenTelemetry Python metrics API
- Python
- Hotel property management system check-in/check-out workflows

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry handling sensitive data guidance: https://opentelemetry.io/docs/security/handling-sensitive-data/
- OpenTelemetry common attribute specification: https://opentelemetry.io/docs/specs/otel/common/

## Issues Found
- The checkout code block used `time.time()` without importing `time`. Added `import time` to the first instrumentation example so the later checkout example has access to it in the cumulative code.
- The examples called `set_status(StatusCode.ERROR, "...")`. Updated them to use `Status(StatusCode.ERROR, "...")`, matching the OpenTelemetry Python documentation's documented status object pattern.
- The check-in root span did not mark reservation lookup and payment failures as span errors. Added error status on the parent span for those failed workflow outcomes.
- The examples recorded sensitive or potentially sensitive guest/payment data as span attributes, including confirmation number, guest name, assigned room number, checkout room number, and payment authorization code. Removed or replaced those attributes with lower-risk operational attributes.
- The observable gauge example created an asynchronous gauge without a callback, so it would not emit queue length measurements. Added a callback that yields an `Observation`, matching the documented OpenTelemetry Python metrics API.

## Review Notes
The post uses domain-specific custom `pms.*` attributes rather than published OpenTelemetry semantic conventions, which is acceptable for a domain without standard PMS conventions. Future improvements could include adding metric attributes when recording `pms.operations_total` so the "by type and hour" description is demonstrated explicitly.
