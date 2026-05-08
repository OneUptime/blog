# Validation Summary: Zero Trust with Advanced Kubernetes NetworkPolicy in Calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Calico Open Source
- Calico NetworkPolicy API
- kubectl
- calicoctl

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico NetworkPolicy getting started guide: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy

## Issues Found
- The introduction stated that the `projectcalico.org/v3` API provides the flexibility for the shown advanced Kubernetes NetworkPolicy, but the manifest uses the standard Kubernetes `networking.k8s.io/v1` NetworkPolicy API. Updated the wording to distinguish Calico's enforcement of Kubernetes NetworkPolicy from Calico-specific `projectcalico.org/v3` NetworkPolicy controls.

## Review Notes
- The Kubernetes NetworkPolicy manifest is syntactically valid. The combined `namespaceSelector` and `podSelector` entries use the documented AND semantics, while separate list entries are additive.
- The egress rule that omits `to` allows traffic to any destination on the listed ports, which is valid Kubernetes NetworkPolicy behavior.
- The command examples use valid `kubectl apply`, `kubectl exec`, and `calicoctl apply -f` syntax. Actual success depends on matching namespace labels, pod labels, pod names, service names, and source pod egress policy in the target cluster.
