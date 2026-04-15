# How to Use parallel_replicas Settings in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, parallel_replicas, Distributed Query, Performance, Cluster

Description: Learn how ClickHouse's parallel replicas feature spreads a single query across multiple replicas simultaneously to accelerate large analytical queries.

---

ClickHouse's parallel replicas feature allows a single query to be split across multiple replicas in a shard, giving you horizontal scaling for read queries without requiring a distributed table. Instead of one replica handling the entire query, multiple replicas each process a portion of the data and return results to the initiating node.

## How Parallel Replicas Work

In a standard ReplicatedMergeTree setup, only the local replica processes a query. With parallel replicas enabled, ClickHouse coordinates with other replicas to divide the table's granules among them. Each replica processes its assigned granules and sends results back to the coordinator.

This is fundamentally different from distributed tables: parallel replicas work within a single shard's replicas, not across shards.

## Enabling Parallel Replicas

```sql
-- Enable parallel replicas
SET allow_experimental_parallel_reading_from_replicas = 1;

-- Set the number of replicas to use
SET max_parallel_replicas = 3;

-- Required: specify which cluster to use
SET cluster_for_parallel_replicas = 'my_cluster';
```

For a query:

```sql
SELECT
    toStartOfDay(event_time) AS day,
    event_type,
    count() AS cnt
FROM events
WHERE event_date BETWEEN '2026-01-01' AND '2026-03-31'
GROUP BY day, event_type
ORDER BY day, cnt DESC
SETTINGS
    allow_experimental_parallel_reading_from_replicas = 1,
    max_parallel_replicas = 3,
    cluster_for_parallel_replicas = 'my_cluster';
```

## Configuration via users.xml

For consistent parallel replica usage:

```xml
<clickhouse>
  <profiles>
    <analytics>
      <allow_experimental_parallel_reading_from_replicas>1</allow_experimental_parallel_reading_from_replicas>
      <max_parallel_replicas>3</max_parallel_replicas>
      <cluster_for_parallel_replicas>my_cluster</cluster_for_parallel_replicas>
    </analytics>
  </profiles>
</clickhouse>
```

## Granule Distribution Strategy

The coordinator node creates a list of mark range tasks and distributes them dynamically across replicas. Replicas request work from the coordinator, and faster replicas automatically receive more tasks. This task-stealing approach ensures efficient load balancing even when replicas have different performance characteristics.

## Monitoring Parallel Replica Usage

```sql
SELECT
    query_id,
    read_rows,
    read_bytes,
    query_duration_ms,
    Settings['max_parallel_replicas'] AS replicas_used
FROM system.query_log
WHERE type = 'QueryFinish'
  AND Settings['allow_experimental_parallel_reading_from_replicas'] = '1'
ORDER BY event_time DESC
LIMIT 10;
```

Check which replicas participated:

```sql
SELECT *
FROM system.query_log
WHERE query_id = 'your-query-id'
  AND type = 'QueryFinish';
```

## Requirements and Limitations

Parallel replicas require:

1. A cluster defined in the server configuration with replicas in the same shard.
2. The query must target a `ReplicatedMergeTree` table (or a Distributed table that routes to one).
3. ClickHouse version 23.3 or later for stable support.

```xml
<clickhouse>
  <remote_servers>
    <my_cluster>
      <shard>
        <replica>
          <host>clickhouse-01</host>
          <port>9000</port>
        </replica>
        <replica>
          <host>clickhouse-02</host>
          <port>9000</port>
        </replica>
        <replica>
          <host>clickhouse-03</host>
          <port>9000</port>
        </replica>
      </shard>
    </my_cluster>
  </remote_servers>
</clickhouse>
```

## Summary

ClickHouse's parallel replicas feature distributes a single query across multiple replicas in a shard, accelerating large analytical queries without requiring additional shards. Enable it with `allow_experimental_parallel_reading_from_replicas = 1`, `max_parallel_replicas` set to the number of available replicas, and `cluster_for_parallel_replicas` pointing to your cluster. This is especially effective for full-table scans and aggregations over large datasets in replicated deployments.
