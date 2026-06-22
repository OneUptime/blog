# Validation Summary: How to Fix 'Collector Pipeline Blocked' Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OTLP receiver and exporter
- Collector processors: batch, memory_limiter, filter, probabilistic_sampler, resourcedetection
- Collector internal telemetry and Prometheus metrics
- Kubernetes Deployment and HorizontalPodAutoscaler
- Docker and kubectl resource inspection commands

## Sources Consulted
- OpenTelemetry Collector resiliency documentation: https://opentelemetry.io/docs/collector/resiliency/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector exporter helper README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector memory limiter processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md
- OpenTelemetry Collector batch processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md
- OpenTelemetry Collector OTLP receiver README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector probabilistic sampler processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/probabilisticsamplerprocessor/README.md
- OpenTelemetry Collector logging exporter removal announcement: https://github.com/open-telemetry/opentelemetry-collector/issues/11337
- OpenTelemetry Collector zPages extension README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/extension/zpagesextension/README.md
- Kubernetes HorizontalPodAutoscaler walkthrough: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/
- Docker CLI stats reference: https://docs.docker.com/reference/cli/docker/container/stats/
- Kubernetes kubectl top reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/

## Issues Found
- Replaced the deprecated/removed "Logging Exporter" reference with "Debug Exporter" because the logging exporter was removed from officially released Collector distributions starting in v0.111.0.
- Corrected the "no retry or queue" OTLP exporter example. Modern exporter helper defaults enable retry and sending queue, so the example now explicitly disables both to demonstrate the problematic configuration.
- Replaced `service.telemetry.metrics.address` examples with the current `service.telemetry.metrics.readers` Prometheus configuration. The `address` setting is ignored as of Collector v0.123.0.
- Added `without_type_suffix: true` and `without_units: true` to the manually configured Prometheus internal metrics reader so the metric names used later in the post match the exposed names.
- Corrected memory limiter examples where `spike_limit_mib: 1800` was greater than `limit_mib: 1600`. The memory limiter requires the spike limit to be less than the hard limit, and the fixed memory settings take precedence over percentage settings.
- Changed the zPages comment from "Prometheus metrics" to "Live diagnostic pages" because zPages is a diagnostics extension, not the Prometheus internal metrics endpoint.
- Updated the data-loss alert to use `otelcol_exporter_enqueue_failed_spans`, since send failures do not inherently mean data was dropped when retries are configured.
- Updated the high-memory alert from the non-Collector metric `process_resident_memory_bytes` to the current Collector internal metric `otelcol_process_memory_rss`.
- Updated "queued retry" wording to "sending queue" to match current Collector terminology.

## Review Notes
The post is now technically valid for current OpenTelemetry Collector behavior. Internal Collector telemetry is version-sensitive, so future reviews should re-check metric names and `service.telemetry` schema changes against the official internal telemetry page.
