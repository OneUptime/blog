# Validation Summary: How to Configure Authorization for Multi-Tenant Clusters in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio PeerAuthentication and mTLS
- Istio VirtualService
- Istio Telemetry access logging
- Kubernetes namespaces
- kubectl
- Prometheus metrics queries

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Telemetry reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Getting Started sidecar injection example: https://istio.io/latest/docs/setup/getting-started/
- Kubernetes kubectl create reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/

## Issues Found
- The baseline tenant isolation policies allowed the entire `istio-system` namespace. This was broader than the stated tenant isolation model and would also allow gateway workloads or any other workload in `istio-system`, not just the control plane. Removed the broad `istio-system` namespace ALLOW entries and updated the explanation.
- The gateway access policy still included the broad `istio-system` namespace ALLOW entry while claiming to allow only the ingress gateway service account. Removed that broad namespace rule so the example matches the explanation.
- The shared services policy included `istio-system` while the text said it allowed all tenants. Removed `istio-system` from that tenant list.
- The automated tenant onboarding script allowed the ingress gateway service account without a destination port restriction. Added a `to.operation.ports: ["8080"]` constraint to match the more restrictive gateway example.
- The VirtualService matched hostnames through `headers[":authority"]`. Istio's HTTPMatchRequest has a first-class `authority` field, and the docs state that `authority` is ignored when used as a key in the `headers` map. Replaced the pseudo-header match with `authority: exact: ...`.

## Review Notes
All YAML snippets parse successfully after the corrections. The review checked the examples against current Istio v1 API references. A live Kubernetes cluster with Istio CRDs was not available in this workspace, so server-side `kubectl apply --dry-run=server` validation was not performed.
