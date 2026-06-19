# Validation Summary: How to Configure gRPC Service Mesh Integration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- gRPC
- Kubernetes
- Istio
- Linkerd
- Service mesh mTLS
- Load balancing
- Traffic management
- OpenTelemetry
- Go
- Python

## Sources Consulted
- Istio Protocol Selection: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio v1 API announcement: https://istio.io/latest/blog/2024/v1-apis/
- Linkerd ServiceProfile reference: https://linkerd.io/2-edge/reference/service-profiles/
- Linkerd AuthorizationPolicy reference: https://linkerd.io/2-edge/reference/authorization-policy/
- Linkerd retries reference: https://linkerd.io/2-edge/reference/retries/
- Kubernetes liveness, readiness, and startup probes: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- grpc-go package documentation: https://pkg.go.dev/google.golang.org/grpc
- grpc-go insecure credentials package documentation: https://pkg.go.dev/google.golang.org/grpc/credentials/insecure
- OpenTelemetry Go otelgrpc package documentation: https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc
- gRPC Python API documentation: https://grpc.github.io/grpc/python/grpc.html
- OpenTelemetry Python gRPC instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/grpc/grpc.html

## Issues Found
- Istio configuration examples used older `v1beta1` and `v1alpha1` API versions. Updated Istio `DestinationRule`, `VirtualService`, `Gateway`, `PeerAuthentication`, and `Telemetry` snippets to the current `v1` API versions documented by Istio.
- The Go gRPC client examples used deprecated `grpc.Dial` and `grpc.WithInsecure()`. Updated them to `grpc.NewClient` with `grpc.WithTransportCredentials(insecure.NewCredentials())`.
- The Go OpenTelemetry example used deprecated otelgrpc client interceptors. Updated it to use `grpc.WithStatsHandler(otelgrpc.NewClientHandler())`, which is the current otelgrpc recommendation.
- The Go tracing example imported `log` but did not use it, which would cause a compile error. Removed the unused import.
- The Python interceptor example referenced `_ClientCallDetails` without defining it. Added the standard namedtuple-based helper class implementing `grpc.ClientCallDetails`.
- The Python interceptor example assigned the current span context to an unused variable and imported `trace` only for that assignment. Removed the unused assignment and import.
- The Kubernetes gRPC probe comment said Kubernetes 1.24+ without noting feature maturity. Updated it to say gRPC probes are stable in Kubernetes 1.27+ and beta in 1.24+.
- The HTTP/1.1 comparison diagram stated "one request per connection", which is imprecise for persistent HTTP/1.1 connections. Changed it to "one in-flight request per connection" and "connection-level load balancing works."

## Review Notes
- Linkerd ServiceProfiles are still supported, but the current Linkerd documentation says they have been supplanted by Gateway API types as of Linkerd 2.16 and will not receive further feature development.
- The Linkerd `Server`, `AuthorizationPolicy`, and `MeshTLSAuthentication` API versions in the post match the current Linkerd reference examples.
- The SMI `TrafficSplit` example remains plausible for Linkerd canary routing, but Gateway API routes are the more current direction for newer Linkerd deployments.
