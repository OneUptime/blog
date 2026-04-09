# Validation Summary: How to Deploy a Rook-Ceph Stretch Cluster Across Two Datacenters

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- Kubernetes (node labeling, topology)
- CRUSH (Ceph's data placement algorithm)
- CephCluster CRD (Rook custom resource)

## Sources Consulted
- Rook Stretch Cluster Documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/stretch-cluster/
- Rook CephCluster CRD Reference: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook Stretch Cluster Design Doc: https://github.com/rook/rook/blob/master/design/ceph/ceph-stretch-cluster.md
- Rook cluster-stretched.yaml Example: https://github.com/rook/rook/blob/master/deploy/examples/cluster-stretched.yaml
- Ceph Stretch Mode Documentation (Reef): https://docs.ceph.com/en/reef/rados/operations/stretch-mode/
- Rook v1.5.0 Release Notes (initial stretch cluster support): https://github.com/rook/rook/releases/tag/v1.5.0
- Rook v1.7 Blog Post (stable stretch cluster support): https://blog.rook.io/rook-v1-7-storage-enhancements-6ae647aa5d97

## Issues Found

### 1. Incorrect `subFailureDomain` value
- **What was wrong:** `subFailureDomain` was set to `kubernetes.io/hostname` (a Kubernetes label name), but this field expects a CRUSH bucket type.
- **What was changed:** Changed to `subFailureDomain: host`, which is the correct CRUSH bucket type and matches the official Rook example (`cluster-stretched.yaml`).
- **Why:** The `subFailureDomain` field specifies how OSDs are spread within each zone using CRUSH bucket types (e.g., `host`, `rack`), not Kubernetes label names.

### 2. Incorrect CRUSH rule command
- **What was wrong:** The command `ceph osd crush rule create-replicated stretch-rule default datacenter host` had two errors: (a) the 4th argument `host` is interpreted as a device class (like `hdd`/`ssd`), not a sub-failure-domain, making it invalid; (b) `datacenter` was used as the CRUSH bucket type, but since `crushLocation` uses `zone=datacenter-a`, the actual CRUSH bucket type is `zone`.
- **What was changed:** Changed to `ceph osd crush rule create-replicated stretch-rule default zone` — removed the erroneous `host` argument and corrected the bucket type to `zone`.
- **Why:** The command syntax is `create-replicated <name> <root> <failure-domain> [<device-class>]`. The failure domain must match the CRUSH hierarchy created by the `crushLocation` config.

### 3. Incorrect Rook version requirement
- **What was wrong:** The post stated "Rook operator version 1.10 or later" as a prerequisite.
- **What was changed:** Changed to "Rook operator version 1.7 or later (stretch cluster support became stable in v1.7)".
- **Why:** Stretch cluster support was introduced experimentally in Rook v1.5 and became stable in v1.7. Saying v1.10 was misleading as it implied that was the first supporting version.

### 4. Misleading `min_size` explanation
- **What was wrong:** The post stated "With `min_size: 2`, the cluster remains writable if one full datacenter fails." This incorrectly implies that the `min_size: 2` setting itself enables write availability during a datacenter failure.
- **What was changed:** Replaced with an explanation that Ceph's stretch mode automatically reduces `min_size` to 1 on the surviving site when a datacenter fails, which is what actually enables continued writes.
- **Why:** When one datacenter goes down, only 2 of 4 replicas remain, all on one site. If `min_size` stayed at 2, a single additional OSD failure would freeze I/O. Ceph automatically reduces `min_size` to 1 during degraded stretch mode to maintain availability.

## Review Notes
- The storage node configuration using explicit `crushLocation` in `storage.nodes[].config` is valid but not the idiomatic Rook approach. The official Rook stretch cluster example uses `useAllNodes: true` with `nodeAffinity` to restrict OSD placement, relying on Kubernetes topology labels for automatic CRUSH placement. The blog's approach works but readers following the official docs may see a different pattern.
- In Rook-managed clusters, CRUSH rules and pools are typically created declaratively via `CephBlockPool` CRDs rather than manual `ceph` CLI commands. The manual approach shown works but is not the GitOps-friendly pattern most Rook users follow.
- The RTT < 10ms recommendation is correct for Ceph, but in a Rook/Kubernetes context, the binding constraint is actually Kubernetes etcd (approximately 5ms one-way / 10ms RTT), which happens to align with the same threshold.
