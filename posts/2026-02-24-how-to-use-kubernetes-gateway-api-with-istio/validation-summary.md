# Validation Summary: How to Use Kubernetes Gateway API with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Gateway API
- Istio
- Kubernetes CRDs
- GatewayClass, Gateway, HTTPRoute, GRPCRoute, TLSRoute, TCPRoute, UDPRoute, BackendTLSPolicy
- istioctl and kubectl

## Sources Consulted
- Istio Kubernetes Gateway API documentation: https://istio.io/latest/docs/tasks/traffic-management/ingress/gateway-api/
- Istio Installing Gateways documentation: https://istio.io/latest/docs/setup/additional-setup/gateway/
- Istio 1.22 release announcement: https://istio.io/latest/news/releases/1.22.x/announcing-1.22/
- Istio 1.22 change notes: https://istio.io/latest/news/releases/1.22.x/announcing-1.22/change-notes/
- Kubernetes Gateway API overview: https://gateway-api.sigs.k8s.io/concepts/api-overview/
- Gateway API HTTPRoute documentation: https://gateway-api.sigs.k8s.io/api-types/httproute/
- Gateway API GRPCRoute documentation: https://gateway-api.sigs.k8s.io/reference/api-types/grpcroute/
- Gateway API TLSRoute documentation: https://gateway-api.sigs.k8s.io/api-types/tlsroute/
- Gateway API BackendTLSPolicy documentation: https://gateway-api.sigs.k8s.io/api-types/backendtlspolicy/
- Gateway API v1.5 specification reference: https://gateway-api.sigs.k8s.io/reference/1.5/spec/
- Gateway API v1.5.1 standard and experimental install manifests: https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.5.1/standard-install.yaml and https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.5.1/experimental-install.yaml

## Issues Found
- The post used Gateway API v1.2.0 install URLs. Updated the commands to v1.5.1 to match the current Gateway API release used by Istio's latest documentation.
- The post described GRPCRoute and TLSRoute as experimental examples. GRPCRoute is standard since Gateway API v1.1.0, and TLSRoute is standard since v1.5.0, so the experimental examples were changed to TCPRoute and UDPRoute.
- The expected CRD list omitted current standard-channel CRDs installed by v1.5.1. Added GRPCRoute, TLSRoute, BackendTLSPolicy, and ListenerSet.
- The feature-gap list said request mirroring and retry policies have no Gateway API equivalents. Gateway API includes a RequestMirror HTTPRoute filter, and the current spec includes an experimental HTTPRoute retry field, so the wording was narrowed to advanced mirroring and retry capabilities.

## Review Notes
The remaining Kubernetes manifests and commands are syntactically valid for the documented resources. Some behaviors, especially retry support, request mirroring details, and extended Gateway API features, remain implementation-dependent and should be checked against the specific Istio and Gateway API versions used in a cluster.
