# Validation Summary: How to Set Up Ceph RBD Storage for CockroachDB on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CockroachDB v23.2.3 (distributed SQL database)
- Pebble storage engine (CockroachDB's key-value store)
- Rook-Ceph RBD (block storage provisioner for Kubernetes)
- Kubernetes StatefulSets and PersistentVolumeClaims
- CockroachDB Kubernetes Operator (crdb.cockroachlabs.com/v1alpha1)
- Ceph OSD pools and RBD image configuration

## Sources Consulted
- CockroachDB Storage Layer documentation: https://www.cockroachlabs.com/docs/stable/architecture/storage-layer
- CockroachDB Pebble announcement: https://www.cockroachlabs.com/blog/pebble-rocksdb-kv-store/
- CockroachDB Cluster Settings reference: https://www.cockroachlabs.com/docs/stable/cluster-settings
- CockroachDB Kubernetes Operator CRD: https://github.com/cockroachdb/cockroach-operator
- CockroachDB `cockroach debug zip` docs: https://www.cockroachlabs.com/docs/stable/cockroach-debug-zip
- Rook Block Storage (RBD) documentation: https://www.rook.io/docs/rook/latest-release/Storage-Configuration/Block-Storage-RBD/block-storage/
- Rook RBD StorageClass example: https://github.com/rook/rook/blob/master/deploy/examples/csi/rbd/storageclass.yaml

## Issues Found

### 1. Incorrect storage engine reference (intro paragraph)
- **What was wrong:** The post stated CockroachDB uses "a RocksDB-based storage engine." CockroachDB switched to Pebble as default in v20.2 and removed RocksDB entirely in v21.1. For v23.2.3, only Pebble exists.
- **What was changed:** Replaced "a RocksDB-based storage engine" with "the Pebble storage engine."

### 2. Incorrect storage engine reference (Storage Architecture section)
- **What was wrong:** Listed "Pebble/RocksDB data files" implying both engines are in use.
- **What was changed:** Changed to "Pebble data files" since RocksDB is not available in v23.2.3.

### 3. Fabricated SQL cluster settings (Performance Tuning section)
- **What was wrong:** Three `SET CLUSTER SETTING` statements referenced non-existent settings:
  - `kv.store.max_bytes` — does not exist; store size is configured at startup via the `--store` flag.
  - `storage.l0_stop_writes_threshold` — does not exist as a user-settable cluster setting; Pebble's L0 thresholds are internal.
  - `raft.max_uncommitted_entries_size` — does not exist under this name in CockroachDB's cluster settings.
  - The comment also referenced "RocksDB L0 compaction" instead of Pebble.
- **What was changed:** Replaced the three fabricated settings with:
  - A bash comment showing the correct `--store` startup flag for setting store size.
  - Two valid cluster settings (`kv.snapshot_rebalance.max_rate` and `kv.snapshot_recovery.max_rate`) that are relevant for tuning CockroachDB on network-attached Ceph RBD storage.

### 4. Incorrect storage engine reference (Summary section)
- **What was wrong:** Referenced "tuning RocksDB compaction settings."
- **What was changed:** Changed to "tuning Pebble storage settings."

## Review Notes
- The `--logtostderr` flag in the StatefulSet deployment is deprecated since CockroachDB v21.1. It still functions in v23.2.3, but the recommended approach is to use the `--log` flag for logging configuration. Not changed since it still works, but should be updated in a future revision.
- The Rook-Ceph StorageClass configuration, CSI secret names, provisioner name, and volume binding mode are all correct per official Rook documentation.
- The CockroachDB Operator CRD (`crdb.cockroachlabs.com/v1alpha1` with kind `CrdbCluster`) and its field names (`dataStore`, `nodes`, `cockroachDBVersion`, `tlsEnabled`) are correct.
- The `cockroach node status` and `cockroach debug zip` monitoring commands are correct.
- The default data directory `/cockroach/cockroach-data` is correct for the CockroachDB Docker image.
