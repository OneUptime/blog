# Validation Summary: How to Implement Service Mesh Pattern with Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar architecture, service invocation, mTLS, resiliency, access control)
- Go (Dapr Go SDK for service invocation)
- Kubernetes (annotations, Configuration and Resiliency resources)
- OpenTelemetry / Zipkin (distributed tracing)
- Istio / Linkerd (comparison only)
- Envoy (comparison only)

## Sources Consulted
- Dapr Go SDK client interface — https://github.com/dapr/go-sdk/blob/main/client/client.go
- Dapr CLI mTLS reference — https://docs.dapr.io/reference/cli/dapr-mtls/
- Dapr Configuration spec — https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr tracing setup — https://docs.dapr.io/operations/observability/tracing/setup-tracing/
- Dapr OpenTelemetry Collector integration — https://docs.dapr.io/operations/observability/tracing/otel-collector/open-telemetry-collector/
- Dapr Resiliency spec — https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr access control configuration — https://docs.dapr.io/operations/configuration/configuration-overview/
- Envoy proxy documentation — https://www.envoyproxy.io/docs/envoy/latest/intro/what_is_envoy
- Dapr exporter deprecation (issue #2337) — https://github.com/dapr/dapr/issues/2337

## Issues Found

1. **Envoy incorrectly described as "kernel-level proxy"** (Overview section): Envoy is a user-space L7 proxy, not a kernel-level proxy. Kernel-level proxies are eBPF/XDP-based solutions like Cilium. Changed "kernel-level proxies like Envoy" to "infrastructure-level sidecar proxies like Envoy."

2. **OpenTelemetry Collector tracing configured as a Component resource with `type: exporter.zipkin`** (Distributed Tracing section): The `exporter.zipkin` component type was deprecated and removed in Dapr v1.0.0-rc.2 (February 2021). Tracing configuration was moved into Dapr core and is now configured via the `Configuration` resource using the `spec.tracing.otel` block. Replaced the incorrect `kind: Component` YAML with a correct `kind: Configuration` resource using `spec.tracing.otel` with gRPC protocol on port 4317.

## Review Notes
- The retry policy named `retryForever` has `maxRetries: 3`, which is contradictory naming. The Dapr docs use `retryForever` with `maxRetries: -1` (infinite). The code would work correctly with 3 retries, but the name is misleading. Not changed since it is a user-chosen name and technically valid.
- The retry policy omits the `duration` field (initial backoff interval for exponential retries). Dapr will use a default, so this is not an error, but including it (e.g., `duration: 1s`) would be best practice for clarity.
- The Go SDK `InvokeMethod` signature was verified as correct: `InvokeMethod(ctx context.Context, appID, methodName, verb string) ([]byte, error)`.
- The mTLS Configuration, access control policies, and annotation formats were all verified as correct against official Dapr documentation.
