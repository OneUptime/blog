# Validation Summary: How to Write Kubernetes Network Policies from Scratch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Kubernetes networking
- CNI plugins
- kubectl
- YAML
- Calico
- Cilium
- Weave Net
- Flannel

## Sources Consulted
- Kubernetes Network Policies concept documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes NetworkPolicy v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- Kubernetes Install a Network Policy Provider documentation: https://kubernetes.io/docs/tasks/administer-cluster/network-policy-provider/
- Kubernetes Declare Network Policy task documentation: https://kubernetes.io/docs/tasks/administer-cluster/declare-network-policy/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- BusyBox wget reference: https://busybox.net/BusyBox.html

## Issues Found
- The CNI check was described as checking whether the cluster supports Network Policies, but the command only searches for a few common provider pods. Updated the wording to say it checks for common Network Policy-capable CNI plugins.
- The CIDR section said CIDR blocks let you "allow or deny" traffic. Kubernetes NetworkPolicy is allow-list based; `ipBlock.except` excludes CIDRs from an allowed block rather than creating a general deny rule. Updated the wording to describe allow traffic and excluding smaller ranges.

## Review Notes
The NetworkPolicy manifests use the current `networking.k8s.io/v1` API and valid fields for `podSelector`, `policyTypes`, `ingress`, `egress`, `namespaceSelector`, `podSelector`, `ipBlock.cidr`, and `ipBlock.except`. The explanation of same-item `namespaceSelector` plus `podSelector` as AND logic, and separate peer entries as OR logic, matches the Kubernetes documentation. DNS egress examples intentionally allow port 53 to all destinations; in production, this could be narrowed to kube-dns/CoreDNS pods or service IPs depending on the CNI and cluster design.
