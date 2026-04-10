# Validation Summary: How to Configure Ceph for Small (3-Node) Clusters

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (Reef v18.2.0)
- Kubernetes (CephCluster CRD, CephBlockPool CRD, pod anti-affinity, kubectl)

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Ceph documentation on pool settings (min_size, requireSafeReplicaSize behavior): https://docs.ceph.com/en/reef/rados/operations/pools/
- Ceph documentation on OSD full ratios: https://docs.ceph.com/en/reef/rados/configuration/mon-config-ref/
- Ceph documentation on PG autoscaling and per-OSD PG guidance: https://docs.ceph.com/en/reef/rados/operations/placement-groups/
- Kubernetes pod anti-affinity documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#inter-pod-affinity-and-anti-affinity

## Issues Found
- **Incorrect comment on `requireSafeReplicaSize`**: The comment stated "Block writes if < 3 replicas available". When `requireSafeReplicaSize: true` is set with `size: 3`, Ceph calculates `min_size = floor(size/2) + 1 = 2`. This means writes are blocked if fewer than 2 replicas are achievable, not fewer than 3. Fixed the comment to: "Block writes if < 2 replicas available (min_size=2 for size 3)".

## Review Notes
- The `mgr.count: 1` setting is valid but trades off manager HA for resource savings. For production clusters where high availability of the dashboard and orchestrator is important, `mgr.count: 2` is recommended by Rook. The post correctly notes this is a resource-saving measure, which is a reasonable trade-off for small clusters.
- The Ceph image `quay.io/ceph/ceph:v18.2.0` (Reef) is a valid stable release. Users should check for the latest patch release in the v18.2.x series for security fixes.
- The PG guidance of ~100 per OSD is a reasonable rule of thumb. Ceph's PG autoscaler (enabled by default in Reef) will handle this automatically in most cases, so the manual calculation is mainly informational.
- The `--delete-emptydir-data` flag used with `kubectl drain` is the current correct flag, replacing the deprecated `--delete-local-data`.
