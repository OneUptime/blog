# Validation Summary: How to Configure Kubernetes NetworkPolicy Basics with Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Calico network policy enforcement
- kubectl
- YAML

## Sources Consulted
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Calico network policy overview: https://docs.tigera.io/calico/latest/about/kubernetes-training/about-network-policy
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy

## Issues Found
- The introduction said the `projectcalico.org/v3` API provided the flexibility for this example, but the configuration shown is a standard Kubernetes `networking.k8s.io/v1` NetworkPolicy. Updated the text to name the Kubernetes NetworkPolicy API that Calico enforces.
- The verification command comment said `kubectl describe networkpolicy` verifies that Calico enforces the policy. That command verifies the Kubernetes NetworkPolicy object exists and shows its spec, but it does not independently prove Calico dataplane enforcement. Updated the comment to say it verifies the NetworkPolicy was created.

## Review Notes
The NetworkPolicy manifest uses the current `networking.k8s.io/v1` API and valid fields for ingress and egress policy. The `kubectl exec ... -- COMMAND [args...]` syntax is current. The connectivity tests assume the named pods exist in the `production` namespace and have labels consistent with the policy selectors.
