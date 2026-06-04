# Validation Summary: How to Deploy ClickHouse Keeper Cluster on Kubernetes for ZooKeeper Replacement

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Kubernetes StatefulSet, Service, ConfigMap, probes, and Downward API
- ClickHouse Server
- ClickHouse Keeper
- ZooKeeper-compatible coordination
- Raft quorum configuration
- ReplicatedMergeTree and Distributed table engines

## Sources Consulted
- ClickHouse Keeper official documentation: https://clickhouse.com/docs/guides/sre/keeper/clickhouse-keeper
- ClickHouse configuration files and environment substitution: https://clickhouse.com/docs/operations/configuration-files
- ClickHouse distributed DDL server settings: https://clickhouse.com/docs/operations/server-configuration-parameters/settings#distributed_ddl
- ClickHouse `CREATE TABLE` syntax and `ON CLUSTER`: https://clickhouse.com/docs/sql-reference/statements/create/table
- ClickHouse `system.zookeeper_connection`: https://clickhouse.com/docs/operations/system-tables/zookeeper_connection
- ClickHouse `system.zookeeper_log`: https://clickhouse.com/docs/operations/system-tables/zookeeper_log
- ClickHouse Keeper client utility: https://clickhouse.com/docs/operations/utilities/clickhouse-keeper-client
- ClickHouse production version guidance: https://clickhouse.com/docs/faq/operations/production
- Docker Official Image for ClickHouse: https://hub.docker.com/_/clickhouse
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes Pod API documentation for `env`, `valueFrom`, `command`, and field selectors: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The Keeper container used `clickhouse/clickhouse-server:23.12`, which is outdated for a production-oriented 2026 guide. Updated both Keeper and ClickHouse examples to `clickhouse/clickhouse-server:26.3`.
- The Keeper startup used `--config-file`; the official Keeper standalone example uses `--config`. Updated the command accordingly.
- The post showed an invalid Kubernetes `env` item that combined `valueFrom` and `value`, and the init container example wrote a server ID to `/tmp/server-id` without wiring it into Keeper. Replaced this with a container command that derives `KEEPER_SERVER_ID` from the StatefulSet pod ordinal before starting Keeper.
- The ClickHouse macros used `from_env="SHARD_ID"` and `from_env="REPLICA_ID"` but the StatefulSet did not set those environment variables. Added `SHARD_ID` from the StatefulSet pod-index label and `REPLICA_ID` from `metadata.name`.
- The ClickHouse connection command was inside a `sql` code block, making the example syntactically misleading. Split it into a `bash` block for `kubectl exec` and a separate `sql` block for SQL statements.
- The failure-handling text said operations continue without interruption after losing a Keeper node. Adjusted it to note that reads and writes can pause briefly during leader election.
- The scaling section implied dynamic reconfiguration was automatically available. Clarified that `enable_reconfiguration` must be enabled and that Kubernetes scaling still requires updated Keeper configuration to be rolled out to all Keeper pods.
- The migration steps incorrectly implied that ClickHouse can be pointed at an empty Keeper ensemble when replacing ZooKeeper. Updated the steps to include taking a ZooKeeper snapshot and converting it with `clickhouse-keeper-converter` before switching ClickHouse to Keeper.
- The migration example used a shortened Keeper hostname that was inconsistent with the Kubernetes DNS names used elsewhere. Updated it to the full StatefulSet DNS name.
- The performance tuning snippet duplicated `snapshot_distance` and described `reserved_log_items` as reducing convergence time. Removed the duplicate and corrected the comment to describe log retention before compaction.

## Review Notes
- The edited YAML snippets were parsed successfully with PyYAML, and the embedded XML configuration snippets were parsed successfully with Python's XML parser.
- The ClickHouse macro example now relies on the Kubernetes `apps.kubernetes.io/pod-index` StatefulSet label, which is stable in current Kubernetes releases. Older clusters may need to set `SHARD_ID` another way.
- The examples still use raw Kubernetes manifests. For production, the official ClickHouse Kubernetes Operator may be preferable, but that is outside the scope of this post.
