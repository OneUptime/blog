# Validation Summary: How to Build Custom Istio Telemetry Pipelines Using the Telemetry API v2

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Telemetry API
- Kubernetes
- Envoy access logging
- Prometheus metrics
- OpenTelemetry tracing and access logs
- CEL expressions
- IstioOperator mesh configuration

## Sources Consulted
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Telemetry API overview: https://istio.io/latest/docs/tasks/observability/telemetry/
- Istio metrics customization with Telemetry API: https://istio.io/latest/docs/tasks/observability/metrics/telemetry-api/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio access logs with Telemetry API: https://istio.io/latest/docs/tasks/observability/logs/telemetry-api/
- Istio Envoy access logs: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio OpenTelemetry tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/opentelemetry/
- Istio OpenTelemetry access logging task: https://istio.io/latest/docs/tasks/observability/logs/otel-provider/
- Istio MeshConfig / extension provider reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Envoy CEL access log expression filter reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/access_loggers/filters/cel/v3/cel.proto
- Envoy attributes reference: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/advanced/attributes

## Issues Found
- Updated stable Telemetry examples from `telemetry.istio.io/v1alpha1` to `telemetry.istio.io/v1` where they do not depend on alpha-only fields. Istio promoted Telemetry to `v1` in Istio 1.22.
- Kept CEL access log filter examples on `telemetry.istio.io/v1alpha1` and added a note because `accessLogging.filter` remains an alpha Telemetry field.
- Corrected the mesh-wide configuration explanation. Mesh-wide Telemetry behavior is configured by a selector-less `Telemetry` resource in the root configuration namespace, while `IstioOperator`/`MeshConfig` defines providers.
- Replaced the invalid `accessLogging.format` field under `Telemetry` with a valid `envoyFileAccessLog` extension provider that defines `logFormat.labels`, then selected that provider from a workload `Telemetry` resource.
- Corrected tracing provider configuration from a Jaeger-named OpenTelemetry provider on Zipkin port `9411` to an OpenTelemetry tracing provider on OTLP/gRPC port `4317`, with `enableTracing: true`.
- Reworked the multi-provider example. Istio Telemetry does not define an OpenTelemetry metrics provider for Prometheus-style metrics, so the example now sends access logs to both the built-in Envoy provider and an OpenTelemetry ALS provider.
- Fixed the slow-request CEL expression from nonexistent/numeric `response.duration > 1000` to Envoy's duration-typed `request.duration > duration('1s')`.
- Updated the prerequisite version to Istio 1.22 or later for the stable `telemetry.istio.io/v1` API.

## Review Notes
The post still uses "Telemetry API v2" wording in the title and introduction. Istio documentation generally calls the configuration resource the "Telemetry API" and refers to in-proxy telemetry as "Telemetry v2"; the content is technically valid after the fixes because it is about the Envoy-native telemetry implementation.
