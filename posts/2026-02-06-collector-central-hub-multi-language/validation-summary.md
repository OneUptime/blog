# Validation Summary: How to Set Up Collector as a Central Hub for Multi-Language Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Protocol (OTLP)
- OTLP/gRPC and OTLP/HTTP
- OpenTelemetry SDK environment variables
- Collector receivers, processors, exporters, and extensions
- Kubernetes Deployments and Services
- OneUptime OTLP ingestion

## Sources Consulted
- OpenTelemetry Collector documentation: https://opentelemetry.io/docs/collector/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry OTLP exporter configuration: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry OTLP receiver README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- OpenTelemetry OTLP HTTP exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md
- OpenTelemetry batch processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md
- OpenTelemetry memory limiter processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md
- OpenTelemetry transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry zPages extension README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/extension/zpagesextension/README.md
- OpenTelemetry agent-to-gateway deployment pattern: https://opentelemetry.io/docs/collector/deploy/other/agent-to-gateway/
- OpenTelemetry gateway deployment pattern: https://opentelemetry.io/docs/collector/deploy/gateway/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/telemetry/open-telemetry

## Issues Found
- The post used `otlphttp/*` exporter component IDs. The official Collector documentation now marks `otlphttp` as a deprecated alias and recommends `otlp_http`, so the exporter names and pipeline references were updated.
- The health monitoring snippet used `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. It was replaced with the current `service.telemetry.metrics.readers` Prometheus pull exporter syntax.
- The post stated that Java defaults to OTLP/gRPC. Current OpenTelemetry Java agent 2.x defaults to OTLP/HTTP, so the Java comment and receiver explanation were corrected.
- The example Collector version and image tag used `0.96.0`, which is outdated. They were updated to the current official Collector release version available during review, `0.153.0`.
- The Kubernetes Deployment example omitted `spec.template.metadata.labels`, so the selector would not match the pod template. The matching pod template labels were added.
- The scaling section mentioned tail-based sampling behind multiple gateway collectors without warning that all spans for a trace must reach the same Collector instance. A short note was added recommending trace-ID routing with the load-balancing exporter.
- The environment-variable guidance said configuration works identically across all languages. OpenTelemetry documents that environment variable support varies by language, so the wording was narrowed to SDKs and auto-instrumentation that support those variables.

## Review Notes
The remaining examples are intentionally generic. Production OneUptime exports typically also require authentication headers, but that is backend-specific and outside the scope of this central-collector topology guide.
