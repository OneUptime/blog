# Validation Summary: How to Avoid the Anti-Pattern of Running the OpenTelemetry Collector Without

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector contrib distribution
- Docker Compose
- Kubernetes Deployments and Services
- Prometheus metrics and alerting

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector resiliency documentation: https://opentelemetry.io/docs/collector/resiliency/
- OpenTelemetry memory limiter processor documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/memorylimiterprocessor
- OpenTelemetry Collector releases: https://github.com/open-telemetry/opentelemetry-collector/releases
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Kubernetes resource management documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/

## Issues Found
- The Kubernetes Deployment snippets were incomplete for `apps/v1` because they did not include a required `spec.selector` or matching pod template labels. Added matching `app: otel-collector` selectors and labels.
- The Collector pipeline example referenced the `otlp` receiver and `batch` processor without defining them. Added an OTLP receiver with gRPC and HTTP protocols and added the `batch` processor declaration.
- The examples pinned `otel/opentelemetry-collector-contrib:0.96.0`, which is outdated for a 2026 production guide. Updated the image examples to `0.153.0`, the current release checked during validation.
- The internal telemetry example used `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. Replaced it with the current Prometheus pull reader configuration.
- The monitoring section used misleading or outdated metric names. Replaced the cumulative allocation metric with `otelcol_process_memory_rss`, added the current Collector CPU metric name, and updated the memory alert expression accordingly.
- The horizontal scaling Deployment snippet omitted the container image and required selector/template labels. Added the missing fields so the example is a valid Deployment shape.

## Review Notes
- The Collector config example was validated with `otel/opentelemetry-collector-contrib:0.153.0` using `otelcol-contrib validate`.
- Local Kubernetes validation tools such as `kubectl`, `kubeconform`, and `kubeval` were not installed, so Kubernetes manifests were reviewed against the official Kubernetes API requirements rather than validated with a local schema tool.
- Official memory limiter guidance also recommends setting `GOMEMLIMIT` alongside the `memory_limiter` processor. The post remains technically accurate without that addition, but it would be a useful future enhancement for a deeper production hardening guide.
