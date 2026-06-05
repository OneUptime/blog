# Validation Summary: How to Monitor and Alert on OpenTelemetry Pipeline Health

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector internal telemetry
- Prometheus
- PromQL
- Kubernetes
- kube-state-metrics
- Grafana
- Grafana Tempo TraceQL
- telemetrygen

## Sources Consulted
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector Contrib telemetrygen README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/cmd/telemetrygen
- OpenTelemetry Collector Contrib telemetrygen flag source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/cmd/telemetrygen/internal/config/config.go
- Prometheus configuration and Kubernetes service discovery documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus template reference: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- kube-state-metrics pod metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Grafana Tempo TraceQL documentation: https://grafana.com/docs/tempo/latest/traceql/construct-traceql-queries/

## Issues Found
- The Collector telemetry example used `service.telemetry.metrics.address`, which is ignored in Collector v0.123.0 and newer. Replaced it with the current `metrics.readers.pull.exporter.prometheus` configuration and set `without_type_suffix` and `without_units` so the later PromQL examples use the documented metric names.
- The logs telemetry level used lowercase `warn`; current Collector documentation lists uppercase values such as `WARN`. Updated the example to `WARN`.
- The post referenced `otelcol_processor_dropped_spans`, which is not a documented current internal Collector metric. Replaced it with an input-minus-output query using `otelcol_processor_incoming_items` and `otelcol_processor_outgoing_items`.
- The batch processor example described batch size but used the size-trigger counter. Updated it to use `otelcol_processor_batch_batch_send_size` for batch size and added a separate rate query for `otelcol_processor_batch_batch_size_trigger_send`.
- The exporter section described `otelcol_exporter_queue_size` as in-flight exports. Clarified that it is queued export batches and added the documented `otelcol_exporter_in_flight_requests` metric.
- The resource metrics section used `go_gc_duration_seconds`, which is not part of the current documented Collector internal metrics. Replaced it with documented Collector runtime heap allocation metrics.
- The Kubernetes scrape config did not retain `pod` and `namespace` labels, but later alert joins depended on them. Added relabeling for those labels.
- The high-memory alert joined only on `pod` and did not filter the kube-state-metrics limit to the collector container. Updated the join to `on(namespace, pod) group_left` and filtered `container="collector"`.
- The long-uptime alert used `time() - otelcol_process_uptime`, which would compare a process start timestamp against 30 days and fire incorrectly. Changed it to compare `otelcol_process_uptime` directly.
- The synthetic trace validation query was labeled as PromQL even though it queried trace data by service name. Replaced it with a backend-specific Grafana Tempo TraceQL example.
- The partial export failure alert and composite health score used a fragile failure-rate denominator. Updated them to divide failures by sent plus failed spans with a `clamp_min` guard.
- The Grafana dashboard snippet referenced the removed processor dropped-spans metric. Updated it to use the processor input-output delta.

## Review Notes
Some alert thresholds are intentionally environment-specific and should be tuned against production traffic patterns. `otelcol_exporter_send_failed_spans` indicates export failures but does not always mean data loss because retries may still succeed.
