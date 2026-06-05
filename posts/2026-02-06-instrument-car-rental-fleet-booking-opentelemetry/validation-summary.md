# Validation Summary: How to Instrument Car Rental Fleet Availability and Booking System

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python tracing API
- OpenTelemetry Python metrics API
- Python application instrumentation
- Car rental fleet availability and booking workflows

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/

## Issues Found
- The fleet utilization section created observable gauges without registering callbacks, and `collect_fleet_metrics` returned a dictionary rather than OpenTelemetry observations. Observable gauges are asynchronous instruments that report values through registered callbacks returning `Observation` objects. Updated the example to define callbacks for fleet utilization and vehicles in maintenance, then pass those callbacks to `meter.create_observable_gauge`.

## Review Notes
- The tracing examples use valid `start_as_current_span` and `set_attribute` patterns, and the counter and histogram examples use current `add` and `record` APIs.
- The custom `carrental.*` attributes are technically valid examples, but production systems should consider cardinality and privacy before recording identifiers such as customer IDs, vehicle IDs, reservation IDs, and confirmation numbers.
