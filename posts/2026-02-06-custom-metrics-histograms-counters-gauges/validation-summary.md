# Validation Summary: How to Build Custom Metrics with Histograms, Counters, and Gauges

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Metrics
- OpenTelemetry Python API and SDK
- OTLP metric exporter
- Python
- Histograms, counters, gauges, and metric views

## Sources Consulted
- OpenTelemetry Python manual instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python metrics SDK documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.html
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html
- OpenTelemetry metrics SDK specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk/
- OpenTelemetry metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry OTLP exporter configuration documentation: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/

## Issues Found
- The introduction said OpenTelemetry provides "three core metric instruments" and listed only counters, gauges, and histograms. OpenTelemetry also defines other metric instruments, including UpDownCounter and asynchronous instruments. Changed the wording to say these are three of the most common instruments.
- The e-commerce example used `"order" in dir()` to derive the latency status in `finally`. If `build_order()` succeeded but payment or saving failed, `order` would exist and the failure could be recorded as `"success"`. Added an explicit `status` variable that starts as `"error"` and is set to `"success"` only after the order is saved.

## Review Notes
The OpenTelemetry Python APIs used in the examples, including `MeterProvider`, `PeriodicExportingMetricReader`, `create_counter`, `create_histogram`, `create_gauge`, `create_observable_gauge`, `Observation`, `OTLPMetricExporter`, `View`, and `ExplicitBucketHistogramAggregation`, match the current official documentation. The default explicit histogram bucket boundaries listed in the post match the OpenTelemetry metrics SDK specification.
