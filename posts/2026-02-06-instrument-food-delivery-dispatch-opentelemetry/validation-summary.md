# Validation Summary: How to Instrument Food Delivery Dispatch Systems with OpenTelemetry

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenTelemetry Python API and SDK
- OpenTelemetry tracing spans, attributes, events, and span links
- OpenTelemetry metrics instruments: counters, histograms, and observable gauges
- OTLP gRPC exporters
- OpenTelemetry resource and metric semantic conventions
- Python instrumentation patterns for dispatch, logistics, ETA, and delivery lifecycle systems

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python OTLP exporter API documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry deployment semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- OpenTelemetry resource documentation: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry metric semantic conventions and UCUM unit guidance: https://opentelemetry.io/docs/specs/semconv/general/metrics/
- OpenTelemetry semantic convention naming guidance: https://opentelemetry.io/docs/specs/semconv/general/naming/

## Issues Found
- The resource example used the deprecated `deployment.environment` attribute. Updated it to `deployment.environment.name`, which is the current stable OpenTelemetry semantic convention.
- The OTLP gRPC exporter examples used `otel-collector:4317` without a scheme or `insecure=True`. Updated the examples to `http://otel-collector:4317` with `insecure=True`, matching the documented Python gRPC exporter pattern for an internal non-TLS collector endpoint.
- The post said separate spans could be "linked" using an order ID attribute. Updated this to say the spans are correlated with an order ID attribute, and noted that OpenTelemetry span links require span contexts.
- The active driver count was modeled with a synchronous UpDownCounter even though it represented a current point-in-time value. Replaced it with an `ObservableGauge` callback that yields `Observation` values per zone.
- The metric examples used `unit="minutes"`. Updated minute-based metrics to `unit="min"` to follow OpenTelemetry's UCUM-style unit guidance.
- The delivery completion snippet used `time.time()` but the setup snippet did not import `time`. Added `import time` to the Python setup example.

## Review Notes
The remaining domain-specific APIs such as `restaurant_api`, `driver_pool`, `routing_service`, and `prep_time_model` are illustrative placeholders, which is appropriate for this tutorial. Several custom metric and attribute names are application-specific; for production instrumentation, teams should review cardinality, avoid high-cardinality attributes where possible, and consider avoiding semantic-convention namespace prefixes for custom attributes unless they intentionally manage that risk.
