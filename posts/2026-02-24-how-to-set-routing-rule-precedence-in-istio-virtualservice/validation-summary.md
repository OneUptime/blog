# Validation Summary: How to Set Routing Rule Precedence in Istio VirtualService

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Istio VirtualService
- Istio traffic management
- Kubernetes custom resources
- Envoy route configuration
- istioctl

## Sources Consulted
- Istio VirtualService API reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio traffic management best practices: https://istio.io/latest/docs/ops/best-practices/traffic-management/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio istioctl analyze documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Istio VirtualServiceUnreachableRule analyzer reference: https://istio.io/latest/docs/reference/config/analysis/ist0130/

## Issues Found
- Updated VirtualService manifests from `networking.istio.io/v1beta1` to the current stable `networking.istio.io/v1` API used by the official Istio documentation.
- Added `gateways: ["my-gateway"]` to both VirtualServices in the split-resource example. Istio's documented VirtualService host merging applies to VirtualServices bound to a gateway; host merging is not supported for sidecar-only mesh routing.

## Review Notes
The core explanation is technically correct: Istio evaluates HTTP route rules in order and uses the first matching rule. Multiple match conditions in a single `match` block have AND semantics, while multiple `match` blocks in one rule have OR semantics. Cross-resource route order is undefined when VirtualServices for the same host are fragmented behind a gateway, so consolidation or non-overlapping fragments is the safer pattern.
