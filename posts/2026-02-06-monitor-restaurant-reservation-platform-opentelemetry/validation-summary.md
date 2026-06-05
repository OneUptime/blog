# Validation Summary: How to Monitor Restaurant Reservation Platform Performance with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Python tracing API
- OpenTelemetry Python metrics API
- Python
- Restaurant reservation platform observability

## Sources Consulted
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry common specification concepts, attributes: https://opentelemetry.io/docs/specs/otel/common/#attribute
- OpenTelemetry metrics SDK specification, cardinality limits: https://opentelemetry.io/docs/specs/otel/metrics/sdk/

## Issues Found
- Several span and metric attributes used values that may be Python `date`, `time`, UUID, or other object instances. OpenTelemetry attributes must be supported primitive values or arrays of supported values. I changed date, time, restaurant ID, diner ID, table ID, and confirmation ID attribute values to strings while leaving the application function arguments unchanged.

## Review Notes
- The OpenTelemetry Python APIs used in the post are current: `metrics.get_meter`, `trace.get_tracer`, `start_as_current_span`, `SpanKind.SERVER`, `set_attribute`, `create_histogram`, `create_counter`, `create_up_down_counter`, `record`, and `add` match the official API documentation.
- The examples intentionally use custom `reservation.*` attributes because restaurant reservation fields do not have standard OpenTelemetry semantic conventions.
- The examples include potentially high-cardinality metric attributes such as restaurant IDs. This is allowed by the API, but production implementations should watch metric cardinality and use views or attribute filtering where needed.
