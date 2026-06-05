# Validation Summary: How to Build a Telemetry Deduplication Pipeline Using the Log Dedup Processor

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib log deduplication processor
- OpenTelemetry Collector attributes, batch, memory limiter, groupbytrace, transform, and filter processors
- OTLP gRPC receiver and exporter configuration
- Kubernetes Deployments and Services
- Collector internal telemetry metrics

## Sources Consulted
- OpenTelemetry Collector Contrib log deduplication processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/logdedupprocessor/README.md
- OpenTelemetry Collector Contrib log deduplication processor config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/logdedupprocessor/config.go
- OpenTelemetry Collector Contrib log deduplication processor generated metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/logdedupprocessor/internal/metadata/generated_status.go
- OpenTelemetry Collector Contrib log deduplication processor telemetry source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/logdedupprocessor/internal/metadata/generated_telemetry.go
- OpenTelemetry Collector Contrib groupbytrace processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/groupbytraceprocessor/README.md
- OpenTelemetry Collector Contrib filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector OTLP gRPC exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md
- OpenTelemetry Collector configuration docs for environment variable substitution: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry docs: https://opentelemetry.io/docs/collector/internal-telemetry/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The post used the deprecated processor type `logdedup`. Updated the collector configuration to use the current `log_dedup` processor type.
- The post described `conditions` as fields used for duplicate identity and used values such as `body` and `severity_text`. Updated the explanation and configuration because `conditions` are OTTL predicates that decide which logs are eligible for aggregation.
- The post used an invalid `exclude_keys` setting. Replaced it with the supported `exclude_fields` setting and escaped `collector.instance` as `attributes.collector\.instance`.
- The post implied a normal load balancer or Kubernetes Service can send the same telemetry to both collectors. Updated the text to require client-side, sidecar, or local-agent fan-out, and clarified that Kubernetes Services load-balance rather than duplicate traffic.
- The Kubernetes section called the Service headless but did not set `clusterIP: None`. Added `clusterIP: None` and clarified that headless Services provide service discovery, not traffic fan-out.
- The trace deduplication example marked all spans from `collector-b` as duplicates and used a transform/filter flow that would drop data incorrectly. Replaced it with a caveat that `groupbytrace` groups spans by trace ID but does not deduplicate spans by itself.
- The monitoring section listed non-existent `otelcol_processor_logdedup_total_logs_in` and `otelcol_processor_logdedup_total_logs_out` metrics. Replaced them with the log dedup processor's `otelcol_dedup_processor_aggregated_logs_bucket` metric and the standard processor accepted log records metric.
- The collector config used `${ONEUPTIME_TOKEN}` for environment substitution. Updated it to the documented `${env:ONEUPTIME_TOKEN}` form.

## Review Notes
The log deduplication processor is currently alpha for logs in the OpenTelemetry Collector Contrib distribution, so production users should pin a collector version instead of using `latest` and should test behavior before relying on it for compliance-sensitive logs.
