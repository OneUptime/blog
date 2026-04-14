# Validation Summary: How to Configure Dapr Traffic Routing with Service Mesh

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (service invocation, pub/sub, resiliency)
- Istio (VirtualService, DestinationRule, fault injection, retries)
- Kubernetes (kubectl, port-forward)
- Envoy proxy (underlying sidecar for Istio)
- Kiali (service mesh observability)

## Sources Consulted
- Dapr service invocation HTTP API docs: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr service mesh integration guide: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/#using-dapr-with-a-service-mesh
- Istio VirtualService API reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule API reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio networking API version history (v1alpha3 -> v1beta1 -> v1): https://istio.io/latest/docs/reference/config/networking/
- Istio fault injection documentation: https://istio.io/latest/docs/tasks/traffic-management/fault-injection/
- Kiali documentation: https://kiali.io/docs/

## Issues Found
1. **Deprecated Istio API version**: All three Istio resource manifests (two VirtualServices and one DestinationRule) used `apiVersion: networking.istio.io/v1alpha3`, which has been deprecated since Istio 1.22 (released mid-2024). Updated all occurrences to `networking.istio.io/v1`, which is the current stable API version. The resource schemas are identical across versions; only the apiVersion string needed changing.

## Review Notes
- The traffic flow diagram (`app -> daprd -> Envoy -> network -> Envoy -> daprd -> target app`) is a correct high-level simplification. In practice, Dapr sidecar-to-sidecar communication uses gRPC internally (port 50001), but the diagram correctly shows port 3500 for the app-to-daprd leg.
- The advice about aligning mesh-level and Dapr resiliency timeouts is sound and important for avoiding retry amplification.
- The fault injection snippet is shown as a partial YAML fragment (no full VirtualService wrapper), which is acceptable for brevity in a blog post.
- All Dapr API paths, port numbers, and Istio configuration field names are accurate and current.
