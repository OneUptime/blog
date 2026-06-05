# Validation Summary: How to Prevent Data Loss in Seven Common OpenTelemetry Scenarios

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry SDK
- OpenTelemetry Java SDK
- OpenTelemetry Python SDK
- OpenTelemetry Collector
- OpenTelemetry Collector memory_limiter processor
- OpenTelemetry Collector batch processor
- OpenTelemetry Collector tail_sampling processor
- OpenTelemetry Collector exporter retry and sending queue
- OpenTelemetry Collector file_storage extension
- Kubernetes Deployments and PersistentVolumeClaims
- Prometheus and PromQL

## Sources Consulted
- OpenTelemetry SDK environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry Java exporter documentation: https://opentelemetry.io/docs/languages/java/exporters/
- OpenTelemetry Java BatchSpanProcessorBuilder Javadoc: https://javadoc.io/doc/io.opentelemetry/opentelemetry-sdk-trace/latest/io/opentelemetry/sdk/trace/export/BatchSpanProcessorBuilder.html
- OpenTelemetry Python BatchSpanProcessor API documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.export.html
- OpenTelemetry Collector memory_limiter processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md
- OpenTelemetry Collector exporterhelper README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector file_storage extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/storage/filestorage/README.md
- OpenTelemetry Collector tail_sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector Contrib releases: https://github.com/open-telemetry/opentelemetry-collector-contrib/releases

## Issues Found
- The SDK queue description was too broad for metrics. Updated it to distinguish span/log queues from metric reader/exporter buffering.
- The Java example comment said it configured more export threads, but the code only tunes queue, batch, delay, and timeout settings. Updated the comment.
- The Java exporter timeout comment described shutdown flushing. Updated it to describe the per-export attempt timeout.
- The memory_limiter comments described `spike_limit_mib` as the soft limit. Updated the explanation to state that the soft limit is `limit_mib - spike_limit_mib`, and that the hard limit is where garbage collection is forced.
- The retry examples used short `max_elapsed_time` values while claiming protection during backend downtime and network partitions. Updated the examples to use `max_elapsed_time: 0` for continued retries while queue capacity remains available.
- The file_storage examples used `max_file_size_mib`, which is not a valid file_storage extension option. Removed it and used supported compaction settings where disk reclamation was discussed.
- The Collector internal telemetry example used `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. Replaced it with the current `metrics.readers.pull.exporter.prometheus.host` and `port` syntax.
- The Kubernetes Collector image tag was pinned to old version `0.96.0`. Updated it to current release `0.153.0`.
- The export timeout section said a timed-out batch is lost immediately. Updated it to explain that a timed-out attempt fails the batch and requires retry and queue capacity to avoid eventual loss.
- The PromQL example used removed `otelcol_processor_dropped_spans`. Replaced it with current receiver refused and exporter enqueue failure metrics.

## Review Notes
The post is technically relevant and the corrected examples now align with current OpenTelemetry Collector and SDK documentation. Operators should still size persistent queues, PVC capacity, and retry windows according to their own outage tolerance because indefinite retries can preserve transient-failure data only while storage remains available.
