# Validation Summary: How to Fix 'otelcol_processor_refused_spans' Metric Alerting on Data Loss

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector internal telemetry metrics
- OpenTelemetry Collector memory_limiter processor
- OpenTelemetry Collector batch processor
- OpenTelemetry Collector exporter sending queues and retry settings
- OpenTelemetry Collector file_storage extension
- Prometheus alerting rules
- Kubernetes Deployment resource limits

## Sources Consulted
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector memorylimiterprocessor package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/memorylimiterprocessor
- OpenTelemetry Collector batchprocessor package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/batchprocessor
- OpenTelemetry Collector exporterhelper package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/exporterhelper
- OpenTelemetry Collector resiliency documentation: https://opentelemetry.io/docs/collector/resiliency/
- OpenTelemetry Collector transforming telemetry documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/

## Issues Found
- The post centered on `otelcol_processor_refused_spans`, but current OpenTelemetry Collector internal telemetry documentation does not list that processor-level refused-spans metric. I updated the post to use `otelcol_receiver_refused_spans` for refused receiver pushes, `otelcol_exporter_enqueue_failed_spans` for exporter queue enqueue failures, and `otelcol_exporter_send_failed_spans` for exporter send failures.
- The post claimed the metric labels identify which processor refused spans. Current Collector metrics identify receiver/exporter labels for these failure modes instead. I updated the PromQL examples, alert labels, and diagnostic workflow accordingly.
- The post described the batch processor as having a send queue that fills and refuses spans. The sending queue is an exporter helper feature, not the batch processor queue. I changed the section to "Exporter Queue Overflow" and updated the explanation and metrics.
- The memory limiter behavior was imprecise. It starts refusing data at the soft limit (`limit_mib - spike_limit_mib`) and forces garbage collection at the hard limit. I corrected that explanation and adjusted the sizing guidance to use about 20% spike headroom.
- The container memory relationship incorrectly added `limit_mib + spike_limit_mib`; `limit_mib` is already the hard limit. I corrected the guidance to leave container headroom above `limit_mib` for non-heap and process overhead.
- The persistent queue example defined `file_storage/traces` but did not enable the extension under `service.extensions`. I added `service: extensions: [file_storage/traces]`.
- The post treated filter processor drops as refused spans. I clarified that filters intentionally drop matching telemetry but are not the same as refused-span signals.

## Review Notes
Metric names can gain a `_total` suffix when exposed through some Prometheus configurations. The post uses the Collector's documented default internal metric names; readers with custom telemetry readers may need to adjust PromQL for their scrape configuration.
