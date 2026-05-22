# Validation Summary: How to Configure Header-Based Routing with Gateway API

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Gateway API
- HTTPRoute
- Istio
- Envoy route configuration
- Kubernetes Services
- curl
- istioctl

## Sources Consulted
- Kubernetes Gateway API v1.5 specification: https://gateway-api.sigs.k8s.io/reference/1.5/spec/
- Kubernetes Gateway API HTTP Header Modifier guide: https://gateway-api.sigs.k8s.io/guides/user-guides/http-header-modifier/
- Istio Kubernetes Gateway API task: https://istio.io/latest/docs/tasks/traffic-management/ingress/gateway-api/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The post said the Gateway API supports two types of header matching without noting conformance differences. Updated the wording to state that Exact matching is core support and RegularExpression matching is implementation-specific, matching the Gateway API spec.
- The debugging checklist said "first match wins" for rule order. Updated it to reflect Gateway API's precedence rules: match specificity is applied first, and list order breaks remaining ties within the same HTTPRoute.

## Review Notes
The examples use valid `gateway.networking.k8s.io/v1` HTTPRoute fields for header matching, path matching, backend references, and header modification filters. Response header modification is an extended Gateway API feature, so implementation support should be verified in the target controller. The `istioctl proxy-config route` syntax is consistent with Istio's command reference, but the concrete deployment name may vary depending on how the Istio-managed Gateway was deployed.
