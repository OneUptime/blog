# Validation Summary: How to Monitor Dapr Application Startup Time

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar runtime, component model)
- Prometheus (metrics scraping, PromQL)
- Zipkin (distributed tracing)
- Kubernetes (pods, readiness probes, kubectl)
- Redis (as example state store component)

## Sources Consulted
- Dapr Configuration Schema: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr Metrics Overview: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr Component Schema: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr Health API Reference: https://docs.dapr.io/reference/api/health_api/
- Dapr Zipkin Tracing Setup: https://docs.dapr.io/operations/observability/tracing/zipkin/
- Dapr Logs Troubleshooting: https://docs.dapr.io/operations/troubleshooting/logs-troubleshooting/
- Dapr Diagnostics Source (GitHub): https://github.com/dapr/dapr/blob/master/pkg/diagnostics/service_monitoring.go
- Dapr Tracing Source (GitHub): https://github.com/dapr/dapr/blob/master/pkg/diagnostics/tracing.go

## Issues Found

1. **`spec.metric` → `spec.metrics` (plural)**: The Dapr Configuration CRD uses `spec.metrics.enabled`, not `spec.metric.enabled`. Fixed the YAML snippet.

2. **`dapr_runtime_init_total` metric does not exist**: This Prometheus metric is not exposed by Dapr. Replaced with `dapr_runtime_component_init_total`, which counts the number of successfully initialized components.

3. **`dapr_component_init_total{success="true"}` metric does not exist**: The correct metric name is `dapr_runtime_component_init_fail_total` for tracking initialization failures. Dapr uses separate counters for success and failure rather than a `success` label. Replaced the PromQL query accordingly.

4. **`dapr.runtime/init` Zipkin spans do not exist**: Dapr does not create trace spans during sidecar initialization. Tracing instruments API calls (service invocation, pub/sub, bindings) after startup, not the boot sequence. Corrected the paragraph to accurately describe what Zipkin tracing covers.

5. **Default `initTimeout` stated as 30s, actually 5s**: The Dapr documentation and source code confirm the default component init timeout is 5 seconds, not 30 seconds. Corrected the description.

## Review Notes
- The Zipkin tracing section is still useful for post-startup diagnostics but the original framing suggested it could trace the initialization sequence, which is misleading. The corrected text clarifies the scope of Dapr tracing.
- The log format shown in the example is representative but may vary slightly between Dapr versions; actual log messages may differ in wording.
- The Prometheus annotations approach shown is standard but users on newer Prometheus Operator setups may prefer ServiceMonitor/PodMonitor CRDs instead.
