# Validation Summary: How to Configure Namespace-Wide Peer Authentication in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio PeerAuthentication
- Istio mutual TLS
- Kubernetes custom resources
- kubectl
- istioctl

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio Authentication Policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio Security concepts: https://istio.io/latest/docs/concepts/security/
- Istio istioctl describe documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-describe/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The post said multiple namespace-wide PeerAuthentication policies have undefined behavior and Istio might use any of them. Istio documentation says there can be only one namespace-wide PeerAuthentication policy per namespace and newer namespace-wide policies are ignored. Updated the wording in the policy rule and pitfalls sections.
- The initial STRICT namespace policy explanation did not mention workload-specific overrides. Added a short qualifier because workload-specific PeerAuthentication policies take precedence over namespace-wide policies.
- The cross-namespace communication section described mTLS behavior as if the source namespace's PeerAuthentication mode controlled outbound traffic. PeerAuthentication applies to incoming traffic on the destination workload; client-side TLS behavior is controlled by auto mTLS and DestinationRules. Rewrote the bullets around destination modes.
- The DISABLE example and sidecar caveat did not account for current ambient-mode behavior. Added notes that DISABLE is not supported in ambient mode and that PeerAuthentication is enforced by sidecars in sidecar mode or ztunnel in ambient mode.

## Review Notes
The YAML examples use the current `security.istio.io/v1` PeerAuthentication API and valid mTLS modes. The kubectl and istioctl command forms are consistent with current official documentation. The post remains focused on sidecar-mode operational patterns, with ambient-mode caveats added only where needed for correctness.
