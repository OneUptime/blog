# Validation Summary: Troubleshooting Node Termination Issues in Cilium IPAM

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Cilium IPAM
- CiliumNode custom resources
- Kubernetes
- kubectl
- jq
- Mermaid

## Sources Consulted
- Cilium Operator documentation: https://docs.cilium.io/en/latest/internals/cilium_operator/
- Cilium Cluster Scope IPAM documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/cluster-pool/
- Cilium Cluster-Pool IPAM validation documentation: https://docs.cilium.io/en/stable/network/kubernetes/ipam-cluster-pool/
- Cilium AWS ENI IPAM node termination documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/eni/
- Cilium operator command reference: https://docs.cilium.io/en/stable/cmdref/cilium-operator/
- Cilium sysdump command reference for operator label defaults: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes finalizers documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/

## Issues Found
- The operator log and health-check commands used `name=cilium-operator`. Updated them to `io.cilium/app=operator`, which matches Cilium's current default operator pod selector.
- The verification command used `cilium status | grep IPAM`, which does not reliably expose per-node IPAM allocation details. Replaced it with `cilium-dbg status --all-addresses` executed in the Cilium agent DaemonSet, matching Cilium's documented IPAM validation approach.
- The troubleshooting guidance suggested changing the cluster CIDR list for severe CIDR leaks. Updated it to say to add a new `clusterPoolIPv4PodCIDRList` or `clusterPoolIPv6PodCIDRList` entry and not modify existing entries, matching Cilium cluster-pool guidance.
- The scale-down race condition guidance suggested increasing the Cilium agent `terminationGracePeriodSeconds`. Cilium documents that the operator is responsible for garbage collecting orphaned CiliumNode resources after node deletion, so the note was changed to focus on Kubernetes node deletion events and operator availability.

## Review Notes
The commands are valid for Cilium installations using CiliumNode-backed IPAM fields such as cluster-pool IPAM. Cloud-provider IPAM modes may require additional provider-specific checks for leaked cloud interfaces or addresses.
