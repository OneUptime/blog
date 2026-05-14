# Validation Summary: Comparing the Cilium Star Wars Demo App to Real-World Microservice Architectures

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- eBPF
- Hubble
- Kubernetes labels and selectors

## Sources Consulted
- Cilium Getting Started with the Star Wars Demo: https://docs.cilium.io/en/stable/gettingstarted/demo/
- Cilium Policy Enforcement Modes: https://docs.cilium.io/en/latest/security/policy/intro/
- Cilium Layer 3 Policies: https://docs.cilium.io/en/stable/security/policy/layer3/
- Cilium Layer 7 Policies: https://docs.cilium.io/en/stable/security/policy/layer7/
- Cilium Kubernetes policy namespace selector documentation: https://docs.cilium.io/en/latest/security/policy/kubernetes/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/

## Issues Found
- The production CiliumNetworkPolicy example selected a source `api-gateway` with `team=platform` from a policy in the `payments` namespace but did not include the Kubernetes namespace label needed for a cross-namespace `fromEndpoints` match. Added `k8s:io.kubernetes.pod.namespace: platform` to the source selector.
- The text mapped `org=empire` directly to `team=payments`, which was too broad because the demo label represents trusted Empire workloads rather than only the destination service team. Reworded it to describe mapping to a trusted service ownership label.
- The default-deny policy comment implied a global policy. Clarified that the shown `CiliumNetworkPolicy` is namespace-scoped.
- The Hubble command requires the Hubble CLI and API access. Added this prerequisite so the `hubble observe` command is executable as described.

## Review Notes
The post contains an appended second tutorial-style section after the first conclusion. It is technically related and the Cilium examples align with the official Star Wars demo, but the article structure could be cleaned up in a future editorial pass.
