# Validation Summary: How to Diagnose Data Loss with otelcol_exporter_send_failed_spans Metrics

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector internal telemetry metrics
- OTLP HTTP exporter
- Exporter helper retry and sending queue configuration
- Memory limiter processor
- File storage extension and file exporter
- Prometheus and PromQL
- Kubernetes
- telemetrygen

## Sources Consulted
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector resiliency documentation: https://opentelemetry.io/docs/collector/resiliency/
- OpenTelemetry Collector exporter helper README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector OTLP HTTP exporter documentation: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/otlphttpexporter
- OpenTelemetry Collector HTTP client configuration documentation: https://pkg.go.dev/go.opentelemetry.io/collector/config/confighttp
- OpenTelemetry Collector retry configuration documentation: https://pkg.go.dev/go.opentelemetry.io/collector/config/configretry
- OpenTelemetry Collector memory limiter processor documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/memorylimiterprocessor
- OpenTelemetry Collector contrib file exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/fileexporter/README.md
- telemetrygen documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/cmd/telemetrygen

## Issues Found
- The Collector internal metrics example used `service.telemetry.metrics.address`, which is ignored in Collector v0.123.0 and later. Replaced it with the current `readers.pull.exporter.prometheus.host/port` configuration and set `without_type_suffix` / `without_units` so the PromQL examples match the metric names used in the post.
- The post described `service_name` as the pipeline label. Updated this to describe it as the Collector service label; the signal and exporter are identified by metric name and exporter label.
- The post used `otlphttp`, which is now a deprecated alias. Updated exporter examples and labels to `otlp_http`.
- The post treated `otelcol_exporter_send_failed_spans` as definitive data loss. Updated wording to explain that send failures indicate export failures and data loss risk, because retries and queues may still deliver data later.
- The post referenced `otelcol_processor_dropped_spans` and `process_runtime_go_mem_heap_alloc_bytes`, which are not the current Collector metrics documented for this use case. Replaced them with `otelcol_processor_incoming_items` / `otelcol_processor_outgoing_items` and `otelcol_process_runtime_heap_alloc_bytes`.
- The PromQL stage queries used `sum by (stage)` without creating a `stage` label, and later used invalid/ineffective `label_replace` arguments. Updated the queries to add a stage label correctly.
- The backend latency example used `otelcol_exporter_send_latency_bucket`, which is not a current documented Collector internal metric. Replaced it with `otelcol_exporter_in_flight_requests` and send-failure checks.
- The final configuration included a nonexistent `retry` processor. Removed it and kept retry configuration on the exporter through `retry_on_failure`.
- The file exporter was described as a fallback exporter. Updated wording to clarify that exporters in a pipeline fan out, so the file exporter is a secondary local copy rather than conditional fallback.

## Review Notes
The PromQL examples assume the Prometheus reader is configured with `without_type_suffix: true` and `without_units: true`, as shown in the post. Without those settings, Prometheus-exposed counter names may include suffixes such as `_total`.
