# Validation Summary: How to Separate OSD WAL and DB Partitions to Faster Drives

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph BlueStore
- Ceph OSD WAL and DB separation
- Kubernetes (kubectl)
- rbd bench (Ceph benchmarking)

## Sources Consulted
- Rook source code: `pkg/operator/ceph/cluster/osd/config` — StoreConfig struct and recognized config keys (MetadataDeviceKey, WalSizeMBKey, DatabaseSizeMBKey)
- Rook GitHub Issue #4449 — feature request for `walDevice`/`dbDevice` (closed; not implemented)
- Rook GitHub Issue #9430 — confirmed per-device `metadataDevice` usage
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Ceph BlueStore Configuration Reference: `doc/rados/configuration/bluestore-config-ref.rst`
- Ceph documentation on block.db sizing (1-4% general, 4% for RGW, 1-2% for RBD)
- Ceph `rbd bench` man page and source code

## Issues Found

### 1. Non-existent `walDevice` and `dbDevice` config keys (Critical)
**What was wrong:** The "Configuring Separate WAL and DB Devices" section used `walDevice` and `dbDevice` as Rook config keys. These fields do not exist in the Rook CephCluster CRD. The only valid metadata device config key is `metadataDevice`, which places both WAL and DB on the same device. A feature request for separate WAL/DB device keys (GitHub Issue #4449) was closed without being implemented.

**What was changed:** Replaced the entire section with "Controlling WAL and DB Partition Sizes" that correctly explains the limitation and shows the valid `databaseSizeMB` and `walSizeMB` config keys. Added a note about PVC-based clusters using `volumeClaimTemplates` as an alternative for true WAL/DB separation.

### 2. Incorrect DB sizing recommendations (Moderate)
**What was wrong:** The post claimed DB should be sized at "4% minimum, 8% recommended." Official Ceph documentation recommends 1-4% of OSD data capacity, with 4% being the minimum specifically for RGW workloads and 1-2% sufficient for RBD workloads. The 8% figure has no basis in official documentation.

**What was changed:** Updated the DB description to "1-4% of the OSD's data capacity (4% for RGW workloads, 1-2% for RBD)." Updated the sizing guidelines section to show the correct 1-4% range with workload-specific guidance. Updated the sizing example to clarify it applies to RGW workloads and added a note about lower requirements for RBD.

### 3. Missing `rbd create` prerequisite (Moderate)
**What was wrong:** The `rbd bench` command requires a pre-existing RBD image, but the post did not include the `rbd create` step. Running the command as-is would fail.

**What was changed:** Added a `rbd create benchimage --size 10G` command before the bench command and updated the description to mention both steps.

### 4. Summary referenced non-existent config fields (Minor)
**What was wrong:** The summary mentioned `walDevice` and `dbDevice` as Rook-exposed fields.

**What was changed:** Rewrote the summary to correctly reference `metadataDevice` as the primary config key, and mention `databaseSizeMB` and `walSizeMB` for partition size control.

## Review Notes
- The WAL sizing of "1-2 GB per OSD" is a reasonable community rule-of-thumb, though official Ceph docs are vaguer. Some community references cite "512 MB to 2 GB" as the range. Left as-is since 1-2 GB is within the acceptable range.
- The `grep -E "bluefs|wal|db"` pattern in the verification command is overly broad and will match many unrelated fields. A more precise pattern like `grep -E "bluefs_db_type|bluefs_wal_type|bluefs_db_dev_node|bluefs_wal_dev_node"` would be better, but the current pattern still works functionally.
- The post's claim that Rook "automatically partitions the NVMe drive" is correct — Rook handles partitioning of the metadata device.
- For users who truly need WAL and DB on separate physical devices, the PVC-based approach with `volumeClaimTemplates` is the supported path in Rook. The post now mentions this but doesn't go into detail, which is appropriate for its scope.
