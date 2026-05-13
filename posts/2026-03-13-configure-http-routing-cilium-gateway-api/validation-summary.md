# Validation Summary: How to Configure HTTP Routing in the Cilium Gateway API

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium Gateway API
- Kubernetes Gateway API
- Gateway resources
- HTTPRoute resources
- HTTP path and header matching
- Backend traffic weighting
- kubectl

## Sources Consulted
- Cilium Gateway API Support documentation: https://docs.cilium.io/en/stable/network/servicemesh/gateway-api/gateway-api/
- Kubernetes Gateway API HTTPRoute and specification reference: https://gateway-api.sigs.k8s.io/reference/spec/
- Kubernetes Gateway API HTTP header modifier guide: https://gateway-api.sigs.k8s.io/guides/http-header-modifier/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The description referred to "header filtering", but the post demonstrates HTTPRoute header matching for routing. Updated the wording to "header matching".
- The prerequisites omitted Cilium's documented Gateway API runtime requirements. Added NodePort or kube-proxy replacement, the L7 proxy, and the need for a LoadBalancer implementation or Cilium Gateway API host network mode.
- The architecture diagram used a different header and service name than the header-routing example. Updated it to use `x-environment: staging` and `staging-service:8080`.
- The conclusion stated that HTTPRoute works identically across all Gateway API implementations. Gateway API provides portable/conformant semantics, but some features have conformance levels or implementation-specific behavior. Updated the wording to "portable semantics across conformant Gateway API implementations."

## Review Notes
The Gateway and HTTPRoute examples use the current `gateway.networking.k8s.io/v1` API and valid fields for parent references, hostnames, path prefix matches, header matches, backend references, and backend weights. The `kubectl get gateway ... -o jsonpath=...` command uses a valid kubectl output mode and matches Cilium's documented status-address usage.
