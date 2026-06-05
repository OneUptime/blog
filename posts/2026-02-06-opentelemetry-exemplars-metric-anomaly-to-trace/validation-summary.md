# Validation Summary: How to Use OpenTelemetry Exemplars to Jump from a Metric Anomaly Directly to

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry metrics and exemplars
- OpenTelemetry traces and trace context
- OpenTelemetry Java SDK
- OpenTelemetry Python SDK
- OpenTelemetry Collector
- OTLP gRPC exporter

## Sources Consulted
- OpenTelemetry Metrics SDK specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk/
- OpenTelemetry Metrics Data Model specification: https://opentelemetry.io/docs/specs/otel/metrics/data-model/
- OpenTelemetry Java SDK documentation: https://opentelemetry.io/docs/languages/java/sdk/
- OpenTelemetry Java SDK source for `ExemplarFilter`: https://github.com/open-telemetry/opentelemetry-java/blob/main/sdk/metrics/src/main/java/io/opentelemetry/sdk/metrics/ExemplarFilter.java
- OpenTelemetry Java OTLP metric exporter source: https://github.com/open-telemetry/opentelemetry-java/blob/main/exporters/otlp/all/src/main/java/io/opentelemetry/exporter/otlp/metrics/OtlpGrpcMetricExporter.java
- OpenTelemetry Python metrics SDK documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector batch processor package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/batchprocessor

## Issues Found
- The Java snippet imported `io.opentelemetry.exporter.otlp.metrics.OTLPMetricExporter`, which is not the current Java OTLP gRPC metric exporter class. Changed it to `io.opentelemetry.exporter.otlp.metrics.OtlpGrpcMetricExporter`.
- The Java snippet imported `ExemplarFilter` from `io.opentelemetry.sdk.metrics.exemplar`, but the current public Java API exposes it as `io.opentelemetry.sdk.metrics.ExemplarFilter`. Updated the import.
- The Python snippet imported `TraceBasedExemplarFilter` from the private `_internal` package. Updated it to the public `opentelemetry.sdk.metrics.TraceBasedExemplarFilter` import.
- The Python setup created a `MeterProvider` but did not register it as the global provider before later using `metrics.get_meter(...)`. Added `metrics.set_meter_provider(meter_provider)`.
- The Python recording example used `time.monotonic()` without importing `time`. Added the import.
- Several explanations overstated exemplar behavior as if every eligible measurement always becomes an exemplar. Updated the wording to reflect the OpenTelemetry spec: the filter makes measurements eligible, and the reservoir decides which exemplars are stored.
- The collector batch processor comment implied batch sizing preserves exemplar associations. Updated it to describe batch sizing without implying it enables or preserves exemplar content.

## Review Notes
The examples are still intentionally focused snippets. A complete application would also configure a tracer provider and span exporter so sampled traces are exported to the same backend that receives metrics.
