# How to Use cluster() and clusterAllReplicas() Table Functions in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Cluster, Distributed Query, Table Function, Replication, Sharding

Description: Learn how to use cluster() and clusterAllReplicas() table functions in ClickHouse to query all shards and replicas without Distributed tables.

---

## Overview

ClickHouse's `cluster()` and `clusterAllReplicas()` table functions let you query data across multiple shards or replicas on the fly without needing a pre-created `Distributed` table. They are especially useful for ad-hoc federation, administrative queries, and cross-cluster aggregations.

## cluster() Table Function

`cluster(cluster_name, database, table)` queries one replica per shard in the named cluster, similar to a regular `Distributed` table read.

```sql
SELECT
    _shard_num,
    count() AS row_count
FROM cluster('my_cluster', 'analytics', 'events')
GROUP BY _shard_num
ORDER BY _shard_num;
```

The cluster name must match a cluster defined in `config.xml` or `remote_servers.xml`:

```xml
<remote_servers>
    <my_cluster>
        <shard>
            <replica><host>ch-node-1</host><port>9000</port></replica>
            <replica><host>ch-node-2</host><port>9000</port></replica>
        </shard>
        <shard>
            <replica><host>ch-node-3</host><port>9000</port></replica>
            <replica><host>ch-node-4</host><port>9000</port></replica>
        </shard>
    </my_cluster>
</remote_servers>
```

## clusterAllReplicas() Table Function

`clusterAllReplicas(cluster_name, database, table)` queries every replica on every shard, not just one per shard. This is useful for:

- Verifying replication consistency
- Collecting per-node metrics
- Administrative audits

```sql
SELECT
    hostName() AS node,
    count() AS local_rows
FROM clusterAllReplicas('my_cluster', 'analytics', 'events')
GROUP BY node
ORDER BY node;
```

## Checking Data Consistency Across Replicas

Use `clusterAllReplicas()` to spot replication lag:

```sql
SELECT
    hostName() AS node,
    max(event_time) AS latest_event
FROM clusterAllReplicas('my_cluster', 'analytics', 'events')
GROUP BY node
ORDER BY node;
```

If replicas return different `max(event_time)` values, replication is behind on some nodes.

## Using with a Custom Query

You can also pass the full database and table inline, or use the `Merge` engine pattern:

```sql
SELECT count()
FROM cluster('my_cluster', system.parts)
WHERE table = 'events'
  AND active = 1;
```

This queries `system.parts` on every shard simultaneously, useful for cluster-wide storage audits.

## Difference Between cluster() and a Distributed Table

| Feature | cluster() | Distributed Table |
|---|---|---|
| Pre-created | No | Yes |
| Ad-hoc use | Yes | No |
| Sharding key | N/A (read only) | Required for writes |
| Scope | One replica per shard | One replica per shard |

`clusterAllReplicas()` has no Distributed table equivalent - it is unique to table functions.

## Performance Considerations

- Both functions send a sub-query to every participating node
- Results are assembled by the query coordinator
- Large result sets from remote nodes create network pressure
- Always apply WHERE filters to reduce data transferred from remote nodes

```sql
-- Good: filter pushed to shards
SELECT count()
FROM cluster('my_cluster', 'analytics', 'events')
WHERE toDate(event_time) = today();
```

## Summary

`cluster()` and `clusterAllReplicas()` are powerful ClickHouse table functions for querying distributed data without pre-created Distributed tables. Use `cluster()` for standard distributed reads and `clusterAllReplicas()` for replication audits and per-node diagnostics. Always include WHERE filters to minimize inter-node data transfer.
