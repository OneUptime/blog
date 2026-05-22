# Validation Summary: How to Bind a VirtualService to a Specific Gateway

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService
- Istio Gateway
- Istio ingress gateway traffic management
- Kubernetes custom resources
- istioctl diagnostics

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio command reference for istioctl: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio v1 APIs announcement: https://istio.io/latest/blog/2024/v1-apis/

## Issues Found
- The YAML examples used `networking.istio.io/v1beta1`. Istio networking APIs were promoted to `networking.istio.io/v1` in Istio 1.22 and current official examples use `v1`, so all Gateway and VirtualService examples were updated to `apiVersion: networking.istio.io/v1`.
- Two examples routed to `subset: v1` or `subset: v2` without noting that subsets must be declared in a corresponding DestinationRule. Added short clarification sentences after those examples.
- The multiple-gateway example claimed public gateway traffic only gets access to `/api/public`, but the final catch-all route also matches remaining traffic. Updated the explanation to say the gateway-specific routes handle their matching paths and remaining traffic falls through to `my-app`.

## Review Notes
The core explanation of `spec.gateways`, the reserved `mesh` gateway, cross-namespace gateway references, host matching between Gateway and VirtualService, and the `istioctl proxy-config routes` / `istioctl analyze` debugging commands matches current Istio documentation.
