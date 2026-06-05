# Validation Summary: How to Monitor Airport Flight Information Display System Data Pipeline

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Python API
- Python
- Metrics and tracing
- Airport Flight Information Display System data pipelines

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/trace.html

## Issues Found
- The tracing examples used `span.addEvent(...)`, which is not the OpenTelemetry Python API method name. Changed these calls to `span.add_event(...)`, matching the documented `Span.add_event` API.
- The display error handling used `display_span.set_status(trace.StatusCode.ERROR, str(e))` without importing the documented status symbols directly. Changed it to `display_span.set_status(Status(StatusCode.ERROR, str(e)))` and imported `Status` and `StatusCode` from `opentelemetry.trace`.
- The source freshness observable gauge was created without a callback, so it would not emit the described freshness measurements. Added an `observe_source_freshness` callback that yields `Observation` values with `fids.source` attributes, and registered it with `create_observable_gauge`.

## Review Notes
The examples remain illustrative and assume application-specific functions and objects such as `parse_flight_message`, `validate_flight_update`, `merge_flight_update`, `send_display_update`, `source`, `message`, `flight_record`, and `display` are defined elsewhere. The post does not configure an OpenTelemetry SDK provider or exporter; this is acceptable for a focused instrumentation example, but a complete runnable application would need SDK/exporter setup.
