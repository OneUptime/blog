# Validation Summary: How to Build a Failover Pipeline That Routes OpenTelemetry Data to a Secondary

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib
- OpenTelemetry Collector failover connector
- OTLP exporter
- Collector sending queues and retry settings
- File storage extension for persistent queues
- Linux `iptables` and `journalctl`
- Python health-check scripting

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector resiliency documentation: https://opentelemetry.io/docs/collector/resiliency/
- OpenTelemetry Collector connectors documentation: https://opentelemetry.io/docs/collector/components/connector/
- OpenTelemetry Collector Contrib failover connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/failoverconnector/README.md
- OpenTelemetry Collector OTLP exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md
- OpenTelemetry Collector exporter helper README for retry, sending queue, and persistent queue settings: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector Contrib file storage extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/storage/filestorage/README.md
- OpenTelemetry Collector issue documenting SIGHUP reload support: https://github.com/open-telemetry/opentelemetry-collector/issues/10264

## Issues Found
- The failover connector example listed exporter component IDs in `priority_levels`. The official failover connector configuration expects downstream pipeline IDs. Updated the trace and metric examples to use `traces/primary`, `traces/secondary`, `metrics/primary`, and `metrics/secondary`.
- The failover connector comments described export success rates and failure thresholds, but the documented behavior is priority-level health based on downstream pipeline failures. Updated the comments and surrounding wording to match the connector model.
- The failover connector example used `retry_gap` and `max_retries`, which are deprecated in the current failover connector README. Removed those fields and kept `retry_interval`.
- The dual-exporter snippet referenced `file_storage/primary_queue` from `sending_queue.storage` without defining and enabling that extension. Added the `file_storage/primary_queue` extension and enabled it in `service.extensions`.
- The fan-out section claimed zero data loss during failover. That was too absolute because queues can fill, retry windows can expire, disks can fail, and the collector itself can fail. Reworded it to say fan-out reduces failover data loss risk when both exports are succeeding.
- The Python health checker claimed to wait for three consecutive failures, but the counter was not reset after a healthy check while still in primary mode. Added a healthy-primary branch that resets `consecutive_failures`.

## Review Notes
- The post is technically relevant and contains concrete OpenTelemetry Collector configuration, shell commands, and Python code.
- The failover connector is currently documented as alpha for traces, metrics, and logs in OpenTelemetry Collector Contrib, so production use should be tested carefully.
