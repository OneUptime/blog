# How to Handle ClickHouse Node Failures on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Kubernetes, High Availability, Replication, StatefulSet

Description: Learn how to configure ClickHouse on Kubernetes to automatically recover from node failures using replication, pod disruption budgets, and anti-affinity rules.

---

Node failures are inevitable in Kubernetes clusters. ClickHouse's built-in replication, combined with proper Kubernetes primitives, ensures your database remains available even when nodes go down.

## Replication as the Foundation

ClickHouse uses ReplicatedMergeTree tables and ClickHouse Keeper (or ZooKeeper) to maintain data across replicas. When a node fails, the surviving replica continues serving reads, and once the failed node recovers, it re-syncs automatically.

Create replicated tables with a consistent path scheme:

```sql
CREATE TABLE events ON CLUSTER '{cluster}'
(
    event_time DateTime,
    user_id UInt64,
    event_type String
)
ENGINE = ReplicatedMergeTree(
    '/clickhouse/tables/{shard}/events',
    '{replica}'
)
ORDER BY (event_time, user_id);
```

## Anti-Affinity Rules

Spread ClickHouse replicas across different Kubernetes nodes to avoid a single node failure taking down all replicas:

```yaml
spec:
  template:
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchExpressions:
                  - key: app
                    operator: In
                    values:
                      - clickhouse
              topologyKey: kubernetes.io/hostname
```

Use `preferredDuringSchedulingIgnoredDuringExecution` if you want soft anti-affinity that doesn't block scheduling when insufficient nodes are available.

## Pod Disruption Budgets

Prevent Kubernetes from evicting too many ClickHouse pods during voluntary disruptions like node upgrades:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: clickhouse-pdb
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: clickhouse
```

This ensures at least one replica is always available during rolling node maintenance.

## StatefulSet with Persistent Volumes

StatefulSets preserve PVCs across pod restarts, so data is not lost on node failure - only the pod needs to be rescheduled:

```yaml
volumeClaimTemplates:
  - metadata:
      name: clickhouse-data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 500Gi
```

## Monitoring Replica Health

After a node failure, check replication status:

```sql
SELECT
    database,
    table,
    is_leader,
    total_replicas,
    active_replicas,
    queue_size
FROM system.replicas
WHERE active_replicas < total_replicas;
```

A `queue_size` above zero means the replica has pending operations, which may include fetching missed data parts, merges, or other replication tasks.

## Forcing Replica Recovery

If a replica gets stuck after recovery:

```sql
SYSTEM RESTART REPLICA events;
SYSTEM SYNC REPLICA events;
```

`RESTART REPLICA` reinitializes the replica's Keeper session and reconciles its state, while `SYNC REPLICA` waits for the replica to process all pending replication tasks and catch up on missing data.

## Summary

Handling ClickHouse node failures on Kubernetes requires a combination of ReplicatedMergeTree tables for data redundancy, pod anti-affinity rules to spread replicas across physical nodes, Pod Disruption Budgets to control voluntary disruptions, and monitoring queries against `system.replicas` to detect and respond to recovery issues.
