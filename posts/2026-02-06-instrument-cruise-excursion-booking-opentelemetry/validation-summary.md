# Validation Summary: How to Instrument Cruise Line Shore Excursion Booking and Capacity Management

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Python
- OpenTelemetry tracing
- OpenTelemetry metrics
- Cruise line shore excursion booking and capacity management concepts

## Sources Consulted
- OpenTelemetry Python manual instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry tracing API specification: https://opentelemetry.io/docs/specs/otel/trace/api/

## Issues Found
- The `excursion.capacity_utilization_percent` observable gauge was created without a callback. OpenTelemetry asynchronous instruments report measurements through registered callbacks, so the original snippet defined the instrument but did not actually observe capacity utilization. I added a callback using `CallbackOptions` and `Observation`, then registered it with `callbacks=[observe_capacity_utilization]`.

## Review Notes
The Python snippets are illustrative and depend on application-specific functions such as `get_port_schedule`, `reserve_excursion_capacity`, and `charge_onboard_account`. The OpenTelemetry API usage now matches the current documented Python tracing and metrics APIs. In a production system, attributes such as guest IDs and booking IDs should be reviewed for privacy and cardinality before exporting telemetry.
