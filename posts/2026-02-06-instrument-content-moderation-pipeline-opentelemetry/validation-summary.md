# Validation Summary: How to Instrument Content Moderation Pipeline with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry metrics
- OpenTelemetry Python API
- OpenTelemetry trace context propagation
- Python
- Content moderation pipeline observability

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry semantic convention naming guidance: https://opentelemetry.io/docs/specs/semconv/general/naming/

## Issues Found
- The human review queue example referenced `get_serialized_context()` and `deserialize_context()` without showing how trace context should be serialized and restored with OpenTelemetry. I added `TraceContextTextMapPropagator` usage and replaced `get_serialized_context()` with `serialize_current_context()` so the example follows the official Python propagation API.

## Review Notes
The post uses application-specific span and metric names, which is acceptable for domain instrumentation. In a production implementation, teams should also consider cardinality limits and privacy requirements before recording identifiers such as content IDs, author IDs, and reviewer IDs as attributes.
