# Validation Summary: How to Set Up Ceph RBD Storage for TiDB on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (RBD block storage, OSD pools, CSI provisioner)
- TiDB (distributed SQL database v7.5.0)
- TiDB Operator (TidbCluster CRD, pingcap.com/v1alpha1)
- TiKV (RocksDB storage engine tuning)
- PD (Placement Driver cluster metadata)
- Kubernetes (StorageClass, PersistentVolume provisioning)

## Sources Consulted
- TiDB Operator documentation for TidbCluster CR spec and config format (https://docs.pingcap.com/tidb-in-kubernetes/stable/configure-a-tidb-cluster)
- TiKV configuration reference for RocksDB and RaftDB parameters (https://docs.pingcap.com/tidb/stable/tikv-configuration-file)
- TiDB information_schema reference for TIKV_REGION_PEERS table (https://docs.pingcap.com/tidb/stable/information-schema-tikv-region-peers)
- Rook-Ceph documentation for RBD StorageClass parameters (https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/)
- Ceph documentation for OSD pool creation and RBD pool initialization

## Issues Found

### 1. TiDB Operator config format used flat dotted-key notation instead of nested YAML
**What was wrong:** The `config` fields for PD and TiKV in the TidbCluster CR used flat dotted keys (e.g., `replication.max-replicas: 3`, `storage.block-cache.capacity: "4GB"`). TiDB Operator expects nested YAML structure that maps to the component's TOML configuration hierarchy.
**What was changed:** Converted all config fields to proper nested YAML structure (e.g., `replication:` -> `max-replicas: 3`, `storage:` -> `block-cache:` -> `capacity: "4GB"`).
**Why:** The flat notation would be interpreted as literal single keys rather than nested TOML sections, causing the configuration to not be applied correctly.

### 2. RocksDB level0 write triggers placed at wrong config nesting level
**What was wrong:** `level0-slowdown-writes-trigger` and `level0-stop-writes-trigger` were placed directly under `rocksdb`, but these are column-family-level options that belong under `rocksdb.defaultcf`.
**What was changed:** Moved these parameters under `rocksdb: defaultcf:` in the nested YAML config.
**Why:** These are per-column-family RocksDB options. Placing them at the top-level `rocksdb` section would have no effect since TiKV expects them under a specific column family (`defaultcf`, `writecf`, or `lockcf`).

### 3. Incorrect system table for region distribution query
**What was wrong:** The monitoring SQL query used `information_schema.tikv_region_status` with a `store_id` column, but this table does not contain store-level information. Region-to-store mapping is in `information_schema.tikv_region_peers`.
**What was changed:** Changed the table to `tikv_region_peers`, added `WHERE is_leader = 1` filter to count leader regions per store, and updated the comment for clarity.
**Why:** The `tikv_region_status` table contains region metadata (table mappings, approximate sizes) but not store assignment. The `tikv_region_peers` table has `STORE_ID` and `IS_LEADER` columns needed for this query.

## Review Notes
- The `metrics_schema.tikv_store_size_bytes` query is version-dependent; `metrics_schema` requires a properly configured Prometheus data source in TiDB. This is documented behavior but worth noting for readers whose clusters may not have it configured.
- The Ceph pool creation commands manually specify PG counts (128, 32). Modern Ceph clusters (Nautilus+) support PG autoscaling, which may be preferable in production. The manual approach shown is still valid.
- The post mentions TiFlash in the requirements table but does not include a StorageClass or pool for it. This is not an error (the post focuses on TiKV and PD), but readers deploying TiFlash would need to create an additional pool.
