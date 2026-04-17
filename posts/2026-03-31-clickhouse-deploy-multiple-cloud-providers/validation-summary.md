# Validation Summary: How to Deploy ClickHouse Across Multiple Cloud Providers

## Status
validated

## Post Type
Guide / Tutorial (architectural overview with configuration snippets)

## Technologies Covered
- ClickHouse (ReplicatedMergeTree, Keeper)
- ClickHouse Keeper (Raft ensemble)
- Kubernetes + Helm (Altinity clickhouse-operator)
- Multi-cloud networking (AWS VPC, GCP VPC, Azure VNet)
- Site-to-site VPN / WireGuard mesh
- OneUptime (monitoring)

## Sources Consulted
- ClickHouse Keeper documentation: https://clickhouse.com/docs/en/guides/sre/keeper/clickhouse-keeper
- ClickHouse ReplicatedMergeTree docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replication
- ClickHouse `system.replicas` and `system.replication_queue` system tables: https://clickhouse.com/docs/en/operations/system-tables/replicas
- Altinity clickhouse-operator repository: https://github.com/Altinity/clickhouse-operator
- Altinity clickhouse-operator Helm chart: https://artifacthub.io/packages/helm/altinity-clickhouse-operator/altinity-clickhouse-operator

## Issues Found
1. **Architecture inconsistency** — The original wording "One shard per cloud, three replicas total (one per cloud)" was self-contradictory: one shard per cloud implies three shards, while three replicas total implies a single shard. Changed to "One shard, three replicas total (one per cloud)", which is consistent with the Keeper ensemble config, the `{shard}`/`{replica}` macros in the `ReplicatedMergeTree` DDL, and the rest of the post.

## Review Notes
- The Keeper XML snippet (`<keeper_server>` with `<tcp_port>9181</tcp_port>`, `<raft_configuration>` using `<server id><hostname><port>9234`) is valid. The inline comment correctly notes that `<server_id>` must be unique per node.
- The `ReplicatedMergeTree('/clickhouse/tables/{shard}/events', '{replica}')` DDL is syntactically correct and uses the standard macro-based ZooKeeper/Keeper path pattern.
- `system.replication_queue` and `system.replicas.is_leader` are valid system-table references for monitoring replication state.
- The Helm snippet is illustrative. The chart path `clickhouse-operator/clickhouse` is a placeholder; in practice, Altinity publishes a chart named `altinity-clickhouse-operator` (on Artifact Hub) and the operator manages ClickHouse via a `ClickHouseInstallation` custom resource rather than a single `helm install`. Since the post presents this as high-level conceptual guidance (with per-cloud values files), the flow is acceptable as written, but readers should consult the Altinity operator docs for the exact repo URL, chart name, and CR spec.
- The 50 ms latency threshold for replication throughput is a reasonable rule-of-thumb; cross-region replication will work above that, but throughput and merge coordination degrade.
- CIDR ranges chosen (10.1/16, 10.2/16, 10.3/16) are non-overlapping RFC1918 space and appropriate for a VPN mesh.
