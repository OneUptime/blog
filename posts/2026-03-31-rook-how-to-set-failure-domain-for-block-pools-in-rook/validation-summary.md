# Validation Summary: How to Set Failure Domain for Block Pools in Rook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- Ceph CRUSH map (placement algorithm)
- CephBlockPool CRD
- Kubernetes node topology labels

## Sources Consulted
- Rook official documentation: CephBlockPool CRD spec (https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/)
- Rook documentation: OSD Topology (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/#osd-topology)
- Kubernetes well-known labels documentation (https://kubernetes.io/docs/reference/labels-annotations-taints/)
- Ceph documentation: CRUSH map (https://docs.ceph.com/en/latest/rados/operations/crush-map/)

## Issues Found

1. **Incorrect rack topology label**: The post used `topology.kubernetes.io/rack` for labeling nodes with rack information. This is not a standard Kubernetes well-known label. Rook uses `topology.rook.io/rack` for rack-level topology. The `topology.kubernetes.io/` prefix only provides `zone` and `region` as well-known labels. Fixed all six `kubectl label` commands in the "Rack-Level Failure Domains" section to use `topology.rook.io/rack`.

2. **CRUSH tree weight mismatch in example output**: The example `ceph osd tree` output showed a root weight of `2.00000`, but the tree contained 3 hosts each with weight `1.00000` (3 OSDs total). The root weight should be `3.00000` to correctly reflect the sum of its children. Fixed the root weight value.

## Review Notes
- The CephBlockPool YAML examples use the correct `ceph.rook.io/v1` API version and valid spec fields (`failureDomain`, `replicated.size`, `requireSafeReplicaSize`).
- The explanation of `requireSafeReplicaSize` is slightly simplified but acceptable for a blog post. Technically, it controls the `min_size` parameter which determines the minimum number of replicas that must acknowledge a write.
- The `ceph osd crush rule dump replicated_rule` command uses `replicated_rule` which is the default CRUSH rule name in Ceph. Rook-created pools may have differently named rules (typically matching the pool name), but the command is still valid for illustrating the concept.
- The `topology.kubernetes.io/zone` and `topology.kubernetes.io/region` labels referenced in the zone topology section are correct standard Kubernetes well-known labels.
