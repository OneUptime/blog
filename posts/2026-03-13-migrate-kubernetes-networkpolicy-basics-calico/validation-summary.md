# Validation Summary: How to Migrate to Kubernetes NetworkPolicy Basics with Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Calico
- kubectl
- YAML

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Calico "What is network policy?" documentation: https://docs.tigera.io/calico/latest/about/kubernetes-training/about-network-policy
- Calico Kubernetes policy basic tutorial: https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-policy/kubernetes-policy-basic

## Issues Found
- The introduction said the `projectcalico.org/v3` API provides the flexibility needed for Kubernetes NetworkPolicy basics, but the post's example uses the standard Kubernetes `networking.k8s.io/v1` NetworkPolicy API. Updated the wording to distinguish portable Kubernetes NetworkPolicy from Calico-specific policy APIs.
- The prerequisites listed `calicoctl`, but the guide only uses `kubectl` and standard Kubernetes NetworkPolicy resources. Removed `calicoctl` from the required tools.
- The verification comment said `kubectl describe networkpolicy` verifies enforcement by Calico. Kubernetes documents that policy enforcement is implemented by the network plugin and applied asynchronously; `kubectl describe` verifies the object exists but does not prove runtime enforcement. Updated the comment accordingly.

## Review Notes
The NetworkPolicy YAML is syntactically valid for `networking.k8s.io/v1`. The `podSelector` selectors in ingress and egress rules match pods in the same namespace as the policy, which is correct for the example. The testing commands use valid `kubectl exec` syntax.
