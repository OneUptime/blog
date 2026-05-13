# Validation Summary: How to Configure HTTP Header Modifiers in the Cilium Gateway API

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium Gateway API
- Kubernetes Gateway API
- HTTPRoute
- HTTP request and response header modifiers
- kubectl
- curl
- YAML

## Sources Consulted
- Cilium Gateway API support documentation: https://docs.cilium.io/en/stable/network/servicemesh/gateway-api/gateway-api/
- Cilium HTTP Header Modifier examples: https://docs.cilium.io/en/latest/network/servicemesh/gateway-api/header/
- Kubernetes Gateway API HTTPRoute documentation: https://gateway-api.sigs.k8s.io/api-types/httproute/
- Kubernetes Gateway API v1.4 specification: https://gateway-api.sigs.k8s.io/reference/1.4/spec/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The `add` action was described as failing if the header already exists. Gateway API defines `add` as appending to any existing values for that header name, so the comment was corrected.
- The route-matching example had filters for `/api` and `/web` but no `backendRefs`. Because `backendRefs` is optional but a route rule without forwarding or a response-generating filter can return a 500, backend references were added to both rules.

## Review Notes
- The examples use `gateway.networking.k8s.io/v1`, `HTTPRoute`, `RequestHeaderModifier`, and `ResponseHeaderModifier`, which match the current Gateway API schema. `ResponseHeaderModifier` is an extended HTTPRoute rule filter in the Gateway API, so implementations should be checked for support when targeting older Cilium or Gateway API deployments.
