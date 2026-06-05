# Validation Summary: How to Monitor Quality Control Inspection Pipeline with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python tracing API
- OpenTelemetry Python metrics API
- OTLP/gRPC exporters
- OpenTelemetry Collector
- Python quality-control pipeline instrumentation

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python exporter documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python OTLP exporter API documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html

## Issues Found
- The OTLP/gRPC exporters used a plain `http://otel-collector:4317` endpoint without `insecure=True`. The official Python OTLP/gRPC exporter example sets `insecure=True` for a non-TLS collector endpoint, so the trace and metric exporters were updated accordingly.
- The setup omitted an OpenTelemetry `Resource` with `service.name`. The official Python exporter documentation notes that a service name is required for most backends, so the example now creates a `Resource` and attaches it to both the trace and metric providers.

## Review Notes
- The OpenTelemetry tracing calls, metric instrument creation, histogram `record`, counter `add`, span attributes, and span events match the current OpenTelemetry Python APIs.
- The hardware and model calls such as `camera.capture`, `defect_model.predict`, `laser_sensor.measure`, and `scale.read_weight` are illustrative application-specific placeholders, not OpenTelemetry APIs.
