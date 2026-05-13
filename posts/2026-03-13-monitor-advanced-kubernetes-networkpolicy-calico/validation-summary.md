# Validation Summary: How to Monitor Advanced Kubernetes NetworkPolicy Impact with Calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Calico
- calicoctl
- kubectl
- YAML

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Calico network policy overview: https://docs.tigera.io/calico/latest/about/kubernetes-training/about-network-policy
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl installation and API group guidance: https://docs.tigera.io/calico/latest/operations/calicoctl/install

## Issues Found
- The introduction said the `projectcalico.org/v3` API provides the flexibility for the advanced policy, but the main configuration example is a Kubernetes `networking.k8s.io/v1` NetworkPolicy. Updated the wording to distinguish Calico enforcement of Kubernetes NetworkPolicy from Calico-specific `projectcalico.org/v3` policy features.
- The policy uses `namespaceSelector` rules that depend on namespace labels, but the prerequisites did not mention those labels. Added a prerequisite noting that namespaces must be labeled to match the selectors used by the policy.

## Review Notes
The Kubernetes NetworkPolicy manifest uses the current `networking.k8s.io/v1` API and valid `podSelector`, `namespaceSelector`, `policyTypes`, `ingress`, `egress`, `ports`, and `protocol` fields. The `kubectl apply`, `kubectl exec`, and `calicoctl apply -f` command forms are valid. The second egress rule intentionally allows UDP/53 and TCP/443 to any destination because it omits a `to` selector; this is valid Kubernetes NetworkPolicy behavior, but future revisions could explain that operational impact more explicitly.
