# Validation Summary: Introduction to Cilium Service Mesh

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium Service Mesh
- Kubernetes
- Helm
- CiliumNetworkPolicy
- Envoy
- Hubble
- eBPF

## Sources Consulted
- Cilium Service Mesh documentation: https://docs.cilium.io/en/stable/network/servicemesh/
- Cilium Envoy documentation: https://docs.cilium.io/en/stable/security/network/proxy/envoy/
- Cilium L7-Aware Traffic Management documentation: https://docs.cilium.io/en/stable/network/servicemesh/l7-traffic-management/
- Cilium Kubernetes Ingress Support documentation: https://docs.cilium.io/en/stable/network/servicemesh/ingress/
- Cilium Layer 7 Protocol Visibility documentation: https://docs.cilium.io/en/stable/observability/visibility/
- Cilium Mutual Authentication documentation: https://docs.cilium.io/en/stable/network/servicemesh/mutual-authentication/mutual-authentication/

## Issues Found
- The post described L7 visibility as enabled through the `policy.cilium.io/proxy-visibility` namespace annotation. Current Cilium documentation recommends using L7 CiliumNetworkPolicy rules instead, and historical proxy visibility annotations are no longer supported. I replaced the annotation example with a CiliumNetworkPolicy-based L7 visibility example.
- The post said Cilium injects a per-node Envoy proxy and mentioned mTLS termination as an Envoy L7 feature. Cilium runs Envoy as an embedded agent process or dedicated per-node DaemonSet, and Cilium mutual authentication is documented separately from Envoy-based L7 traffic management. I changed the wording to describe Envoy as a shared per-node proxy for L7 traffic management and protocol visibility, and changed mTLS wording to mutual authentication.
- The Helm upgrade example omitted the rollout restarts documented by Cilium for changes to take effect on an existing installation. I added restarts for the Cilium operator deployment and Cilium DaemonSet.
- The post claimed the examples only required Cilium v1.12+. Since the examples are aligned with current Cilium documentation rather than v1.12-specific behavior, I changed the prerequisite to a current Cilium release.

## Review Notes
- The L7 visibility policy intentionally allows matching HTTP traffic with `http: [{}]`; as Cilium documents, L7 policy rules both enable visibility and constrain traffic to what the policy allows.
- Mutual authentication remains documented as a beta feature in current Cilium documentation, so the post now avoids presenting it as Envoy mTLS termination.
