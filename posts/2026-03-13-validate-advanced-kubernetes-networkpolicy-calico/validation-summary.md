# Validation Summary: How to Validate Advanced Kubernetes NetworkPolicy with Calico Before Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Calico network policy enforcement
- Calico NetworkPolicy API
- kubectl
- calicoctl
- YAML

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Calico network policy overview: https://docs.tigera.io/calico/latest/about/kubernetes-training/about-network-policy
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply

## Issues Found
- The introduction said the `projectcalico.org/v3` API provided the flexibility for the shown advanced Kubernetes NetworkPolicy, but the core example uses the Kubernetes `networking.k8s.io/v1` NetworkPolicy API. Updated the sentence to say the Kubernetes NetworkPolicy API is enforced by Calico, while leaving the later Calico extension note intact.
- The first test command was labeled as a cross-namespace access test, but it executes from the `production` namespace against a service in the same namespace. Updated the comment to call it an allowed access test.

## Review Notes
- The NetworkPolicy YAML is syntactically valid for Kubernetes `networking.k8s.io/v1`.
- A single peer entry containing both `namespaceSelector` and `podSelector` correctly selects pods matching both conditions in selected namespaces.
- The second egress rule intentionally has no `to` selector, so it permits UDP 53 and TCP 443 to any destination for selected pods.
- The `kubectl apply -f`, `kubectl exec -n ... -- ...`, and `calicoctl apply -f` command forms match official CLI references.
