# Validation Summary: How to Configure Backpressure-Aware Pipelines with Sending Queues, Retry Logic,

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector memory limiter processor
- OpenTelemetry Collector OTLP exporter
- Exporter sending queues and retry logic
- OpenTelemetry Collector file storage extension
- OpenTelemetry Collector internal telemetry metrics
- YAML configuration

## Sources Consulted
- OpenTelemetry Collector memory limiter processor documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/memorylimiterprocessor
- OpenTelemetry Collector exporterhelper documentation for retry, sending queues, and persistent queues: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/exporterhelper
- OpenTelemetry Collector file storage extension documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/extension/storage/filestorage
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector OTLP exporter documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md
- OpenTelemetry Collector gRPC configuration documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/configgrpc/README.md
- Runtime validation with `otel/opentelemetry-collector-contrib:latest validate`

## Issues Found
- The memory limiter section described the hard limit as the point where data starts being dropped. Updated it to explain that the soft limit is where the processor starts refusing data with non-permanent errors, while the hard limit also forces garbage collection.
- The retry section described `randomization_factor` as the exponential backoff multiplier. Added `multiplier: 1.5` and clarified that `randomization_factor` adds jitter.
- The retry section implied retries are indefinite unless `max_elapsed_time` is set. Updated it to note that the default is 300 seconds and retries become indefinite only when `max_elapsed_time` is set to `0`.
- The file storage snippets did not create the storage directory, which makes validation fail if `/var/otel/queue` does not already exist. Added `create_directory: true`.
- The complete configuration used the deprecated/ignored `service.telemetry.metrics.address` field. Replaced it with the current Prometheus pull reader configuration.
- The monitoring section referenced `otelcol_exporter_retry_send_count`, which is not listed in current Collector internal telemetry docs. Replaced it with `otelcol_exporter_send_failed_spans` as the current signal for failed export attempts that may be retried.

## Review Notes
The complete production configuration and the persistent queue configuration were validated successfully with the current OpenTelemetry Collector Contrib image. The post uses `file_storage`, so it requires a Collector distribution that includes the contrib file storage extension.
