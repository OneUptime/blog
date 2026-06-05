# Validation Summary: How to Fix the Mistake of Not Configuring a Sending Queue

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry Collector
- Collector exporter sending queues
- Collector exporter retry behavior
- Collector file_storage extension and persistent queues
- Collector internal telemetry metrics
- Prometheus alerting expressions

## Sources Consulted
- OpenTelemetry Collector resiliency documentation: https://opentelemetry.io/docs/collector/resiliency/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector exporterhelper documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector file_storage extension documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/storage/filestorage
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/

## Issues Found
- The introduction implied that data is always dropped immediately without a sending queue. Updated it to state that data can be dropped when the queue is disabled or undersized, matching current Collector behavior where exporter-helper queues are commonly enabled by default but can still overflow or time out.
- The post said every Collector exporter supports `sending_queue` and `retry_on_failure`. Changed this to "most network exporters" built with the exporter helper, because support depends on the exporter implementation.
- The retry explanation said the interval doubles. Current exporterhelper retry settings use a configurable multiplier with a default of 1.5, so the wording now says the interval increases up to `max_interval`.
- The queue sizing formula incorrectly tied queue capacity directly to `batch_timeout_seconds`. Replaced it with a batches-per-second based formula, which better matches the documented default `requests` queue sizer.
- The persistent queue section said capacity is limited by disk space, not memory. Clarified that it is constrained by both `queue_size` and disk space.
- The queue fullness alert used a hardcoded denominator. Replaced it with `otelcol_exporter_queue_capacity`, the documented capacity metric.
- Added `otelcol_exporter_queue_capacity` to the monitoring metrics list because it is needed to calculate queue utilization correctly.

## Review Notes
The configuration snippets use current Collector field names (`sending_queue`, `num_consumers`, `queue_size`, `storage`, and `retry_on_failure`) and valid duration values. Prometheus installations that customize the Collector's internal telemetry reader may expose counter suffixes differently; the post uses the OTLP-format metric names documented by OpenTelemetry.
