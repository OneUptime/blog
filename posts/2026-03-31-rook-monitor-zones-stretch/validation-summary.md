# Validation Summary: How to Configure Monitor Zones for Stretch Clusters in Rook

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (stretch cluster / monitor zones)
- Kubernetes (node labels, taints, tolerations)
- CephCluster CRD (`spec.mon.stretchCluster`)
- CephBlockPool CRD (stretch-replicated pools)

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook upstream stretch cluster example: https://github.com/rook/rook/blob/master/deploy/examples/cluster-stretched.yaml
- Rook stretch cluster documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/stretch-cluster/
- Ceph Squid (v19.x) release notes: https://ceph.io/en/news/blog/2024/v19-2-0-squid-released/

## Issues Found

1. **CephBlockPool `failureDomain` was set to `host` instead of `zone`**: The pool spec had `spec.failureDomain: host`, but for a stretch cluster the failure domain must be `zone` so that `replicasPerFailureDomain: 2` distributes 2 replicas per zone (4 total across 2 zones). With `failureDomain: host`, the replication semantics would not achieve cross-zone distribution as described. Changed to `spec.failureDomain: zone`.

2. **Incorrect quorum math in failure scenario**: The "Zone A fails" section stated "Arbiter Mon + Zone B Mon maintain quorum (2 of 5 total, but 2 of 3 'vote groups')". This was wrong on two counts: (a) 3 of 5 mons survive when Zone A fails (Zone B's 2 + the arbiter's 1), not 2 of 5; (b) Ceph does not use a "vote groups" abstraction — it uses standard majority quorum. Corrected to state that 3 of 5 mons remain, which constitutes a majority.

## Review Notes
- The Ceph image `quay.io/ceph/ceph:v19.2.0` is a valid Squid release but is not the latest in the v19.2.x series (v19.2.3 exists). This is acceptable for a tutorial but readers should be aware newer patch releases are available.
- The CephCluster stretch configuration (`spec.mon.stretchCluster` with `failureDomainLabel`, `subFailureDomain`, and `zones`) is correct and matches the upstream Rook examples.
- The 5-monitor requirement (2 per data zone + 1 arbiter) is correct per both Rook and Ceph documentation.
- The tiebreaker placement approach using taints/tolerations is valid, though the placement snippet only shows tolerations — in practice, a nodeAffinity rule matching the arbiter zone label would also be beneficial to ensure the arbiter mon schedules in the correct zone (Rook handles this automatically via the zone configuration).
