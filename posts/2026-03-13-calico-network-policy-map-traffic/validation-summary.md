# Validation Summary: How to Map Network Policy Fundamentals in Calico to Real Kubernetes Traffic

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source network policy
- Calico GlobalNetworkPolicy and NetworkPolicy resources
- Calico policy tiers and rule actions
- Kubernetes NetworkPolicy
- kubectl
- calicoctl
- Felix/calico-node logging

## Sources Consulted
- Calico Open Source policy tiers documentation: https://docs.tigera.io/calico/latest/network-policy/policy-tiers/tiered-policy
- Calico Open Source Tier resource reference: https://docs.tigera.io/calico/latest/reference/resources/tier
- Calico Open Source GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Open Source automatic labels documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Calico Open Source calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Open Source component logs documentation: https://docs.tigera.io/calico/latest/operations/troubleshoot/component-logs
- Calico Open Source Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- Corrected the policy evaluation order. The post originally described GlobalNetworkPolicy, namespaced policy, and Kubernetes NetworkPolicy as separate sequential stages. Calico evaluates tiers by order, then policies within each tier, with Kubernetes NetworkPolicy objects enforced in the default tier.
- Fixed `CalicNetworkPolicy` typos to `Calico NetworkPolicy`.
- Corrected the Scenario 1 explanation so an unmatched rule is not described as a `Pass` action. `Pass` is an explicit Calico rule action with tier/profile semantics.
- Added `namespaceSelector: projectcalico.org/name == 'data'` to the GlobalNetworkPolicy example so the policy applies specifically to database pods in the `data` namespace.
- Reworded the blocklist CIDR example because `198.51.100.0/24` is documentation/example address space, not proof of a real malicious range.
- Updated the Scenario 4 `Pass` explanation and example to place the policy in a `security` tier, because `Pass` skips the rest of the current tier and continues at the next applicable tier.
- Removed the unsupported `calico-node -felix-live-logging` command and replaced it with documented `kubectl logs` guidance for calico/node logs.
- Corrected the `calicoctl get workloadendpoint <pod>` guidance. WorkloadEndpoints are Calico resources, so the safer documented inspection command is `calicoctl get workloadendpoint -n <namespace> -o yaml`.

## Review Notes
The post remains a conceptual guide rather than a full runnable manifest. Some snippets are intentionally partial, so users would still need surrounding NetworkPolicy metadata and selectors when applying them in a real cluster.
