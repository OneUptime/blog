# Validation Summary: How to Configure Exemplars to Link Metric Points to Specific Traces

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Metrics SDK
- OpenTelemetry exemplars
- OpenTelemetry Python SDK
- OpenTelemetry Go SDK
- OpenTelemetry Collector
- OTLP metrics
- Prometheus remote write
- Prometheus exemplar storage
- Grafana exemplar display

## Sources Consulted
- OpenTelemetry Metrics SDK specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk/
- OpenTelemetry Metrics Data Model specification: https://opentelemetry.io/docs/specs/otel/metrics/data-model/
- OpenTelemetry SDK environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry Python SDK metrics documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.html
- OpenTelemetry Python trace span documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/trace.span.html
- OpenTelemetry Go SDK metric package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/metric
- OpenTelemetry Go SDK exemplar package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/metric/exemplar
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector prometheusremotewrite exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- Prometheus exposition format exemplar documentation: https://prometheus.io/docs/instrumenting/exposition_formats/
- Grafana v7.4 release notes for exemplar support: https://grafana.com/docs/grafana/latest/whatsnew/whats-new-in-v7-4/

## Issues Found
- The Python setup section said exemplar collection is disabled or minimally configured by default. Updated it to reflect the OpenTelemetry specification and current Python SDK default of `trace_based`.
- The Python setup snippet created a `MeterProvider` but did not register it as the global provider. Added `metrics.set_meter_provider(provider)`.
- The Go snippet did not compile as written because `reader` and the `attribute` import were missing, while `otel` was imported but unused. Added `sdkmetric.NewManualReader()`, imported `go.opentelemetry.io/otel/attribute`, and removed the unused import.
- The Collector snippet described `resource_to_telemetry_conversion` as enabling exemplars for Prometheus remote write. Removed that setting from the exemplar discussion because it converts resource attributes to metric labels and is not an exemplar enablement switch.
- The Collector snippet configured the Prometheus remote write exporter but did not enable it in the metrics pipeline. Added it to the pipeline exporters list.
- The Prometheus/Grafana support note omitted Prometheus's exemplar storage feature flag requirement. Updated the text to say Prometheus 2.26 and later require `--enable-feature=exemplar-storage`.
- The payment-service Python snippet used `time.monotonic()` without importing `time`. Added the import.
- The production-overhead claim was too absolute. Changed it to say overhead is usually low and should be validated for the workload.
- The low-sampling-rate note incorrectly implied `trace_based` exemplars would point to unsampled traces. Updated it to say most metric events will not be eligible for trace-linked exemplars when trace sampling is very low.

## Review Notes
The examples are intentionally simplified and omit full exporter/tracer setup. The Go metrics setup uses `NewManualReader()` as a compilable stand-in; production code would normally use a periodic reader with an exporter.
