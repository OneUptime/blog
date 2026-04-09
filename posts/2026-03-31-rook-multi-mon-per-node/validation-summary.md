# Validation Summary: How to Allow Multiple Monitors Per Node in Rook-Ceph

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage system, specifically Ceph Monitors)
- Kubernetes (pod scheduling, anti-affinity, kubectl)

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook Ceph examples and cluster spec references: https://rook.io/docs/rook/latest/Getting-Started/example-configurations/
- Kubernetes well-known labels documentation: https://kubernetes.io/docs/reference/labels-annotations-taints/#kubernetesiohostname
- Kubernetes pod anti-affinity documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#inter-pod-affinity-and-anti-affinity
- kubectl patch documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
No technical issues found.

## Review Notes
- The `spec.placement.mon.podAntiAffinity` example is valid and represents a well-known pattern when `allowMultiplePerNode: true` is set. Rook's built-in hard anti-affinity is relaxed when `allowMultiplePerNode` is true, so adding a soft (preferred) anti-affinity manually is the correct approach to encourage spreading without blocking scheduling.
- The quorum math throughout the post is accurate: Ceph monitor quorum requires a strict majority (2 of 3, 3 of 5, etc.), and the failure scenarios described are correct.
- The note about `allowMultiplePerNode: true` being irrelevant for fault tolerance when monitors share a node is an important and accurate caveat.
- The recommendation to use `count: 1` for dev/test environments (Minikube, kind) is pragmatic and correct.
