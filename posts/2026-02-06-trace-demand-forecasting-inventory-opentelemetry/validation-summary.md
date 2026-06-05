# Validation Summary: How to Trace Demand Forecasting and Inventory Replenishment Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python API and SDK
- OpenTelemetry tracing
- OpenTelemetry metrics
- OTLP gRPC exporters
- Python
- Demand forecasting and inventory replenishment pipeline observability

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python OTLP exporter API documentation: https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html
- OpenTelemetry Python span API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.span.html
- OpenTelemetry metrics concepts documentation: https://opentelemetry.io/docs/concepts/signals/metrics/
- OpenTelemetry metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/general/metrics/
- OpenTelemetry metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/

## Issues Found
- The setup snippet configured only a trace provider and OTLP span exporter, but later examples created and recorded metrics. Added the OpenTelemetry SDK `MeterProvider`, `PeriodicExportingMetricReader`, and OTLP metric exporter so the metric instruments are backed by an SDK provider and can be exported.
- The metric histogram used `unit="pct"` and encoded the unit in the metric name as `forecast.error_pct`. OpenTelemetry recommends UCUM units for metric instruments and recommends keeping units out of metric names when unit metadata is present. Changed the instrument to `forecast.error` with `unit="%"`.

## Review Notes
- The span API usage, including `start_as_current_span`, `set_attribute`, and `add_event`, matches the current OpenTelemetry Python API.
- The code uses illustrative business functions such as `fetch_sales_data`, `run_forecast_model`, and `create_purchase_order`; those are assumed to be application-specific placeholders rather than complete runnable definitions.
- Recording `sku` as a metric attribute is useful for diagnostics but may create high cardinality in large catalogs. Production systems should limit or aggregate high-cardinality attributes according to their telemetry backend's capacity.
