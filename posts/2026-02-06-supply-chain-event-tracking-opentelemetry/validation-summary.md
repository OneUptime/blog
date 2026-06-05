# Validation Summary: How to Monitor Supply Chain Event Tracking

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python
- Distributed tracing
- W3C Trace Context propagation
- OTLP gRPC exporters
- OpenTelemetry metrics
- Python

## Sources Consulted
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python OTLP exporter API documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/

## Issues Found
- The TraceContext propagator import used `opentelemetry.trace.propagation`, but the current OpenTelemetry Python documentation imports `TraceContextTextMapPropagator` from `opentelemetry.trace.propagation.tracecontext`. Updated the import.
- The metrics snippet used `metrics.get_meter(...)` without importing `metrics` or configuring a real `MeterProvider`, which would leave the default no-op meter provider in place. Added the metrics import, OTLP metric exporter, `PeriodicExportingMetricReader`, and `MeterProvider` setup.
- The delay section said to track delays with span events, but the code only created a span and attributes. Added `span.add_event(...)` with delay attributes.
- The delay code used `datetime.utcnow()` without importing `datetime`; `datetime.utcnow()` is also discouraged in current Python because it returns a naive UTC timestamp. Added `datetime` and `timezone` imports and changed it to `datetime.now(timezone.utc).isoformat()`.
- The span status example used `trace.StatusCode.ERROR` directly. This is accepted by the current API, but the official Python instrumentation examples show importing `Status` and `StatusCode` and passing a `Status` object. Updated the example to match the documented pattern.
- The OTLP gRPC exporter pointed at an HTTP endpoint without explicitly setting `insecure=True`. Added `insecure=True` for the local collector endpoint, matching the OpenTelemetry Python OTLP exporter examples.

## Review Notes
The code examples are illustrative and still assume application-specific helpers such as `generate_shipment_id`, `save_shipment`, `get_shipment`, and `update_shipment_trace_context` exist. The shipment attribute names are custom domain attributes, not OpenTelemetry semantic convention attributes.
