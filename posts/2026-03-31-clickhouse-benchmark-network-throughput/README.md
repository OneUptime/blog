# How to Benchmark Network Throughput in ClickHouse Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Network Throughput, Cluster, Benchmark, Distributed Query

Description: Learn how to benchmark network throughput in ClickHouse clusters by measuring data transfer rates for distributed queries, replication, and remote reads.

---

## Network Throughput in ClickHouse Clusters

ClickHouse clusters transfer data over the network for distributed query shuffles, replication, and remote reads. Measuring network throughput helps identify bottlenecks when scaling horizontally.

## Prerequisites

A two-node ClickHouse cluster with a distributed table:

```xml
<!-- config.xml cluster definition -->
<remote_servers>
    <my_cluster>
        <shard>
            <replica>
                <host>node1</host>
                <port>9000</port>
            </replica>
        </shard>
        <shard>
            <replica>
                <host>node2</host>
                <port>9000</port>
            </replica>
        </shard>
    </my_cluster>
</remote_servers>
```

## Creating Distributed Tables for Testing

```sql
-- Local table on each shard
CREATE TABLE events_local ON CLUSTER my_cluster
(
    ts DateTime,
    user_id UInt64,
    event_type String,
    payload String
)
ENGINE = MergeTree()
ORDER BY (user_id, ts);

-- Distributed table
CREATE TABLE events ON CLUSTER my_cluster
AS events_local
ENGINE = Distributed(my_cluster, default, events_local, rand());
```

## Inserting a Large Dataset for Throughput Testing

```sql
INSERT INTO events
SELECT
    now() - rand() % 86400 AS ts,
    rand() % 1000000 AS user_id,
    'click' AS event_type,
    repeat('x', 100) AS payload
FROM numbers(10000000);
```

## Measuring Distributed Query Transfer

Run a query that requires cross-shard aggregation and watch network metrics:

```bash
# In one terminal, watch network metrics
clickhouse-client --query "
SELECT
    toStartOfMinute(event_time) AS minute,
    max(ProfileEvent_NetworkReceiveBytes) AS receive_bytes,
    max(ProfileEvent_NetworkSendBytes) AS send_bytes
FROM system.metric_log
GROUP BY minute
ORDER BY minute DESC
LIMIT 20
" --format PrettyCompact

# In another terminal, run the distributed query
time clickhouse-client --query "
SELECT user_id, count() AS events
FROM events
GROUP BY user_id
ORDER BY events DESC
LIMIT 1000
" --format Null
```

## Measuring Replication Bandwidth

```sql
-- Check in-progress part fetches and transfer rates
SELECT
    database,
    table,
    source_replica_hostname,
    total_size_bytes_compressed,
    bytes_read_compressed,
    progress
FROM system.replicated_fetches
ORDER BY total_size_bytes_compressed DESC;
```

## Network Throughput via system.events

```sql
SELECT
    event,
    value,
    round(value / 1024 / 1024, 2) AS mb
FROM system.events
WHERE event IN (
    'NetworkReceiveBytes',
    'NetworkSendBytes',
    'ReadBufferFromS3Bytes',
    'WriteBufferToS3Bytes'
)
ORDER BY event;
```

## Benchmarking Remote Table Function

```bash
time clickhouse-client --query "
SELECT count(), avg(amount)
FROM remote('node2:9000', default.orders, 'default', '')
" --format Null
```

## Optimizing Network Usage

```sql
-- Use GLOBAL IN to avoid sending data from all shards for IN filter
SELECT user_id, count()
FROM events
WHERE user_id GLOBAL IN (
    SELECT user_id FROM events WHERE event_type = 'purchase'
)
GROUP BY user_id;
```

## Summary

ClickHouse cluster network throughput is measured via `system.events` counters `NetworkReceiveBytes` and `NetworkSendBytes` during timed distributed queries. Use `GLOBAL IN` to reduce cross-shard data transfer, and monitor `system.replicated_fetches` for replication bandwidth consumption.
