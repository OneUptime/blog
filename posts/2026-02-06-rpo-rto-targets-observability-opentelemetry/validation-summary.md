# Validation Summary: How to Use RPO and RTO Targets

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector exporter retry and sending queue configuration
- OpenTelemetry Collector file_storage extension
- OpenTelemetry Collector health_check extension
- Prometheus scrape configuration and alerting rules
- Kubernetes Deployments and probes
- Disaster recovery RPO and RTO concepts

## Sources Consulted
- OpenTelemetry Collector resiliency documentation: https://opentelemetry.io/docs/collector/resiliency/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector extensions documentation: https://opentelemetry.io/docs/collector/components/extension/
- OpenTelemetry Collector file_storage extension documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/v0.153.0/extension/storage/filestorage
- OpenTelemetry Collector health_check extension documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/v0.153.0/extension/healthcheckextension
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The Collector persistent queue example defined `file_storage/queue` but did not enable it under `service.extensions`. Added `service.extensions: [file_storage/queue]` and clarified that the extension must be enabled for queued data to persist.
- The Prometheus scrape example referenced `otelcol_processor_dropped_metric_points`, which is not listed in current Collector internal telemetry metrics. Replaced it with `otelcol_exporter_enqueue_failed_metric_points` and added `otelcol_exporter_queue_capacity`.
- The post described `otelcol_exporter_send_failed_metric_points` as dropped data. Current OpenTelemetry documentation says send failures indicate export problems and do not inherently imply data loss while retries are active. Updated the explanation and changed the critical alert to use `otelcol_exporter_enqueue_failed_metric_points`.
- The Kubernetes `apps/v1` Deployment example omitted the required `.spec.selector` and matching `.spec.template.metadata.labels`. Added both fields so the manifest is valid.
- The liveness probe example assumed the Collector health endpoint existed. Added a note that the Collector configuration must enable the `health_check` extension on port 13133.

## Review Notes
The sample uses `otel/opentelemetry-collector-contrib:latest`, which can work for a short example but is not ideal for production because image contents change over time. Pinning a tested Collector version would make the example more reproducible.
