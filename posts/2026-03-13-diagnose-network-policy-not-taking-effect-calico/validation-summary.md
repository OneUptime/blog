# Validation Summary: How to Diagnose Network Policy Not Taking Effect in Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico NetworkPolicy and GlobalNetworkPolicy
- Kubernetes NetworkPolicy
- Felix
- calicoctl
- iptables
- kubectl

## Sources Consulted
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Calico network policy guide: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico log rules documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules

## Issues Found
- Clarified policy ordering. Kubernetes NetworkPolicies are additive and do not have user-configurable priority, while Calico policies support ordering plus deny/pass actions. Updated the root cause and calicoctl note accordingly.
- Clarified `policyTypes`. Omitting `policyTypes` is not always wrong because Kubernetes and Calico infer defaults; the issue is when the inferred direction does not match the intended ingress or egress behavior.
- Made the Felix readiness command work for both common Calico namespaces by discovering the namespace of the `calico-node` pod instead of hardcoding `kube-system`.
- Updated the iptables check to use `iptables-save` and to look for Calico policy chains rather than implying the policy name will always appear in iptables output.
- Replaced "policy audit logging" with temporary Calico `Log` rules or flow logs, which more accurately describes observing traffic decisions in Calico.

## Review Notes
The iptables inspection step only applies to Calico's Linux iptables dataplane. Clusters using Calico eBPF dataplane require different dataplane inspection commands, though the selector, Felix health, and policy ordering checks remain useful.
