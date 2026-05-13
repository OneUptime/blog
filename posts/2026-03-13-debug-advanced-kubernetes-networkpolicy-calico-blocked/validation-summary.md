# Validation Summary: How to Debug Advanced Kubernetes NetworkPolicy with Calico

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
- Calico network policy guide: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico network policy overview: https://docs.tigera.io/calico/latest/about/kubernetes-training/about-network-policy
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply

## Issues Found
- The introduction stated that the `projectcalico.org/v3` API provides the flexibility for the shown advanced Kubernetes NetworkPolicy, but the core example uses the standard Kubernetes `networking.k8s.io/v1` NetworkPolicy API. Updated the wording to clarify that Calico enforces Kubernetes NetworkPolicy and that `projectcalico.org/v3` is for additional Calico-specific policy controls.
- The first test command was labeled as cross-namespace access even though it runs from the `production` namespace to a service in the `production` namespace. Updated the comment to "same-namespace access" so it matches the command and policy behavior.

## Review Notes
The Kubernetes NetworkPolicy YAML is syntactically valid and uses the current `networking.k8s.io/v1` API. The combined `namespaceSelector` and `podSelector` entries use the correct Kubernetes semantics for selecting pods within matching namespaces. The `kubectl exec` and `calicoctl apply -f` command forms are current. The example assumes that the referenced namespaces, pods, services, and namespace labels already exist.
