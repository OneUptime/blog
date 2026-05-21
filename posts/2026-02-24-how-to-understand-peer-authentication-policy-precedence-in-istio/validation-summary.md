# Validation Summary: How to Understand Peer Authentication Policy Precedence in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- PeerAuthentication
- Mutual TLS (mTLS)
- Kubernetes custom resources
- istioctl

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio security concepts, authentication policy scope and precedence: https://istio.io/latest/docs/concepts/security/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio istioctl describe diagnostic guide: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-describe/
- Istio istioctl analyze diagnostic guide: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/

## Issues Found
- The post incorrectly implied that `portLevelMtls` works in any PeerAuthentication policy, including namespace-wide and mesh-wide policies. Updated the explanation, diagram, resolution algorithm, examples, complex scenario, and key takeaway to state that Istio only applies `portLevelMtls` when the policy has a workload selector.
- The port-level example used a namespace-wide policy. Updated it to a workload-specific policy with a selector, matching the Istio PeerAuthentication reference.
- The complex scenario used `portLevelMtls` on a mesh-wide policy and showed that mesh-wide port override taking effect. Removed that invalid mesh-wide port override and corrected the result table.
- The post described workload-specific policy as applying in any namespace. Updated this to a regular namespace with selector, matching Istio's policy hierarchy guidance.
- The "full resolution algorithm" omitted duplicate same-scope policy behavior. Added the official behavior: newer mesh-wide or namespace-wide PeerAuthentication policies are ignored, and when multiple workload-specific policies match, Istio picks the oldest one.

## Review Notes
- The YAML examples use the current `security.istio.io/v1` PeerAuthentication API and valid mTLS modes.
- The `istioctl x describe pod`, `istioctl proxy-config listener`, and `istioctl analyze` commands match current Istio command documentation.
- In Istio ambient mode, `DISABLE` mode is not supported for PeerAuthentication. The post does not discuss ambient mode, so no content change was required.
