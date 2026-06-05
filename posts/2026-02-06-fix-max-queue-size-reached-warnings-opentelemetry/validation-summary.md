# Validation Summary: How to Fix 'Max Queue Size Reached' Warnings in OpenTelemetry

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- OpenTelemetry SDK
- OpenTelemetry Python SDK
- OpenTelemetry Java SDK
- OpenTelemetry Collector
- Collector exporter sending queues
- Collector persistent queues with file storage
- Collector internal telemetry metrics
- Tail sampling processor
- Prometheus queries

## Sources Consulted
- OpenTelemetry SDK environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry Python BatchSpanProcessor source: https://raw.githubusercontent.com/open-telemetry/opentelemetry-python/main/opentelemetry-sdk/src/opentelemetry/sdk/trace/export/__init__.py
- OpenTelemetry Java SDK documentation: https://opentelemetry.io/docs/languages/java/sdk/
- OpenTelemetry Collector exporterhelper README: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector resiliency documentation: https://opentelemetry.io/docs/collector/resiliency/
- OpenTelemetry Collector file storage extension README: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/main/extension/storage/filestorage/README.md
- OpenTelemetry Collector tail sampling processor README: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry sampling concepts: https://opentelemetry.io/docs/concepts/sampling/

## Issues Found
- The Python overflow reproduction used `ConsoleSpanExporter` directly, which may drain quickly and not reliably demonstrate backpressure. Added a `SlowConsoleSpanExporter` wrapper that sleeps during export so the queue overflow behavior is reproducible.
- The post said the same batch processor parameters exist in Java, Go, and other SDKs. The concepts are portable, but method names vary by implementation. Updated the wording to avoid implying identical API names.
- The Collector `sending_queue` snippet had comments that described `num_consumers` as a batch buffer. Updated the comments so `num_consumers` is described as concurrent consumers and `queue_size` as queue capacity.
- The Collector internal telemetry example used `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. Replaced it with the current `metrics.readers.pull.exporter.prometheus` configuration.
- The Prometheus query used `otelcol_exporter_send_latency_bucket`, which is not listed in the current Collector internal metrics documentation. Replaced it with `rate(otelcol_exporter_send_failed_spans[5m])` and adjusted the explanation.
- The persistent queue example described compaction settings as a maximum disk space control. Updated the comment to describe compaction as reclaiming unused disk space.
- The persistent queue explanation overstated durability. Updated it to note that data can still be lost if disk storage fails, fills up, or retry limits are exceeded.
- The tail sampling section said it keeps only 10% of successful traces and can reduce queue pressure by 90% while retaining all important traces. Updated the wording to match the configured policies: all error-status traces are sampled, and non-error trace volume is reduced by roughly 90%.

## Review Notes
Collector internal telemetry configuration is still evolving before a 1.0 declarative schema, so examples using `service.telemetry.metrics` may need periodic review as Collector versions advance.
