# Validation Summary: How to Configure Namespace Isolation with Authorization Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio PeerAuthentication and mTLS
- Kubernetes namespaces
- Kubernetes kubectl
- Kubernetes health probes

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio security concepts and authorization behavior: https://istio.io/latest/docs/concepts/security/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio health checking and probe rewrite documentation: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- Fixed an invalid path wildcard example by changing `/users/*/profile` to `/users/{*}/profile`, which matches Istio's documented URI-template syntax for a single path segment wildcard.
- Fixed the staging policy comment. The original comment said staging could talk to production read-only, but the shown policy applies to inbound traffic for workloads in the `staging` namespace and does not grant outbound access to production.
- Corrected the explanation that allowing `istio-system` is required for the Istio control plane to communicate with sidecars. AuthorizationPolicy is enforced for inbound workload traffic at the server-side proxy, so this allowance is only needed when in-mesh workloads in `istio-system` need to call application services.
- Split the full Team A example into a namespace-wide isolation policy and a workload-specific analytics exception. The original single namespace-wide policy would have allowed the Team B analytics service to send GET requests to every Team A workload, not just the API workload shown in the diagram.
- Replaced the advice to match namespace labels directly in AuthorizationPolicy. Istio AuthorizationPolicy matches source namespaces by namespace name/identity, not Kubernetes namespace labels; label-driven grouping needs generated policy or another automation layer.

## Review Notes
The post is technically relevant and uses the current stable `security.istio.io/v1` Istio security APIs. The examples assume sidecar-mode policy enforcement; ambient-mode deployments may require `targetRefs` and waypoint-specific policy placement for service-targeted authorization.
