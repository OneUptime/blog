# Validation Summary: How to Understand Istio's Telemetry Pipeline

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Envoy sidecars
- Prometheus metrics
- Distributed tracing
- OpenTelemetry
- Zipkin
- Envoy access logs
- Kubernetes kubectl commands

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Prometheus integration: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio distributed tracing overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Istio distributed tracing FAQ: https://istio.io/latest/about/faq/distributed-tracing/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio configure tracing with Telemetry API: https://istio.io/latest/docs/tasks/observability/distributed-tracing/telemetry-api/
- Istio configure tracing using MeshConfig and pod annotations: https://istio.io/latest/docs/tasks/observability/distributed-tracing/mesh-and-proxy-config/
- Istio OpenTelemetry tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/opentelemetry/
- Istio Envoy access logs task: https://istio.io/latest/docs/tasks/observability/logs/access-log/

## Issues Found
- The metrics scraping section stated that each sidecar exposes metrics on port 15020 without qualifying metrics merging. Updated it to clarify that `:15020/stats/prometheus` is the default metrics merging endpoint.
- The Prometheus scrape interval was described as typically 15 seconds. Updated the text to clarify that the interval depends on Prometheus configuration.
- The trace sampling example used `IstioOperator` `meshConfig.defaultConfig.tracing.sampling` as the primary approach. Updated it to use the current `telemetry.istio.io/v1` Telemetry API with `randomSamplingPercentage`.
- The trace exporter examples mixed backend definition and sampling under legacy tracing config. Updated them to define providers with `meshConfig.enableTracing` and `extensionProviders`, then enable provider selection and sampling with a Telemetry resource.
- The Telemetry API example used `telemetry.istio.io/v1alpha1`. Updated it to `telemetry.istio.io/v1`, which is the current API version in Istio 1.30.

## Review Notes
The MeshConfig and `proxy.istio.io/config` tracing snippets are still documented by Istio for some global and per-pod trace settings, but Istio documentation encourages users to transition tracing configuration to the Telemetry API where applicable.
