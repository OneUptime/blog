# Validation Summary: How to Fix Rook-Ceph Monitor Pods Stuck in Pending

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage system) — monitor (MON) daemon
- Kubernetes (pod scheduling, node affinity, tolerations, taints, PVCs, StorageClasses)
- kubectl CLI
- Ceph CLI (`ceph mon stat`, `ceph quorum_status`)
- jq (JSON processor)

## Sources Consulted
- Rook CephCluster CRD documentation — `spec.mon.count`, `spec.mon.allowMultiplePerNode`, `spec.placement` fields (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Kubernetes Node Affinity documentation — `requiredDuringSchedulingIgnoredDuringExecution` with `nodeSelectorTerms` and `matchExpressions` (https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#node-affinity)
- Kubernetes Taints and Tolerations documentation (https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/)
- Ceph CLI reference — `ceph mon stat` and `ceph quorum_status` commands (https://docs.ceph.com/en/latest/man/8/ceph/)
- Cross-referenced with 15+ validated Rook blog posts in this repository that use identical CRD paths, commands, and YAML structures

## Issues Found
No technical issues found.

## Review Notes
- The `ceph quorum_status` command correctly uses an underscore (not a hyphen), matching the actual Ceph CLI syntax.
- The `jq '.quorum_names'` filter correctly targets the `quorum_names` field in the `ceph quorum_status` JSON output.
- All CephCluster CRD field paths (`spec.mon.count`, `spec.mon.allowMultiplePerNode`, `spec.placement.mon.nodeAffinity`, `spec.placement.mon.tolerations`) are accurate for Rook v1.x.
- The pod label selector `app=rook-ceph-mon` is the correct label used by the Rook operator for monitor pods.
- The PVC naming pattern `rook-ceph-mon-a` is consistent with Rook's actual PVC naming convention for monitor storage.
- The recommendation to use `allowMultiplePerNode: true` as a last resort is sound operational advice, as it does reduce fault tolerance.
