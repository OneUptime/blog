# Validation Summary: How to Use Shared Merge Tree Engine in ClickHouse Cloud

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse Cloud
- SharedMergeTree table engine
- ClickHouse Keeper (metadata coordination)
- Shared object storage (S3, GCS)

## Sources Consulted
- ClickHouse SharedMergeTree documentation: https://clickhouse.com/docs/en/cloud/reference/shared-merge-tree
- ClickHouse MergeTree engine documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse zero-copy replication documentation (to verify terminology distinction)
- ClickHouse clusterAllReplicas table function documentation

## Issues Found

1. **Incorrect use of "zero-copy replication" terminology.** The post had a section titled "Zero-Copy Replication" describing SharedMergeTree's behavior. However, "zero-copy replication" is a separate, deprecated ClickHouse feature for ReplicatedMergeTree with S3/HDFS disks (disabled by default since version 22.8 and not recommended for production). SharedMergeTree uses a fundamentally different architecture described in the official docs as "asynchronous leaderless replication" with shared storage and ClickHouse Keeper coordination. Renamed the section to "Lightweight Node Scaling" and corrected the description to reference asynchronous leaderless replication and ClickHouse Keeper.

2. **Missing string quotes on cluster name in `clusterAllReplicas` call.** The query `SELECT * FROM clusterAllReplicas(default, system.one)` had `default` as a bare identifier instead of a string literal. The first argument to `clusterAllReplicas` is a cluster name string. Fixed to `clusterAllReplicas('default', system.one)`.

## Review Notes
- The post correctly states that `ENGINE = MergeTree()` automatically maps to SharedMergeTree in ClickHouse Cloud. This is well-documented behavior.
- The `PARTITION BY toYYYYMM(event_time)` syntax is correct and matches official examples.
- The claim about local SSD caching on each node is accurate for ClickHouse Cloud architecture, though this is an infrastructure feature rather than a SharedMergeTree engine feature specifically.
- The post mentions S3 and GCS as shared storage backends. The official docs also list MinIO and Azure Blob Storage as supported backends, but omitting these is not an error for a ClickHouse Cloud-focused post since Cloud primarily uses S3 and GCS.
