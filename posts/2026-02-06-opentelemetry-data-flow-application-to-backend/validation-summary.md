# Validation Summary: How to Understand OpenTelemetry Data Flow from Application to Backend

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Python SDK
- OpenTelemetry Go SDK
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry Collector
- Jaeger
- Prometheus
- YAML configuration

## Sources Consulted
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Go exporters documentation: https://opentelemetry.io/docs/languages/go/exporters/
- OpenTelemetry Collector documentation: https://opentelemetry.io/docs/collector/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector exporter components documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector exporterhelper documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector OTLP exporter documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md
- OpenTelemetry Collector probabilistic sampler processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/probabilisticsamplerprocessor/README.md
- Go package documentation for deprecated Jaeger exporter: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/jaeger
- OpenTelemetry Jaeger exporter Collector migration note: https://opentelemetry.io/blog/2023/jaeger-exporter-collector-migration/

## Issues Found
- The Python provider example used `Resource.create(...)` without importing `Resource`. Added `from opentelemetry.sdk.resources import Resource` to match the official Python SDK examples.
- The processor layer described processors as doing sampling in the application pipeline. Clarified that SDK sampling decisions can happen in the SDK and sampling processors can happen later in the Collector pipeline.
- The Go exporter example imported and used `go.opentelemetry.io/otel/exporters/jaeger`, which is deprecated and no longer recommended. Replaced it with an OTLP gRPC exporter pointed at Jaeger's OTLP endpoint and removed the unused Prometheus import.
- The Collector fan-out example used the removed/deprecated native Jaeger exporter. Replaced it with a second OTLP exporter instance (`otlp/jaeger`) targeting a Jaeger deployment that accepts OTLP.
- The failure handling section said the span processor retries with exponential backoff. Updated this to reflect the trace SDK specification: retry behavior belongs to protocol-specific exporters, while default span processors do not implement retry logic and failed batches are dropped after exporter failure.
- The Collector internal telemetry example used `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. Updated the snippet to use the current `metrics.readers` Prometheus pull exporter configuration.

## Review Notes
The post is now technically accurate for current OpenTelemetry guidance. The examples are still intentionally illustrative snippets rather than complete runnable applications; future revisions could add complete setup examples if the post is expanded into a hands-on tutorial.
