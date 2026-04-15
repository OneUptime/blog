# Validation Summary: How to Handle ClickHouse Node Failures on Kubernetes

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (ReplicatedMergeTree, ClickHouse Keeper, system.replicas, SYSTEM commands)
- Kubernetes (StatefulSet, PodDisruptionBudget, Pod Anti-Affinity, PersistentVolumeClaims)
- SQL (DDL, system queries)

## Sources Consulted
- ClickHouse Docs: Replicated* table engines — https://clickhouse.com/docs/engines/table-engines/mergetree-family/replication
- ClickHouse Docs: system.replicas — https://clickhouse.com/docs/operations/system-tables/replicas
- ClickHouse Docs: SYSTEM Statements — https://clickhouse.com/docs/sql-reference/statements/system
- ClickHouse Docs: Replicating data — https://clickhouse.com/docs/architecture/replication
- Kubernetes Docs: Pod Anti-Affinity — https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#affinity-and-anti-affinity
- Kubernetes Docs: PodDisruptionBudget — https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes Docs: StatefulSets / volumeClaimTemplates — https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/

## Issues Found
1. **Inaccurate description of `queue_size`**: The post stated "A `queue_size` above zero means the recovered replica is catching up on missed data parts." This is imprecise — `queue_size` reflects all pending operations including merges, mutations, and other replication tasks, not exclusively missed data parts. Fixed to: "A `queue_size` above zero means the replica has pending operations, which may include fetching missed data parts, merges, or other replication tasks."

2. **Conflated description of SYSTEM RESTART REPLICA and SYSTEM SYNC REPLICA**: The post stated both commands together "force the replica to reconnect to Keeper and pull missing data parts," conflating their distinct roles. `SYSTEM RESTART REPLICA` reinitializes the Keeper session and reconciles metadata, while `SYSTEM SYNC REPLICA` waits for the replica to process pending replication log entries. Fixed to clarify each command's specific purpose.

## Review Notes
- All SQL syntax (CREATE TABLE with ON CLUSTER, ReplicatedMergeTree engine parameters, ORDER BY tuple, system.replicas column names) is correct.
- All Kubernetes YAML configurations (pod anti-affinity, PDB with policy/v1, volumeClaimTemplates) are structurally correct and use current API versions.
- The `storageClassName: fast-ssd` is a placeholder name; actual deployments would need a matching StorageClass defined in the cluster, but this is appropriate for a blog example.
- The post uses macro substitutions (`{cluster}`, `{shard}`, `{replica}`) which is the recommended approach for replicated setups, requiring corresponding entries in the ClickHouse server config.
