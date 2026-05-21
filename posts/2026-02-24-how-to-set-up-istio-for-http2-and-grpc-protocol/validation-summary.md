# Validation Summary: How to Set Up Istio for HTTP/2 and gRPC Protocol

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Istio traffic management
- Kubernetes Services, Deployments, and probes
- HTTP/2
- gRPC
- Envoy proxy and access logs

## Sources Consulted
- Istio protocol selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio VirtualService API reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule API reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Gateway API reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes probe documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes gRPC probe beta announcement and GA note: https://kubernetes.io/blog/2022/05/13/grpc-probes-now-in-beta/
- Envoy router retry documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter.html
- Envoy access log response flags documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html
- gRPC status code documentation: https://grpc.io/docs/guides/status-codes/
- gRPC deadline documentation: https://grpc.io/docs/guides/deadlines/

## Issues Found
- The post said Istio applies deadline propagation when it detects HTTP/2 or gRPC. gRPC deadline propagation is a gRPC library behavior, while Istio/Envoy can enforce route and stream timeouts. Changed this to mention HTTP routing, retries, telemetry, and connection-pool settings instead.
- The ingress section said h2c clients should set the gateway protocol to `HTTP2` instead of `GRPC`. Istio documents `grpc` as equivalent to `http2` for protocol selection, so this was changed to `HTTP2` or `GRPC`.
- The health checking section attributed gRPC health checks to Istio. The YAML shown is a Kubernetes native gRPC probe, so the wording now attributes it to Kubernetes.
- The post said native gRPC probes were introduced in Kubernetes 1.24. They entered beta in Kubernetes 1.24 and became stable in Kubernetes 1.27, so the version note was corrected.

## Review Notes
The examples use current `networking.istio.io/v1` APIs and valid Istio fields. The retry conditions, DestinationRule connection pool fields, Gateway protocol values, Envoy response flags, and `istioctl` commands were checked against current official references.
