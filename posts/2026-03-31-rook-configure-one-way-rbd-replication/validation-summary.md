# Validation Summary: How to Configure One-Way RBD Replication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph RBD (RADOS Block Device)
- RBD Mirroring (one-way / rx-only)
- CephRBDMirror CRD
- kubectl

## Sources Consulted
- Ceph RBD Mirroring documentation — https://docs.ceph.com/en/reef/rbd/rbd-mirroring/
- Ceph RBD command reference — https://docs.ceph.com/en/latest/man/8/rbd/
- Rook CephRBDMirror CRD documentation — https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-rbd-mirror-crd/
- Red Hat Ceph Storage 6 Block Device Guide (Mirroring) — https://docs.redhat.com/en/documentation/red_hat_ceph_storage/6/html/block_device_guide/mirroring-ceph-block-devices/

## Issues Found
1. **Incorrect claim about secondary write access in the Summary section.** The original text stated: "The secondary receives writes but cannot promote images without manual intervention during failover." This is inaccurate — in one-way RBD replication, the secondary cluster holds a **read-only** replica. External clients cannot write to mirrored images on the secondary. Only the internal rbd-mirror daemon performs write operations to replicate data. Changed to: "The secondary holds a read-only replica and images cannot be promoted without manual intervention during failover."

## Review Notes
- The `ceph osd pool create replicapool 128 replicated` command in Step 1 is valid, but in Rook-managed environments pools are typically created via the CephBlockPool CRD rather than raw CLI commands. This is a best-practice consideration, not a technical error.
- Steps 1-2 enable pool-level mirroring (`pool` mode), while Step 5 shows image-level mirroring with snapshot mode. Step 5 is appropriately framed as conditional ("If using image-level mirroring mode"), so this is not contradictory, but readers should understand these are alternative approaches.
- The explicit pg_num value of 128 in the pool creation command works but newer Ceph releases recommend relying on the pg_autoscaler module instead.
- All CLI commands (`rbd mirror pool enable`, `rbd mirror pool peer bootstrap create/import`, `rbd mirror image enable`, `rbd mirror pool status`) were verified against official Ceph documentation and are syntactically correct with valid flags and arguments.
- The CephRBDMirror CRD spec (apiVersion, kind, spec.count, spec.peers.secretNames) is accurate per Rook documentation.
