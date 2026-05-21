# Validation Summary: How to Route Traffic Based on HTTP Headers in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- Istio VirtualService
- Istio DestinationRule
- HTTP headers
- Envoy sidecar routing
- istioctl
- curl
- jq
- Python requests
- gRPC over HTTP/2

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://preliminary.istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio debugging Envoy and Istiod with proxy-config: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio istioctl command reference: https://preliminary.istio.io/latest/docs/reference/commands/istioctl/
- Istio distributed tracing overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Istio distributed tracing FAQ: https://istio.io/latest/about/faq/distributed-tracing/
- gRPC over HTTP/2 protocol reference: https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-HTTP2.md
- GitHub author profile: https://github.com/nawazdhandala

## Issues Found
- The post stated that proxy-level header checks "do not add measurable latency." This was too absolute, so it was changed to say they typically add very little overhead compared with application-level routing.
- The tracing/header propagation list omitted the currently recommended W3C `traceparent` and `tracestate` headers from Istio's tracing documentation. These were added to the list.
- The gRPC content-type example used `exact: "application/grpc"`. The gRPC HTTP/2 protocol allows content types that begin with `application/grpc`, including suffixes such as `application/grpc+proto`, so the example was changed to `prefix: "application/grpc"`.
- The debugging examples used `deploy/my-service` for `istioctl proxy-config routes`. Istio's command reference documents `deployment/<deployment-name>` for deployment targets, so the examples were updated to `deployment/my-service`.
- The common-problems section said header names in Istio matches are case-insensitive. Istio's VirtualService reference says header keys in match configuration must be lowercase and use hyphens, while exact and prefix header value matches are case-sensitive. The note was corrected.

## Review Notes
The main VirtualService and DestinationRule examples use current Istio `networking.istio.io/v1` APIs. The AND and OR match semantics, ordered route behavior, exact/prefix/regex header matching, subset routing, and `istioctl analyze -n` usage are consistent with the official Istio documentation.
