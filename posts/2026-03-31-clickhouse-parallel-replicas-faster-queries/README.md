# How to Use Parallel Replicas for Faster Queries in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Parallel Replica, Query Optimization, Distributed Query, Performance

Description: Learn how ClickHouse parallel replicas distribute a single query across multiple replica nodes to reduce query latency on large tables.

---

ClickHouse parallel replicas allow a single query to be parallelized across multiple replica nodes in a cluster, not just across shards. This is especially useful for latency-sensitive queries on large, well-replicated tables.

## How Parallel Replicas Work

In standard ClickHouse, a query on a replicated table reads from a single replica. With parallel replicas enabled, ClickHouse splits the data granules across multiple replicas and merges results, which can significantly reduce query time as more replicas are used.

## Enabling Parallel Replicas

```sql
SET enable_parallel_replicas = 1;
SET max_parallel_replicas = 3;
SET parallel_replicas_for_non_replicated_merge_tree = 0;
```

## Running a Query with Parallel Replicas

```sql
SELECT count(), avg(value)
FROM large_metrics
WHERE ts >= now() - INTERVAL 1 HOUR
SETTINGS
    enable_parallel_replicas = 1,
    max_parallel_replicas = 3;
```

## Cluster Configuration Requirement

Parallel replicas require ClickHouse Keeper or ZooKeeper and a cluster definition in `config.xml`:

```xml
<remote_servers>
    <analytics_cluster>
        <shard>
            <replica>
                <host>ch-node-01</host>
                <port>9000</port>
            </replica>
            <replica>
                <host>ch-node-02</host>
                <port>9000</port>
            </replica>
            <replica>
                <host>ch-node-03</host>
                <port>9000</port>
            </replica>
        </shard>
    </analytics_cluster>
</remote_servers>
```

## Specifying the Cluster

```sql
SELECT count() FROM large_table
SETTINGS
    enable_parallel_replicas = 1,
    max_parallel_replicas = 3,
    cluster_for_parallel_replicas = 'analytics_cluster';
```

## Observing Parallelism in EXPLAIN

```sql
EXPLAIN PIPELINE
SELECT count() FROM large_metrics
SETTINGS enable_parallel_replicas = 1, max_parallel_replicas = 2;
```

Look for multiple `MergeTreeThread` or `RemoteSource` stages in the output.

## Monitoring Replica Usage

```sql
SELECT
    query,
    query_duration_ms,
    read_rows,
    read_bytes
FROM system.query_log
WHERE query LIKE '%large_metrics%'
ORDER BY event_time DESC
LIMIT 5;
```

## Limitations

- Not all query types benefit equally (range scans benefit most)
- Adds coordination overhead for very short queries
- Not supported with the FINAL clause or when using projections
- Requires the `enable_analyzer` setting to be enabled

## Summary

Parallel replicas in ClickHouse unlock horizontal scaling for individual queries without resharding. Enable them for latency-sensitive analytical queries on large replicated tables, tuning `max_parallel_replicas` to match your replica count.
