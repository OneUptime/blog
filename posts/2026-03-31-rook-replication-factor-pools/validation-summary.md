# Validation Summary: How to Set Replication Factor for Ceph Pools in Rook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- Kubernetes (CRD-based configuration)
- CephBlockPool CRD
- CRUSH map failure domains
- Erasure coding (mentioned in comparison)

## Sources Consulted
- Rook official documentation: CephBlockPool CRD spec (https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/)
- Ceph documentation: Pool configuration — size, min_size parameters (https://docs.ceph.com/en/latest/rados/operations/pools/)
- Ceph documentation: CRUSH map and failure domains (https://docs.ceph.com/en/latest/rados/operations/crush-map/)
- Rook documentation: CephCluster CRD spec (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)

## Issues Found

1. **Incorrect YAML comment about requireSafeReplicaSize (line 43)**
   - **What was wrong:** The comment said `# Require all 3 replicas before acknowledging writes`. This is incorrect — `requireSafeReplicaSize: true` sets `min_size` to `floor(size/2) + 1`, which is 2 for size=3, not 3. Writes are acknowledged after 2 replicas are written, not all 3.
   - **What was changed:** Updated comment to `# Ensure min_size is safe (min_size=2 for size=3)`.
   - **Why:** The original comment could mislead readers into thinking all 3 replicas must be written before a write is acknowledged, which would significantly increase write latency and is not how Ceph operates.

2. **Misleading "Setting Replication in the CephCluster for All Pools" section (lines 166-178)**
   - **What was wrong:** The section title and text claimed you can set a default replication policy per device class in the CephCluster CR. The YAML shown only contained `osdsPerDevice` (OSD configuration), not any replication settings. The CephCluster CRD does not have a field for setting a default replication factor.
   - **What was changed:** Rewrote the section to clarify that CephCluster does not have a default replication setting, and that replication is configured per pool via CephBlockPool or CephFilesystem CRDs.
   - **Why:** The original content was factually incorrect and could lead readers to believe they had configured replication when they had not.

## Review Notes
- The two-replica pool description says it "only tolerates one OSD failure before the pool becomes read-only." With `requireSafeReplicaSize: true` and size=2, min_size is set to 2, meaning even a single OSD failure blocks writes on affected PGs. The statement is correct for data durability (data survives one failure) but could be clearer about write availability. The YAML comment ("Still require both replicas for writes") does clarify this correctly.
- The durability table's "Survives" column refers to data durability (no data loss), not write availability. This is a common convention but could be made explicit for clarity.
- All CephBlockPool YAML examples use the correct `ceph.rook.io/v1` API version and valid spec fields.
- The `ceph osd pool set` and `ceph osd pool get` commands are syntactically correct.
- The erasure coding overhead calculations in the table are correct (EC 2+1 = 1.5x, EC 4+2 = 1.5x).
