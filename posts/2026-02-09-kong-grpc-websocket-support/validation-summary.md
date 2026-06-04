# Validation Summary: How to Configure Kong Ingress Controller with gRPC and WebSocket Support

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes Ingress and Service resources
- Kong Ingress Controller
- Kong Gateway
- gRPC and gRPC over TLS
- WebSocket and WebSocket over TLS
- KongPlugin JWT authentication
- KongUpstreamPolicy health checks
- grpcurl, wscat, and ghz

## Sources Consulted
- Kong Ingress Controller annotation reference: https://developer.konghq.com/kubernetes-ingress-controller/reference/annotations/
- Kong Ingress Controller gRPC routing guide: https://developer.konghq.com/kubernetes-ingress-controller/routing/grpc/
- Kong Ingress Controller service health checks guide: https://developer.konghq.com/kubernetes-ingress-controller/service-health-checks/
- Kong Ingress Controller custom resource reference: https://developer.konghq.com/kubernetes-ingress-controller/reference/custom-resources/
- Kong Gateway proxy reference for WebSocket and gRPC routing: https://docs.konghq.com/gateway/latest/how-kong-works/routing-traffic/
- Kong Gateway health checks and circuit breakers reference: https://developer.konghq.com/gateway/traffic-control/health-checks-circuit-breakers/
- Kong JWT plugin configuration reference: https://developer.konghq.com/plugins/jwt/reference/
- grpcurl official repository usage notes: https://github.com/fullstorydev/grpcurl

## Issues Found
- The mixed HTTP/gRPC example routed gRPC traffic on `/grpc`, but gRPC request paths normally use the fully-qualified service and method path, such as `/package.Service/Method`. Changed the gRPC Ingress path to `/` so it can match normal gRPC calls on the same host while remaining separated by the `grpc` route protocol.
- The health check example used `KongIngress` with `konghq.com/override` and fields such as `grpc_service`, `grpc_status`, `http_path`, and `http_failures`. Current KIC documentation recommends attaching service health checks with `KongUpstreamPolicy`, and the CRD uses camelCase fields such as `tcpFailures` and `timeouts`. Replaced the snippet with a valid `configuration.konghq.com/v1beta1` `KongUpstreamPolicy` and `konghq.com/upstream-policy` annotation.
- The health check section claimed to configure both gRPC and WebSocket health checking, but only provided a gRPC health check. Narrowed the wording to gRPC services.
- The gRPC test commands used `grpcurl -plaintext` against port `443`. `-plaintext` is for non-TLS HTTP/2 connections, while the article's public gRPC examples use TLS on 443. Changed the examples to `grpcurl -insecure ...:443`.

## Review Notes
The post is now technically valid for current Kong Ingress Controller patterns. In a future revision, the article could mention that plaintext gRPC on Kong's HTTP listener requires HTTP/2 cleartext proxy listener configuration, while the simpler default path is gRPC over TLS on port 443.
