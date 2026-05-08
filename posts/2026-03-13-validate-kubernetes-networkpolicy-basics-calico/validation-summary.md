# Validation Summary: How to Validate Kubernetes NetworkPolicy Basics with Calico Before Production

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes NetworkPolicy
- Calico
- kubectl
- YAML

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Calico network policy overview: https://docs.tigera.io/calico/latest/about/kubernetes-training/about-network-policy
- Calico network policy guide: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy

## Issues Found
- The introduction said the `projectcalico.org/v3` API was used for the NetworkPolicy basics, but the example uses the standard Kubernetes `networking.k8s.io/v1` NetworkPolicy API. Updated the wording to describe the Kubernetes API and Calico's enforcement role accurately.
- The prerequisites listed `calicoctl`, but the guide only applies and inspects a Kubernetes NetworkPolicy with `kubectl`. Removed `calicoctl` from the required tools.
- The command comment said `kubectl describe networkpolicy` verifies Calico enforcement. That command verifies the Kubernetes NetworkPolicy resource and its interpreted selectors/rules, but does not by itself prove dataplane enforcement. Updated the comment to match what the command actually verifies.

## Review Notes
The NetworkPolicy manifest is syntactically valid for `networking.k8s.io/v1`. The policy selects backend pods, allows ingress from same-namespace pods labeled `app: frontend` on port 8080, and isolates backend egress to database pods on port 5432 plus UDP DNS on port 53. The test commands are plausible, but they assume the named pods exist, have the expected labels, and include `curl`.
