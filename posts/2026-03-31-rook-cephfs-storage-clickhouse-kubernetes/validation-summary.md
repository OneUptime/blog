# Validation Summary: How to Set Up CephFS Storage for ClickHouse on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (CephFilesystem CRD, CephFS CSI StorageClass)
- Kubernetes (StorageClass, PersistentVolumeClaims)
- ClickHouse (MergeTree engine, Distributed engine, storage configuration, user profiles)
- Altinity ClickHouse Operator (ClickHouseInstallation CRD)
- CephFS (shared filesystem via CSI)

## Sources Consulted
- Altinity ClickHouse Operator Custom Resource documentation: https://github.com/Altinity/clickhouse-operator/blob/master/docs/custom_resource_explained.md
- Altinity ClickHouse Operator full example: https://github.com/Altinity/clickhouse-operator/blob/master/docs/chi-examples/99-clickhouseinstallation-max.yaml
- ClickHouse Settings Profiles documentation: https://clickhouse.com/docs/operations/settings/settings-profiles
- ClickHouse Configuration Files documentation: https://clickhouse.com/docs/operations/configuration-files
- ClickHouse Server Configuration Parameters: https://clickhouse.com/docs/operations/server-configuration-parameters/settings
- Rook CephFS documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/

## Issues Found

### 1. Altinity Operator templates not referenced (lines 73-98)
**What was wrong:** The `spec.templates.volumeClaimTemplates` and `spec.templates.podTemplates` were defined but never referenced. In the Altinity ClickHouse Operator, defining templates only declares them — they must be explicitly referenced via `spec.defaults.templates` (or at the cluster/shard/replica level) to be applied to ClickHouse pods.

**What was changed:** Added a `spec.defaults.templates` block referencing both `dataVolumeClaimTemplate: clickhouse-storage` and `podTemplate: pod-template`, so the operator actually uses the defined templates.

**Why:** Without these references, the operator ignores the custom templates and uses its built-in defaults, meaning the CephFS StorageClass and custom pod spec would never be applied.

### 2. Query-level settings placed in server config (lines 124-126)
**What was wrong:** `max_memory_usage` and `max_bytes_before_external_group_by` were placed directly under `<clickhouse>` in `config.d/storage.xml`. These are query-level settings that belong in user profiles (`users.xml` or `users.d/`), not in server configuration files (`config.d/`). Placing them in `config.d/` has no effect — ClickHouse ignores unrecognized server-level settings.

**What was changed:** Moved the settings into a separate `users.d/profiles.xml` config block wrapped in `<profiles><default>`, which is the correct location for default query-level settings.

**Why:** The `<default>` profile in `users.d/` is automatically applied to all users with the default profile, ensuring these memory limits take effect for analytical queries.

## Review Notes
- The CephFilesystem CRD and StorageClass YAML are correct for Rook-Ceph and follow current best practices.
- The SQL examples (CREATE TABLE ON CLUSTER, Distributed engine, MergeTree) are syntactically correct and use proper ClickHouse syntax.
- The `clickhouse/clickhouse-server:24.1` image tag is valid. Users may want to update to a more recent version (e.g., 24.3 or later) for newer features.
- The post describes CephFS for "shared data directories" across ClickHouse instances. In practice, with the Altinity operator, each ClickHouse pod gets its own PVC (even with ReadWriteMany access mode), so the data is not literally shared across pods. CephFS with RWX is more relevant for backup destinations, shared configuration, or DDL synchronization directories — not the main data path. The actual implementation in the YAML is workable since each pod gets a separate PVC, but the framing could be more precise.
- ClickHouse's distributed mode relies on its own replication protocol (via ClickHouse Keeper or ZooKeeper), not shared filesystem access. The Distributed engine routes queries across shards but each shard maintains its own data. For true replication, `ReplicatedMergeTree` with Keeper coordination is the standard approach.
