# Validation Summary: How to Configure Node Affinity and Tolerations for Rook-Ceph Pods

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- Kubernetes scheduling primitives (nodeAffinity, tolerations, podAntiAffinity, topologySpreadConstraints)
- kubectl CLI

## Sources Consulted
- Rook CephCluster CRD placement documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/#placement-configuration-settings
- Kubernetes Pod Affinity/Anti-Affinity: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#affinity-and-anti-affinity
- Kubernetes Tolerations: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes Topology Spread Constraints: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- kubectl label/taint reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- **YAML indentation error in Monitor-Specific Placement section (line 132)**: `preferredDuringSchedulingIgnoredDuringExecution` was indented at the same level as `podAntiAffinity`, making it a sibling field under `mon` placement rather than a child of `podAntiAffinity`. This would result in an invalid CephCluster spec since `preferredDuringSchedulingIgnoredDuringExecution` is not a recognized field at the placement level — it belongs under `podAntiAffinity`. Fixed by adding 2 spaces of indentation to nest it correctly under `podAntiAffinity`.

## Review Notes
- All kubectl commands (`label`, `taint`, `get pods -o wide`, `describe`, `get pods -l`, custom-columns) use correct syntax and flags.
- The placement daemon types listed (all, mon, osd, mgr, mds, rgw) are accurate per the Rook CephCluster CRD.
- The claim that `all` settings are merged with and overridden by daemon-specific settings is correct per Rook documentation.
- Node affinity, toleration, and topology spread constraint YAML structures all follow valid Kubernetes API specifications.
- The Rook pod labels used (`app: rook-ceph-mon`, `app: rook-ceph-osd`, `rook_cluster: rook-ceph`) are accurate.
