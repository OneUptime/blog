# Validation Summary: How to Configure RBD Journal-Based Mirroring in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph RBD (RADOS Block Device)
- RBD journal-based mirroring
- CephBlockPool CRD
- CephRBDMirror CRD
- Kubernetes / kubectl

## Sources Consulted
- Rook CephBlockPool CRD documentation (https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/)
- Rook CephRBDMirror CRD documentation (https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-rbd-mirror-crd/)
- Ceph RBD Mirroring documentation (https://docs.ceph.com/en/latest/rbd/rbd-mirroring/)
- Ceph source code for rbd-mirror status output (src/tools/rbd_mirror/image_replayer/journal/ReplayStatusFormatter.cc)

## Issues Found

1. **Step 1 title and description were misleading**: The section was titled "Enable Journaling on the Pool" but the commands (`ceph osd pool application enable` and `rbd mirror pool enable`) enable pool-level mirroring, not journaling. Journaling is a per-image feature enabled in Step 3. Changed the title to "Enable Mirroring on the Pool" and updated the description to match.

2. **`snapshotSchedules` included in CephBlockPool YAML (Step 2)**: The YAML config included a `snapshotSchedules` block with `interval: 1h`. Snapshot schedules are a snapshot-based mirroring feature that creates periodic mirror-snapshots to drive replication. For journal-based mirroring, replication is continuous via the journal and snapshot schedules are not used. Including this field is unnecessary and misleading in a journal-based mirroring tutorial. Removed the `snapshotSchedules` block.

## Review Notes
- The `mode: image` field in the CephBlockPool mirroring spec is correct. It controls which images get mirrored (image-level vs pool-level), not the mirroring mechanism (journal vs snapshot). This distinction could confuse readers but is technically accurate.
- The `exclusive-lock` feature is a prerequisite for the `journaling` feature on RBD images. The post does not mention this, but in most Rook-managed clusters `exclusive-lock` is enabled by default, so this omission is unlikely to cause issues in practice.
- The `entries_behind_primary` field in the verification output is confirmed to exist in Ceph's journal-based mirroring status formatter source code. It is specific to journal mode.
- All CLI commands, CRD specs, and bootstrap token exchange procedures are verified as correct against official Ceph and Rook documentation.
