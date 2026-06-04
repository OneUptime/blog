# Validation Summary: How to Configure Multiple Gateway Listeners on Different Ports and Protocols

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Gateway API
- Gateway, GatewayClass, Listener, HTTPRoute, GRPCRoute, TLSRoute, TCPRoute, and UDPRoute resources
- Kubernetes kubectl CLI
- Kong Gateway / Kong Ingress Controller concepts
- cert-manager Certificate resources
- Prometheus metrics for Kong Gateway

## Sources Consulted
- Kubernetes Gateway API specification: https://gateway-api.sigs.k8s.io/reference/spec/
- Kubernetes Gateway API overview: https://gateway-api.sigs.k8s.io/concepts/api-overview/
- Kubernetes Gateway API GRPCRoute reference: https://gateway-api.sigs.k8s.io/reference/api-types/grpcroute/
- Kubernetes Gateway API TLSRoute reference: https://gateway-api.sigs.k8s.io/reference/api-types/tlsroute/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes kubectl create secret tls reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- Kong Prometheus plugin documentation: https://developer.konghq.com/plugins/prometheus/

## Issues Found
- The post listed `gRPC` as a Gateway listener protocol. Gateway API listener protocols include core values such as `HTTP`, `HTTPS`, `TLS`, `TCP`, and `UDP`; gRPC is routed with `GRPCRoute` over HTTP/HTTPS rather than a `gRPC` listener protocol. Updated the description and listener explanation to describe gRPC over HTTP/HTTPS.
- The GRPCRoute example used `gateway.networking.k8s.io/v1alpha2`. GRPCRoute is GA in the Standard channel and available as `gateway.networking.k8s.io/v1`; updated the example to `v1`.
- The hostname listener section said routes automatically attach based on hostname matching. Gateway API also requires route `parentRefs` attachment and hostname intersection. Updated the wording to avoid implying hostname alone attaches routes.
- The environment routing section could imply that Route labels satisfy `allowedRoutes.namespaces.selector`. That selector matches Namespace labels. Added a clarification that the `production` and `staging` namespaces must be labeled.
- The address binding section implied individual listeners can be bound to different IP addresses through standard Gateway `addresses`. In Gateway API, `addresses` apply to the Gateway as a whole. Updated the section title, wording, and example.
- The monitoring section implied a universal metrics endpoint and command. Gateway metrics are implementation-specific, and Kong requires Prometheus plugin or status endpoint configuration. Updated the wording and command to frame it as a configured Kong metrics endpoint.
- The resource limit example comment called the Service and Deployment snippet a "Gateway class." Updated the comment to describe it as Gateway implementation Service and Deployment resource limits.

## Review Notes
The remaining TCPRoute and UDPRoute examples still use `gateway.networking.k8s.io/v1alpha2`, which is correct for those resources in the current Gateway API reference. Some examples remain implementation-dependent because Gateway API support for TCP, UDP, cleartext gRPC over HTTP/2, metrics, and requested addresses varies by controller.
