# Validation Summary: How to Troubleshoot Intermittent 'Export Deadline Exceeded' Errors Caused by

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OTLP gRPC exporter
- OTLP HTTP exporter
- Batch processor
- Exporter retry and sending queue
- File storage extension
- Collector internal telemetry
- Kubernetes `kubectl exec`
- `curl`, `nc`, and PromQL

## Sources Consulted
- OpenTelemetry Collector OTLP gRPC exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md
- OpenTelemetry Collector OTLP HTTP exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md
- OpenTelemetry Collector exporterhelper README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector batch processor documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/batchprocessor
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector file storage extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/storage/filestorage/README.md

## Issues Found
- The post stated that the default OTLP exporter timeout is 30 seconds. Current Collector docs distinguish between `otlp` gRPC, which defaults to 5 seconds, and `otlp_http`, which defaults to a 30 second HTTP request timeout. I updated the explanation and the gRPC timeout comment.
- The HTTP exporter example used the deprecated `otlphttp` component name. I changed it to the current `otlp_http` name.
- The batch processor explanation implied that `send_batch_size` alone caps export request size. Official docs describe it as a trigger; `send_batch_max_size` enforces a maximum. I adjusted the wording.
- The retry section implied retries are not enabled until configured. Exporterhelper defaults retries to enabled for exporters using it, so I changed the wording to focus on verifying and tuning retry backoff.
- The sending queue section described queues as preventing data loss. Official docs note data can still be dropped if the queue is full or storage fails, so I changed the wording to "reducing the risk of data loss."
- The persistent queue snippet defined `file_storage` but did not load it under `service.extensions`. I added the required service extension reference.
- The compression section implied gzip must be newly enabled. Current OTLP Collector exporter docs state gzip is enabled by default, so I changed the section to checking or explicitly setting compression.
- The internal telemetry snippet used `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. I replaced it with the current Prometheus pull reader configuration.
- The average export duration PromQL used `otelcol_exporter_send_duration_*`, which is not listed in current internal telemetry docs. I changed it to use the current RPC client duration histogram metric for gRPC exports and aggregate across matching series.

## Review Notes
The example `nc` and `curl` probes are useful for basic connectivity timing, but they do not fully measure OTLP export latency because they do not serialize and send real OTLP payloads or account for backend processing time.
