# Validation Summary: How to Set Up Multiple Span Processors in a Single TracerProvider

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry SDK
- OpenTelemetry SpanProcessor
- OpenTelemetry TracerProvider
- Python OpenTelemetry SDK
- Java OpenTelemetry SDK
- Go OpenTelemetry SDK
- OTLP trace exporters

## Sources Consulted
- OpenTelemetry Trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry Python SDK trace source documentation: https://opentelemetry-python.readthedocs.io/en/stable/_modules/opentelemetry/sdk/trace.html
- OpenTelemetry Java SdkTracerProviderBuilder Javadocs: https://javadoc.io/static/io.opentelemetry/opentelemetry-sdk-trace/1.46.0/io/opentelemetry/sdk/trace/SdkTracerProviderBuilder.html
- OpenTelemetry Java SimpleSpanProcessor Javadocs: https://javadoc.io/static/io.opentelemetry/opentelemetry-sdk-trace/1.29.0/io/opentelemetry/sdk/trace/export/SimpleSpanProcessor.html
- OpenTelemetry Go SDK trace package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/trace

## Issues Found
- The original introduction implied that independently registered span processors form one linear filtering pipeline where an earlier processor can drop spans before later provider-level processors receive them. OpenTelemetry defines each registered processor as the start of its own pipeline, and processors are invoked in registration order. I updated the wording to describe enrichment and multi-destination export accurately.
- The use-case list described custom sampling logic as a span processor use case. OpenTelemetry sampling decisions are made by a TracerProvider sampler during span creation, so I changed that item to recommend configuring a sampler on the TracerProvider.
- The filtering use case implied that a normal earlier processor can prevent later registered exporter processors from receiving spans. I changed it to describe wrapping exporter processors in a custom filtering processor for SDK-side export filtering.
- The Python example imported unused SDK symbols and defined custom processors without extending `SpanProcessor`. I updated the imports and custom classes to use the SDK `SpanProcessor` interface directly.
- The performance section claimed that adding an export processor before an enrichment processor means the exporter sees spans without enrichment. For enrichment done in `on_start`, later export on span end still sees the updated span. I changed the example to focus on processors that inspect attributes during `on_start`, where order does matter.

## Review Notes
The Java and Go examples use current documented SDK APIs for adding multiple span processors or registering exporters through processor options. The Python OTLP gRPC exporter endpoint format and batch processor options are consistent with current SDK usage.
