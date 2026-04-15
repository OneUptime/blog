# Validation Summary: How to Implement Ambassador Pattern with Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Dapr Resiliency policies (retries, circuit breakers, timeouts)
- Dapr service invocation and protocol translation
- Dapr name resolution (Kubernetes)
- Kubernetes (kubectl, annotations, deployments)
- Go programming language
- gRPC / HTTP protocol translation

## Sources Consulted
- Dapr Resiliency documentation: https://docs.dapr.io/operations/resiliency/
- Dapr Go SDK client interface: https://github.com/dapr/go-sdk
- Dapr service invocation and gRPC proxying: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/
- Dapr app protocol annotation: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr name resolution overview: https://docs.dapr.io/reference/components-reference/supported-name-resolution/
- Dapr Configuration resource spec: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr metrics and observability: https://docs.dapr.io/operations/observability/metrics/

## Issues Found

1. **Missing `fmt` import in Go code**: The Go code example used `fmt.Sprintf` but did not include `"fmt"` in the import block, which would cause a compilation error. Added `"fmt"` to the imports.

2. **Fabricated `middleware.http.grpc` component**: The Protocol Translation section included a YAML snippet defining a `Component` of type `middleware.http.grpc`. This is not a real Dapr middleware component type. Dapr handles HTTP-to-gRPC protocol translation automatically when the target service has the `dapr.io/app-protocol: "grpc"` annotation — no middleware component is needed. Removed the fabricated component YAML and updated the explanatory text to reflect the correct approach.

3. **Name resolution configured as `Component` instead of `Configuration`**: The Connection Pooling section showed name resolution configured as a `kind: Component` resource with `type: nameresolution.kubernetes`. In Dapr, name resolution is configured through the `kind: Configuration` resource under `spec.nameResolution`, not as a standalone Component. Corrected the YAML to use `kind: Configuration` with the proper spec structure.

4. **Incorrect metrics port-forward target**: The Observing Ambassador Behavior section used `kubectl port-forward svc/dapr-metrics 9090:9090`. Dapr does not create a `dapr-metrics` service by default. Metrics are exposed on port 9090 of the Dapr sidecar container within each pod. Changed the command to `kubectl port-forward deploy/order-service 9090:9090` to target the correct resource.

## Review Notes
- The Resiliency YAML configuration is accurate and well-structured, correctly demonstrating timeout, retry, and circuit breaker policies with per-target-app scoping.
- The Go code pattern of using `InvokeMethodWithContent` for service invocation is correct and idiomatic for the Dapr Go SDK.
- The conceptual framing of Dapr's sidecar as an ambassador pattern implementation is accurate and well-explained.
- The `dapr_resiliency_count` metric name is plausible but users should consult the Dapr metrics reference for the exact metric names available in their version.
