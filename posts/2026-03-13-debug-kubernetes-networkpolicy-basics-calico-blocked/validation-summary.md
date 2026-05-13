# Validation Summary: How to Debug Kubernetes NetworkPolicy Basics When Traffic Is Blocked by Calico

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes NetworkPolicy
- Calico network policy enforcement
- kubectl
- YAML
- Mermaid

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Calico network policy overview: https://docs.tigera.io/calico/latest/about/kubernetes-training/about-network-policy
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy

## Issues Found
- The introduction said the `projectcalico.org/v3` API provided the flexibility used by the guide, but the example is a standard Kubernetes `networking.k8s.io/v1` NetworkPolicy. Updated the text to distinguish the Kubernetes API used in the example from Calico's own advanced policy APIs.
- The prerequisites listed `calicoctl`, but the guide does not use it. Removed it from the required tools.
- The command comment said `kubectl describe networkpolicy` verifies that Calico enforces the policy. Kubernetes documentation describes this command as useful for seeing how Kubernetes interpreted the policy, but it does not prove dataplane enforcement by Calico. Updated the comment accordingly.

## Review Notes
The NetworkPolicy YAML uses the current `networking.k8s.io/v1` API and valid fields. The `podSelector` peers in `from` and `to` select pods in the same namespace as the policy, which matches Kubernetes NetworkPolicy behavior. The test commands are syntactically valid, but the expected pass/fail results assume the named pods and service exist, have the stated labels, and are not affected by other ingress or egress policies.
