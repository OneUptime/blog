# Validation Summary: How to Tune BatchSpanProcessor maxQueueSize, scheduledDelayMillis,

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry SDK
- OpenTelemetry BatchSpanProcessor
- Java OpenTelemetry SDK and OTLP gRPC exporter
- Python OpenTelemetry SDK and OTLP gRPC exporter
- OpenTelemetry SDK environment variables

## Sources Consulted
- OpenTelemetry Trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry SDK environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry Java SDK documentation: https://opentelemetry.io/docs/languages/java/sdk/
- OpenTelemetry Java BatchSpanProcessorBuilder Javadoc: https://javadoc.io/static/io.opentelemetry/opentelemetry-sdk-trace/1.26.0/io/opentelemetry/sdk/trace/export/BatchSpanProcessorBuilder.html
- OpenTelemetry Python SDK environment variables documentation: https://opentelemetry-python.readthedocs.io/en/stable/sdk/environment_variables.html
- OpenTelemetry SDK metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/otel/sdk-metrics/

## Issues Found
- The throughput formula incorrectly used `maxQueueSize / scheduledDelayMillis`. I changed it to describe timer-driven export rate as `maxExportBatchSize / scheduledDelayMillis`, and clarified that the processor can export earlier when the queue reaches `maxExportBatchSize`; steady throughput depends on exporter/backend latency and batch size.
- The explanation said the processor only drains every `scheduledDelayMillis`. I updated it to include the spec-defined export triggers: schedule delay, queue reaching `maxExportBatchSize`, and force flush.
- The post described BatchSpanProcessor as the default way to export spans from the SDK. I changed this to "common production way" because the exact default depends on SDK setup and autoconfiguration.
- The Java monitoring example used an unsupported JVM property and an incomplete custom `SpanProcessor` wrapper. I replaced it with Java Util Logging configuration and noted that batch processor metrics require passing a `MeterProvider` to the builder.
- The Python warning message did not match the SDK's current warning text. I updated it to "Queue is full, likely spans will be dropped."

## Review Notes
The Java and Python tuning APIs and environment variable names are current and match official documentation. The numeric tuning recommendations are reasonable operational guidance, but exact values should still be validated against exporter latency, collector limits, backend payload limits, and process memory in each deployment.
