# Validation Summary: Zero Trust with Kubernetes NetworkPolicy Basics Enforced by Calico

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
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy-resources/network-policy-v1/
- kubectl describe reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Calico network policy overview: https://docs.tigera.io/calico/latest/about/kubernetes-training/about-network-policy

## Issues Found
- The introduction described `projectcalico.org/v3` as the API used for the standard Kubernetes NetworkPolicy example. The example uses `apiVersion: networking.k8s.io/v1`, so the text now distinguishes Kubernetes NetworkPolicy resources from Calico-specific policy APIs.
- The prerequisites required `calicoctl`, but the post only applies and inspects a standard Kubernetes NetworkPolicy with `kubectl`. The prerequisite was changed to require `kubectl` installed and configured.
- The post called the example "production-ready configurations" even though it is a basic starting point and allows DNS egress by port only. The wording now describes it as a starting-point configuration.
- The verification comment said `kubectl describe networkpolicy` verifies Calico enforcement. That command verifies the Kubernetes NetworkPolicy object and its fields, while enforcement depends on the cluster's network plugin. The comment was updated accordingly.

## Review Notes
The YAML syntax and `networking.k8s.io/v1` NetworkPolicy fields are valid. The policy is namespace-scoped: the `podSelector` peers in the ingress and egress rules match pods in the same namespace unless a `namespaceSelector` is added. The DNS egress rule allows UDP port 53 to any destination because it has no `to` selector; that can be acceptable for a basic example, but production policies often restrict DNS egress to cluster DNS pods or services.
