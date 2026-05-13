# Validation Summary: How to Explain Kubernetes Ingress with Calico to Your Team

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Calico NetworkPolicy
- Calico GlobalNetworkPolicy
- kubectl
- Network policy ingress controls

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Calico default deny policy documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-default-deny
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico log rules documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules

## Issues Found
- The rule evaluation diagram incorrectly described standard Kubernetes NetworkPolicy as top-to-bottom, first-match evaluation with explicit deny rules. Kubernetes NetworkPolicy is additive and allow-only; selected pods are isolated for ingress unless any matching policy allows the traffic. Updated the diagram and surrounding text to explain additive allow-list behavior.
- The introduction and conclusion referred to "rule evaluation order" without qualifying that ordering is a Calico extension. Updated those references to "rule matching model" and "rule matching behavior."
- The firewall analogy implied Calico policies use Kubernetes labels instead of IP addresses. Calico can use labels and also supports other match types, so the wording now says policies can use labels instead of relying only on IP addresses.
- The explicit deny description said Calico `action: Deny` rejects traffic and logs the denial. Calico deny rules explicitly drop traffic; logging requires `Log` rules or platform policy logging. Updated the wording accordingly.
- The answer about multiple policies selecting the same pod was correct for standard Kubernetes NetworkPolicy but incomplete for Calico's ordered policy model. Added a clarification that Calico policies can use ordered rules and explicit deny actions.

## Review Notes
The post uses placeholder manifest filenames and pod names for a live demo, so the commands are illustrative rather than a complete runnable tutorial. The `kubectl exec POD -- COMMAND` syntax is current, but users would need real pod names or workload references in an actual demo.
