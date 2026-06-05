# Validation Summary: How to Create OpenTelemetry Instrumentation Guidelines for Your Team

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry metrics
- OpenTelemetry semantic conventions
- OpenTelemetry Python API
- OpenTelemetry JavaScript SDK
- Python logging
- YAML configuration examples

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry Python trace span API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.span.html
- OpenTelemetry JavaScript SpanProcessor API documentation: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_sdk-trace-base.SpanProcessor.html
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry semantic conventions overview: https://opentelemetry.io/docs/specs/semconv/
- OpenTelemetry semantic convention naming guidance: https://opentelemetry.io/docs/specs/semconv/general/naming/

## Issues Found
- The custom attribute `service.operation` used the existing OpenTelemetry `service` namespace for an application-specific field. Changed it to `app.operation` to avoid implying it is an official semantic convention field.
- The JavaScript custom span processor section said it enforced attribute limits, but the example only warns after spans end. Changed the wording and comments to say it flags or reports violations.
- The JavaScript span processor example omitted the current `parentContext` parameter on `onStart` and imported `SpanProcessor` as a runtime CommonJS value even though it is an interface in the documented API. Updated the method signature and removed the unused runtime import.
- The metric naming guidance used a `{service}.{domain}.{measurement}` pattern and service-prefixed examples while also saying not to include the service name. Updated the pattern and examples to omit the service prefix.
- The metric naming guidance recommended `_total` suffixes for OpenTelemetry counters and putting units in names by default. Updated the rules to set units on instruments, avoid `_total`, and include units in names only when needed to avoid ambiguity.
- The Python metric examples used the outdated counter and duration names from the incorrect guidance. Updated them to `orders.created` and `orders.processing.duration`.
- The queue-depth metric was labeled as a gauge but created with `create_up_down_counter`. Updated it to use `create_gauge`, which is documented by the current OpenTelemetry Python metrics API.
- The Python metrics snippet used `time.time()` without importing `time`. Added the missing import.

## Review Notes
The examples are intentionally illustrative and still depend on application-specific objects such as `payment_client`, `gateway`, `order`, and `do_process`. Those are acceptable placeholders for this guide. The JavaScript attribute-limit processor reports guideline violations; actual hard limits should still be configured through the SDK or collector where appropriate.
