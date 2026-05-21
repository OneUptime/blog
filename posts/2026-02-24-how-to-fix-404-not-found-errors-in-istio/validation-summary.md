# Validation Summary: How to Fix 404 Not Found Errors in Istio

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio
- Envoy
- Kubernetes
- Istio Gateway
- Istio VirtualService
- istioctl
- kubectl
- jq

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio configuration scoping: https://istio.io/latest/docs/ops/configuration/mesh/configuration-scoping/
- Istio traffic management best practices: https://istio.io/latest/docs/ops/best-practices/traffic-management/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio debugging Envoy and Istiod: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio configuration analysis with istioctl analyze: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Envoy router filter statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter.html

## Issues Found
- The VirtualService and Gateway examples used `networking.istio.io/v1beta1`. Updated them to the current stable `networking.istio.io/v1` API used by the latest Istio documentation.
- The Gateway binding text implied that a VirtualService must always reference a Gateway with `namespace/name`. Clarified that this is required in the shown example because the Gateway is in a different namespace.
- The default route example used `subset: v1` and `subset: v2` without showing or mentioning the required DestinationRule subsets. Removed the subset fields because they were not needed to demonstrate the catch-all route.
- The `exportTo` section implied a VirtualService visibility restriction makes services in other namespaces unable to see the service. Clarified that restricted VirtualService visibility means workloads in other namespaces are not affected by that VirtualService; Kubernetes Service visibility is controlled separately with the `networking.istio.io/exportTo` annotation.

## Review Notes
The troubleshooting flow and commands are consistent with current Istio guidance. In a future expansion, the post could mention checking Envoy response flags such as `NR` in access logs, but the existing header-based diagnosis remains valid.
