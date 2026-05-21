# Validation Summary: How to Expose Multiple Services Through a Single Istio Gateway

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Gateway
- Istio VirtualService
- Kubernetes Services and namespaces
- Istio ingress gateway TLS
- istioctl diagnostics

## Sources Consulted
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio configuration analysis documentation: https://istio.io/latest/docs/reference/config/analysis/
- Envoy route component reference for prefix rewrite behavior: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html

## Issues Found
- The path rewrite example matched `/user-service` and `/order-service` without a trailing slash while claiming `/user-service/users/123` becomes `/users/123`. Istio rewrites the matched prefix, and Envoy documents that prefix stripping requires careful trailing-slash matching. I changed the match prefixes to `/user-service/` and `/order-service/` so the example behavior is accurate.
- The cross-namespace explanation said the destination host must be fully qualified because it is in a different namespace than the gateway. Istio resolves short destination names relative to the VirtualService namespace, not the Gateway namespace. I updated the wording to explain that FQDNs avoid short-name ambiguity.

## Review Notes
The snippets use the current `networking.istio.io/v1` API and the documented Gateway, VirtualService, TLS, route weight, and `istioctl proxy-config routes` / `istioctl analyze` forms. Path prefix matches are raw prefix matches, so future examples that need exact path-segment boundaries should consider explicit `exact` plus slash-suffixed `prefix` matches.
