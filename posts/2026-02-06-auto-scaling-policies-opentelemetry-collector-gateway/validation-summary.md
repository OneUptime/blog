# Validation Summary: How to Build Auto-Scaling Policies for OpenTelemetry Collector Gateway Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector internal telemetry
- OpenTelemetry Collector memory_limiter processor
- OpenTelemetry Collector OTLP/HTTP exporter
- Kubernetes Deployment
- Kubernetes HorizontalPodAutoscaler autoscaling/v2
- Prometheus and PromQL
- Prometheus Adapter custom metrics

## Sources Consulted
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector scaling documentation: https://opentelemetry.io/docs/collector/scaling/
- OpenTelemetry Collector v0.153.0 memory_limiter processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/v0.153.0/processor/memorylimiterprocessor/README.md
- OpenTelemetry Collector v0.96.0 telemetry configuration source, for version comparison: https://github.com/open-telemetry/opentelemetry-collector/blob/v0.96.0/service/telemetry/config.go
- OpenTelemetry Collector v0.96.0 OTLP/HTTP exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/v0.96.0/exporter/otlphttpexporter/README.md
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes autoscaling/v2 HorizontalPodAutoscaler API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Prometheus Adapter configuration documentation: https://github.com/kubernetes-sigs/prometheus-adapter/blob/master/docs/config.md

## Issues Found
- Updated the Collector internal telemetry configuration from `service.telemetry.metrics.address` to the current `readers`/Prometheus pull exporter form. Current Collector documentation says `metrics.address` is ignored as of Collector v0.123.0, so the original example would be misleading with modern Collector versions.
- Updated the Collector image from `otel/opentelemetry-collector-contrib:0.96.0` to `otel/opentelemetry-collector-contrib:0.153.0` so the deployment example matches current documentation and the revised telemetry configuration.
- Fixed the memory limiter example values from `limit_mib: 1024` and `spike_limit_mib: 256` to `limit_mib: 1600` and `spike_limit_mib: 400`, matching the post's later recommendation to set the hard limit around 80% of a 2Gi container limit and the common 20% spike-limit starting point.
- Corrected the `memory_limiter` explanation. The original text described `limit_mib` as a hard ceiling on total Collector memory and said refusal starts when memory hits that limit. The official processor docs define `limit_mib` as the hard heap target, with refusal beginning above the soft limit of `limit_mib - spike_limit_mib`.

## Review Notes
- The revised Collector configuration was validated locally with `otelcol-contrib validate --config` using the official `otelcol-contrib` v0.153.0 Linux amd64 release binary.
- Prometheus may add `_total` suffixes to Collector counter metrics when exposed through its exporter. The post's PromQL uses `_total` for counter metrics and no suffix for queue gauges, which is consistent with the documented Prometheus naming behavior.
- The HPA statement that Kubernetes evaluates multiple metrics and chooses the largest desired replica count is correct. Kubernetes also skips scale-down if a metric fetch/conversion error occurs while other metrics suggest scaling down.
