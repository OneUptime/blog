# Validation Summary: How to Configure Istio Gateway for gRPC Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Gateway and VirtualService
- Istio protocol selection
- Kubernetes Service and TLS Secret
- gRPC and HTTP/2
- gRPC-Web
- Envoy HTTP filters
- grpcurl

## Sources Consulted
- Istio Protocol Selection: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio Gateway API reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService API reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Secure Gateways task: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio EnvoyFilter API reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes kubectl create secret tls reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- Envoy gRPC-Web filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/grpc_web_filter
- Envoy gRPC protocol overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/other_protocols/grpc.html
- Envoy router retry documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter#x-envoy-retry-grpc-on
- gRPC HTTP/2 protocol documentation: https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-HTTP2.md
- gRPC-Web protocol documentation: https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-WEB.md
- grpcurl project documentation: https://github.com/fullstorydev/grpcurl

## Issues Found
- The port naming section stated that incorrectly named ports are always treated as TCP. Istio can automatically detect HTTP and HTTP/2 in some cases, while gateways need explicit backend protocol selection to forward HTTP/2 upstream. Updated the wording to match Istio's documented sidecar and gateway behavior.
- The gRPC-Web section said Istio enables Envoy's gRPC-Web filter by default. Envoy provides the filter, but Istio requires it to be configured, commonly with an EnvoyFilter. Added a gateway EnvoyFilter example and changed the surrounding text accordingly.
- The gRPC-Web CORS example omitted response headers that browser clients often need to read gRPC-Web status and message metadata. Added `exposeHeaders` for `grpc-status`, `grpc-message`, and `grpc-status-details-bin`, and added `grpc-timeout` to allowed request headers.

## Review Notes
The remaining Gateway, VirtualService, retry, timeout, TLS secret, h2c, and grpcurl examples are consistent with current Istio, Kubernetes, Envoy, and gRPC documentation. The examples assume the Kubernetes Service port is explicitly named `grpc`, which is important because Istio gateways otherwise forward HTTP requests upstream as HTTP/1.1 by default.
