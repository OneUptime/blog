# Validation Summary: How to Implement Backpressure Handling in OpenTelemetry Pipelines

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Protocol (OTLP/gRPC)
- OpenTelemetry Python SDK
- OpenTelemetry Java SDK
- Collector processors: memory limiter, batch, tail sampling, probabilistic sampler
- Collector exporter sending queues, retry, and file storage
- Prometheus / PromQL monitoring

## Sources Consulted
- OpenTelemetry Collector memory limiter processor documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/memorylimiterprocessor
- OpenTelemetry Collector exporter helper documentation for sending queues and retry: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/exporterhelper
- OpenTelemetry Protocol specification for retryable OTLP/gRPC status codes: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector processor list and configuration examples: https://opentelemetry.io/docs/collector/components/processor/ and https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry file storage extension documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/extension/storage/filestorage
- OpenTelemetry Python BatchSpanProcessor source documentation: https://opentelemetry-python.readthedocs.io/en/latest/_modules/opentelemetry/sdk/trace/export.html
- OpenTelemetry Java SDK exporter / BatchSpanProcessor documentation: https://opentelemetry.io/docs/languages/java/sdk/
- Local validation with `otel/opentelemetry-collector-contrib:latest` version 0.153.0 using `components` and `validate`

## Issues Found
- The memory limiter comments said the hard limit is where data starts dropping. Updated the comments to state that the soft limit refuses data and the hard limit forces garbage collection.
- The OTLP/gRPC backpressure explanation stated that refused data returns `RESOURCE_EXHAUSTED`. Updated it to match the OTLP specification: backpressure should use `UNAVAILABLE`, while `RESOURCE_EXHAUSTED` is retryable only when recovery is indicated.
- The sending queue retry comment implied failed exports are put back into the queue. Reworded it to say failed exports are retried from the queue.
- The rate limiting snippet used a non-existent standalone `rate_limiting` processor. Replaced it with a valid `tail_sampling` processor policy of type `rate_limiting`.
- The complete agent and gateway configs omitted the required OTLP receiver protocol block. Added `receivers.otlp.protocols.grpc` to both examples and validated them with Collector contrib 0.153.0.
- The file storage example used `max_file_size_mib`, which is not a valid file storage extension field. Replaced it with valid `create_directory` and `compaction` settings.
- The PromQL example used the stale/non-current `otelcol_exporter_send_latency_bucket` metric. Updated it to refer to exporter RPC latency and noted that the exact metric name can vary by Collector version and Prometheus exporter settings.

## Review Notes
The corrected Collector examples were validated with `otelcol-contrib validate` from `otel/opentelemetry-collector-contrib:latest` version 0.153.0. The Python and Java SDK examples use current documented BatchSpanProcessor APIs. Collector internal metric names and Prometheus exposition details have changed across recent Collector versions, so production dashboards should confirm the emitted names from the deployed Collector version.
