# Validation Summary: How to Configure HTTPRoute with Istio Gateway API

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Gateway API
- HTTPRoute
- Istio
- Kubernetes Services and Gateways
- Envoy route inspection via istioctl

## Sources Consulted
- Kubernetes Gateway API HTTPRoute specification: https://gateway-api.sigs.k8s.io/reference/spec/
- Kubernetes Gateway API HTTP redirects and rewrites guide: https://gateway-api.sigs.k8s.io/guides/user-guides/http-redirect-rewrite/
- Kubernetes Gateway API HTTP header modifier guide: https://gateway-api.sigs.k8s.io/guides/user-guides/http-header-modifier/
- Istio Kubernetes Gateway API task: https://istio.io/latest/docs/tasks/traffic-management/ingress/gateway-api/
- Istio request routing task with Gateway API examples and status output: https://istio.io/latest/docs/tasks/traffic-management/request-routing/

## Issues Found
- The post stated that, at minimum, an HTTPRoute needs a parent Gateway reference and at least one backend. This is not true for redirect-only HTTPRoutes, which can use a RequestRedirect filter without backendRefs. Changed the wording to say that service routing needs a parent Gateway reference and at least one backend.
- The post stated that rules are evaluated in order and the first match wins. Gateway API defines HTTPRoute precedence by match specificity first: exact path, longest prefix path, method, number of header matches, and number of query parameter matches. List order is only a tie-breaker within the same HTTPRoute. Updated the explanation accordingly.

## Review Notes
RegularExpression path, header, and query matching are valid Gateway API fields, but their conformance and regex dialect are implementation-specific. URLRewrite and response header modification are Extended support features in Gateway API rather than Core support features.
