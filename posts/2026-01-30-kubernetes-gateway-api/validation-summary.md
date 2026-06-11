# Validation Summary: How to Build Kubernetes Gateway API

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubernetes Gateway API
- GatewayClass
- Gateway
- HTTPRoute
- Envoy Gateway
- kubectl
- YAML configuration

## Sources Consulted
- Gateway API Getting Started documentation: https://gateway-api.sigs.k8s.io/guides/getting-started/introduction/
- Gateway API API reference: https://gateway-api.sigs.k8s.io/reference/api-spec/main/spec/
- Gateway API GitHub repository and release status: https://github.com/kubernetes-sigs/gateway-api
- Gateway API HTTP redirects and rewrites guide: https://gateway-api.sigs.k8s.io/guides/user-guides/http-redirect-rewrite/
- Gateway API HTTP query parameter matching guide: https://gateway-api.sigs.k8s.io/guides/user-guides/http-query-param-matching/
- Gateway API HTTP method matching guide: https://gateway-api.sigs.k8s.io/guides/user-guides/http-method-matching/
- Envoy Gateway GatewayClass API documentation: https://gateway.envoyproxy.io/docs/api/gateway_api/gatewayclass/

## Issues Found
- The CRD installation command used the older Gateway API v1.0.0 bundle and did not use server-side apply. Updated it to the current v1.5.1 standard bundle and added `--server-side`, matching current Gateway API installation guidance.
- The prerequisite listed Kubernetes v1.24 or later as a general recommendation, which is version-specific and can be inaccurate for newer Gateway API bundles and implementations. Reworded it to require a Kubernetes cluster supported by the selected Gateway API bundle and implementation.
- A comment said query parameter matching requires experimental CRDs. Current Gateway API documentation classifies HTTP query parameter matching as an extended support feature, and it is present in the current standard HTTPRoute schema. Updated the comment accordingly.
- The production Gateway example placed a cloud provider load balancer annotation directly on Gateway metadata. The current Gateway API provides `spec.infrastructure.annotations` for annotations that should be applied to generated infrastructure. Moved the annotation there.
- The best-practices section recommended keeping both GatewayClass and Gateway in a dedicated namespace. GatewayClass is cluster-scoped, so this was corrected to recommend a dedicated namespace for Gateways while noting that GatewayClasses are cluster-scoped.

## Review Notes
The examples use Gateway API `gateway.networking.k8s.io/v1` resources and current field names for GatewayClass, Gateway, HTTPRoute, route matching, backend weights, redirects, URL rewrite, and request header modification. Some features in the examples, such as method matching, query parameter matching, URL rewrite, and Gateway infrastructure annotations, have extended or implementation-specific support levels, so users should confirm support in their selected Gateway API implementation.
