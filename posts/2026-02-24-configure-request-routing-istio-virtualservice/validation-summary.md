# Validation Summary: How to Configure Request Routing with Istio VirtualService

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes
- Istio VirtualService
- Istio ServiceEntry
- Envoy sidecar proxies
- istioctl
- YAML configuration

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio accessing external services task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-control/
- Istio egress gateways task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-gateway/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio proxy debugging documentation: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/

## Issues Found
- The routing model said every HTTP request entering the mesh passes through a sidecar proxy. Updated it to specify sidecar-based meshes and Envoy sidecars, since Istio also supports gateway and ambient deployment models.
- The fallback behavior said Istio uses standard Kubernetes service routing when no VirtualService rule matches. Updated it to distinguish the case where no VirtualService applies from the case where a matching VirtualService has no matching HTTP route.
- The weighted routing section said weights must add up to 100. Updated it to reflect Istio's documented behavior: weights are relative proportions, and values summing to 100 are a clear percentage convention.
- The source label matching description implied a generic runtime service match. Updated it to describe source workload label selection, matching the VirtualService `sourceLabels` semantics.
- The external service example used HTTP timeout and retry routing with a port 443 HTTPS ServiceEntry. Updated the example to use HTTP on port 80 so the shown HTTP route features apply to visible HTTP traffic without requiring TLS origination or TLS routing.

## Review Notes
The examples use the current `networking.istio.io/v1` API and the referenced VirtualService, ServiceEntry, and istioctl fields are current in the official Istio documentation as of 2026-05-22.
