# Validation Summary: How to Troubleshoot Collector Pipeline Blocked Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector internal telemetry
- OTLP/HTTP and OTLP/gRPC exporters
- Collector exporter sending queues and retries
- File storage extension and persistent queues
- Batch, memory limiter, resource detection, and tail sampling processors
- Kubernetes Deployments, PVCs, and HorizontalPodAutoscaler
- Prometheus and PromQL

## Sources Consulted
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector exporter helper README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector OTLP HTTP exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md
- OpenTelemetry Collector OTLP receiver README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- OpenTelemetry Collector batch processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md
- OpenTelemetry Collector memory limiter processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md
- OpenTelemetry Collector file storage extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/storage/filestorage/README.md
- OpenTelemetry Collector load balancing exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/loadbalancingexporter/README.md
- OpenTelemetry Collector resource detection processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourcedetectionprocessor/README.md
- OpenTelemetry Collector tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- Kubernetes HPA documentation: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/

## Issues Found
- The post described every Collector component as having internal queues. Updated the explanation and diagram to say buffers and sending queues are used by specific components, especially batch processors and exporters.
- The internal metrics example used `service.telemetry.metrics.address`, which is ignored in Collector v0.123.0 and later. Replaced it with the current `pull` Prometheus reader configuration and kept the OTLP periodic reader.
- The queue metric list used a generic `otelcol_exporter_enqueue_failed` metric that does not exist. Replaced it with the signal-specific `otelcol_exporter_enqueue_failed_spans`, `otelcol_exporter_enqueue_failed_metric_points`, and `otelcol_exporter_enqueue_failed_log_records` metrics.
- The post stated the default sending queue size was 10,000 items. Updated this to the current default of 1,000 requests/batches and clarified that queue size and capacity are in batches by default.
- Several snippets used deprecated Collector component aliases (`otlphttp`, `loadbalancing`, `resourcedetection`, and `logging`). Updated them to `otlp_http`, `load_balancing`, `resource_detection`, and `debug`.
- The persistent queue example claimed a fixed 100 MB memory estimate and used the storage directory as the compaction directory. Replaced the memory estimate with a payload-dependent note and changed compaction to use a separate directory.
- The exporter performance diagnosis referenced a non-existent `otelcol_exporter_send_failed_spans_duration_bucket` metric. Replaced it with `otelcol_exporter_in_flight_requests` and the existing send failure metric.
- The batch processor example used `metadata_keys` as if they were telemetry attributes. Removed that block because batch `metadata_keys` refer to client metadata and can increase memory use.
- The memory metric command searched for the obsolete `process_runtime_go_mem` pattern. Updated it to search for current `otelcol_process_runtime` metrics.
- The backend downtime example had duplicate top-level `exporters` keys and described load balancing as automatic failover. Split it into valid backup-copy and load-balancing examples, and corrected the load balancing exporter hostnames to OTLP/gRPC backend addresses.
- The complete production configuration used Docker and Kubernetes resource detectors without their required runtime prerequisites. Narrowed it to `env` and `system` detectors for a generally valid example.

## Review Notes
The Prometheus examples use `without_type_suffix: true` and `without_units: true` so the metric names match the raw OpenTelemetry names shown in the post. If those options are removed in a manually configured Prometheus reader, Prometheus may expose counters and unit-bearing metrics with suffixes such as `_total` or `_seconds`.
