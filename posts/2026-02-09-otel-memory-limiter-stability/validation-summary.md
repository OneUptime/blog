# Validation Summary: How to configure OpenTelemetry Collector memory limiter for stability

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector memory_limiter processor
- OpenTelemetry Collector OTLP exporter
- OpenTelemetry Collector internal telemetry
- Go runtime GOMEMLIMIT
- Kubernetes Deployment manifests
- Python
- YAML

## Sources Consulted
- OpenTelemetry Collector memory limiter processor documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md
- OpenTelemetry Collector memory limiter generated telemetry documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/documentation.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector exporter helper retry and sending queue documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector OTLP exporter documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md
- Go runtime documentation for GOMEMLIMIT: https://go.dev/pkg/runtime/

## Issues Found
- The post described `limit_mib` as the soft limit and treated `spike_limit_mib` as additional headroom above it. Updated the explanation, YAML comments, and Python calculation so `limit_mib` is the hard limit and the soft limit is `limit_mib - spike_limit_mib`, matching the memory limiter documentation.
- The Kubernetes Deployment example omitted the required `spec.selector` and matching pod template labels for an `apps/v1` Deployment. Added `selector.matchLabels` and `template.metadata.labels`.
- The GOMEMLIMIT example said 768 MiB was 80% of a 1 GiB container limit. Updated it to 819 MiB and corrected the explanation so it describes GOMEMLIMIT as a soft runtime memory limit rather than saying it reduces garbage collection frequency.
- The internal telemetry example used `service.telemetry.metrics.address`, which is ignored in Collector v0.123.0 and later. Replaced it with the current `readers.pull.exporter.prometheus.host` and `port` configuration.
- The monitoring metric names included deprecated processor refused metrics and an incorrect process memory metric name. Updated the list to current receiver refusal and process memory metrics from the internal telemetry documentation.
- The retry section implied exporter retries handle memory limiter refusals. Clarified that exporter retries and queues handle downstream export failures, while memory limiter refusals require the receiver or preceding component to retry.
- The multi-pipeline section implied separate memory limiter instances partition total memory by telemetry type. Updated the wording to say separate limits set different process memory refusal thresholds.

## Review Notes
The examples are version-sensitive because Collector internal telemetry configuration is still evolving. Pinning a Collector image tag instead of using `latest` would improve reproducibility in a future editorial pass, but `latest` is not a syntax or API correctness issue.
