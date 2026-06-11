# Validation Summary: How to Create Istio Telemetry API

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Telemetry API
- IstioOperator and MeshConfig
- Kubernetes custom resources
- Prometheus metrics
- Jaeger and Zipkin tracing providers
- OpenTelemetry Collector
- Envoy access logging
- CEL expressions
- istioctl and kubectl

## Sources Consulted
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Telemetry API task guide: https://istio.io/latest/docs/tasks/observability/telemetry/
- Istio metrics customization with Telemetry API: https://istio.io/latest/docs/tasks/observability/metrics/telemetry-api/
- Istio tracing with Telemetry API: https://istio.io/latest/docs/tasks/observability/distributed-tracing/telemetry-api/
- Istio access logs with Telemetry API: https://istio.io/latest/docs/tasks/observability/logs/telemetry-api/
- Istio MeshConfig / extension provider reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio v1 APIs announcement: https://istio.io/latest/blog/2024/v1-apis/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy attributes reference for CEL-accessible request and response attributes: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/advanced/attributes

## Issues Found
- Updated Telemetry resources from `telemetry.istio.io/v1alpha1` to the current `telemetry.istio.io/v1` API, reflecting Istio's API promotion in 1.22. Added a caveat that `accessLogging.filter` remains an alpha field even though the shared CRD schema accepts it.
- Corrected metric `tagOverrides.value` entries that used plain YAML strings such as `value: "production"`. These fields are CEL expressions, so literal string values must be quoted as CEL string literals, for example `value: '"production"'`.
- Replaced `response.duration > 1000` and `response.duration > 2000` access-log filters with `request.duration > duration('1s')` and `request.duration > duration('2s')`. Envoy exposes total request latency as the duration-typed `request.duration` attribute.
- Reworked the "Multiple Tracing Providers" example. Istio currently supports only one provider in a given tracing rule, so the post now recommends sending traces to an OpenTelemetry Collector and fanning out from there when multiple backends are needed.
- Corrected comments that described tracing custom tags as pod labels. The shown configuration reads environment variables visible to the proxy, not Kubernetes pod labels directly.

## Review Notes
- The post is technically relevant and contains working Istio/Kubernetes configuration examples after correction.
- Access log filtering is useful but still alpha in Istio's Telemetry API. Clusters enforcing Istio stable validation may reject configurations using `accessLogging.filter`.
- I could not run `istioctl analyze` against a live cluster in this environment, so validation was performed against official Istio and Envoy documentation rather than by applying the manifests.
