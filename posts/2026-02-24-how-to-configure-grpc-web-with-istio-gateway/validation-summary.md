# Validation Summary: How to Configure gRPC-Web with Istio Gateway

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Gateway and VirtualService
- Istio EnvoyFilter
- Envoy gRPC-Web HTTP filter
- gRPC-Web JavaScript client
- Kubernetes TLS secrets
- CORS for browser clients

## Sources Consulted
- Istio Secure Gateways documentation: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio VirtualService reference, including CORS policy fields: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Envoy gRPC-Web filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/grpc_web_filter
- Envoy gRPC architecture overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/other_protocols/grpc.html
- gRPC-Web README and generator documentation: https://github.com/grpc/grpc-web
- gRPC-Web protocol delta: https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-WEB.md

## Issues Found
- The post stated that recent Istio versions enable the gRPC-Web filter by default on the ingress gateway. I changed this to make the EnvoyFilter the explicit setup step, because Envoy's gRPC-Web support is provided by the `envoy.filters.http.grpc_web` HTTP filter and Istio's documented way to add custom HTTP filters is EnvoyFilter.
- The post described gRPC-Web content types as only `application/grpc-web` or `application/grpc-web-text`. I updated the examples to include `application/grpc-web+proto`, which is the binary protobuf content type used by `mode=grpcweb`; the protocol also allows `application/grpc-web` with an implied default format.
- The server streaming section tied `grpcwebtext` specifically to HTTP/1.1. I adjusted the wording to match the `grpc-web` client documentation: server-side streaming is supported when `grpcwebtext` mode is used.
- The multiple-services VirtualService example only applied `corsPolicy` to the second route. I added the same CORS policy to the first route so browser preflight requests work for both path-based services.
- The closing summary repeated that the gRPC-Web filter is usually enabled by default. I removed that claim for consistency with the corrected setup.

## Review Notes
The `apiVersion: networking.istio.io/v1beta1` examples are still accepted, although current Istio documentation commonly shows `networking.istio.io/v1`. A future cleanup could update the examples to `v1` consistently if the blog wants to target only current Istio releases.
