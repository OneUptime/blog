# Validation Summary: How to Configure Network Policies for Pod Communication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Kubernetes networking and CNI plugins
- Pod, namespace, and IPBlock selectors
- Kubernetes DNS / CoreDNS
- kubectl commands
- YAML manifests

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes DNS debugging documentation: https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The CNI detection command listed Calico, Cilium, and Weave Net but omitted Antrea even though Antrea was listed as a supported provider. Added `antrea` to the grep pattern.
- The key concept "Any policy selecting a pod = default deny for that pod" was too broad. Kubernetes isolation is direction-specific, so it now says a policy selecting a pod for ingress or egress creates default deny for that direction.
- Several DNS egress examples selected the entire `kube-system` namespace on port 53. They now also select DNS pods with `k8s-app: kube-dns`, matching Kubernetes' documented DNS pod label.
- Several DNS egress examples allowed only UDP port 53. Added TCP port 53 where DNS egress was presented as a general allow rule, since Kubernetes DNS services expose both UDP and TCP on port 53.
- The debugging section suggested checking a pod's network policies with `kubectl describe pod ... | grep "Network Policies"`. Kubernetes does not generally list NetworkPolicies on Pod descriptions, so this was replaced with commands to describe the NetworkPolicy and compare pod labels with policy selectors.

## Review Notes
The NetworkPolicy API version, YAML structure, podSelector / namespaceSelector behavior, ipBlock usage, additive policy model, default deny examples, and kubectl command forms were otherwise consistent with current Kubernetes documentation. The local environment did not have `kubectl`, so CLI behavior was checked against official kubectl reference documentation and YAML snippets were parsed locally with PyYAML.
