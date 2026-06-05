# Validation Summary: How to Build an Error Impact Score Using OpenTelemetry Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python tracing API
- OpenTelemetry Python metrics API
- OpenTelemetry Python SDK span processors
- Prometheus / PromQL metric querying
- Grafana dashboard visualization
- Python

## Sources Consulted
- OpenTelemetry Python manual instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python SDK trace documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.html
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry metric semantic conventions and units: https://opentelemetry.io/docs/specs/semconv/general/metrics/
- OpenTelemetry Prometheus compatibility documentation: https://opentelemetry.io/docs/compatibility/prometheus/client-libraries/
- Prometheus metric naming documentation: https://prometheus.io/docs/practices/naming/

## Issues Found
- The span processor example implemented `force_flush` with `pass`, which returns `None`. OpenTelemetry Python span processor `force_flush` is expected to return a boolean. Changed it to `return True` for this in-memory processor.
- The metrics example created observable gauges without callbacks, then recreated instruments with the same names later. OpenTelemetry asynchronous instruments should be created with callbacks registered on the instrument. Removed the initial no-callback gauge creation and created the observable gauges only inside `register_impact_callbacks`.
- The metrics example used non-UCUM units (`score` and `users`). OpenTelemetry metric units should follow UCUM conventions. Changed the impact score unit to `1` and the affected-user count unit to `{user}`.
- The metrics example referenced `metrics.Observation`; the official Python examples import `Observation` from `opentelemetry.metrics`. Updated the import and usages to match the documented pattern.

## Review Notes
- The custom span attributes such as `user.id`, `business.path`, and `business.revenue_generating` are application-specific attributes, not OpenTelemetry semantic convention attributes. That is acceptable for this example, but production systems should review privacy and cardinality implications before attaching user identifiers to spans.
- The PromQL query uses `error_impact_score`, which is plausible when OpenTelemetry dotted metric names are translated for Prometheus exporters.
