# Validation Summary: How to Route Traffic Between Service Versions Using Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (service invocation API, annotations, sidecar)
- Kubernetes (Services, label selectors, kubectl)
- Istio (VirtualService, DestinationRule)
- Node.js / JavaScript (axios HTTP client)

## Sources Consulted
- Dapr service invocation docs: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/howto-invoke-discover-services/
- Dapr annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Kubernetes name resolution: https://docs.dapr.io/reference/components-reference/supported-name-resolution/setup-nr-kubernetes/
- Dapr Kubernetes deployment docs: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/
- Istio VirtualService API reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule API reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/

## Issues Found

1. **Approach 2 (Kubernetes Service with Label Selectors) — missing clarification about Dapr name resolution**: The original text implied that switching a Kubernetes Service selector would affect Dapr service invocation traffic. In reality, Dapr uses its own name resolution and sidecar-to-sidecar gRPC communication, bypassing Kubernetes Service routing entirely. Added a clarification that this approach is useful for ingress traffic or non-Dapr callers, not for Dapr invoke API calls.

2. **Approach 3 (Istio Traffic Splitting) — incorrect claim about Dapr inheriting Istio traffic split**: The original text stated "Dapr service invocation calls resolve through Istio, inheriting the traffic split." This is incorrect. Dapr sidecars communicate directly with each other over gRPC using Dapr's own name resolution, bypassing Istio's VirtualService routing rules. Corrected the text to explain that Istio traffic splitting applies to traffic routed through the Kubernetes Service (e.g., via an ingress gateway), not through Dapr's invoke API.

## Review Notes
- The Dapr service invocation API path (`/v1.0/invoke/{app-id}/method/{method-name}`) and default port (3500) are correct and current.
- The `dapr.io/app-id` annotation is correct per official Dapr documentation.
- The Istio VirtualService and DestinationRule YAML uses `networking.istio.io/v1beta1`, which is still supported. Istio has promoted `v1` as the stable API version, so authors may want to update to `v1` in the future.
- Approaches 1 (Multiple App IDs) and 4 (Header-Based Routing) are technically sound patterns that correctly use Dapr's service invocation API for application-level traffic routing.
- The monitoring commands using `kubectl logs` with label selectors and container name `daprd` are correct.
