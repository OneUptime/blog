# Validation Summary: How to Choose Between Journal-Based and Snapshot-Based RBD Mirroring

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph RBD (RADOS Block Device)
- RBD mirroring (journal-based and snapshot-based)
- Rook-Ceph operator
- CephBlockPool CRD (ceph.rook.io/v1)

## Sources Consulted
- Ceph RBD Mirroring documentation: https://docs.ceph.com/en/reef/rbd/rbd-mirroring/
- Ceph RBD image features and dependency chain: https://docs.ceph.com/en/reef/man/8/rbd/
- Ceph RBD configuration reference (journal settings): https://docs.ceph.com/en/reef/rbd/rbd-config-ref/
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/

## Issues Found

1. **Incorrect `object-map` prerequisite for journaling (line 31)**
   - **What was wrong:** The post stated "The `exclusive-lock` and `object-map` features must also be enabled" as requirements for journal-based mirroring. The `journaling` feature only depends on `exclusive-lock`. The `object-map` feature is a sibling in the dependency tree (also depends on `exclusive-lock`) but is not a prerequisite for `journaling`.
   - **What was changed:** Updated to state that only `exclusive-lock` is required as a dependency of `journaling`.
   - **Why:** Enabling `object-map` is a performance optimization, not a requirement for journal-based mirroring. Stating it as required could confuse readers or cause unnecessary configuration steps.

2. **Non-existent `writethrough` mode for RBD journaling (line 36)**
   - **What was wrong:** The post stated "All writes must be journaled before acknowledgment (or after, with `writethrough` mode)". There is no "writethrough" mode for RBD journaling. The term "writethrough" applies to the RBD client cache (`rbd_cache_max_dirty`), not to the journal replication mechanism. In journal-based mirroring, writes are always committed to the journal before being acknowledged.
   - **What was changed:** Replaced with "All writes must be journaled before acknowledgment, introducing a double-write penalty" to accurately describe the overhead.
   - **Why:** The original text implied an alternate journal mode that doesn't exist, which could mislead readers into looking for a non-existent configuration option.

3. **Misleading conflation of mirroring mode and mirroring type (line 114)**
   - **What was wrong:** The post stated "For journal-based, enable the journaling feature on the image and set the pool mirroring mode to `pool`." This incorrectly implies that journal-based mirroring requires `mode: pool`. The `mode` field (`pool` vs `image`) controls whether mirroring is applied automatically to all images or per-image — it is orthogonal to whether journal-based or snapshot-based mirroring is used.
   - **What was changed:** Clarified that the `mode` field controls per-pool vs per-image mirroring scope and works with both journal-based and snapshot-based mirroring.
   - **Why:** The original statement could lead readers to believe `mode: pool` is required for journal-based mirroring, which is incorrect.

## Review Notes
- The comparison table and general guidance on when to choose each mode are accurate and well-presented.
- The CephBlockPool YAML for snapshot-based mirroring is structurally correct per the Rook CRD spec, though a production configuration would also include `replicated.size` in the spec.
- The post correctly notes that both modes provide crash-consistent data at the secondary site.
