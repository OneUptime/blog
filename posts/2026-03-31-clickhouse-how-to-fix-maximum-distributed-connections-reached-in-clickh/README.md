# How to Fix 'Maximum distributed connections reached' in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Distributed, Connection Pool, Troubleshooting, Performance

Description: Resolve ClickHouse 'Maximum distributed connections reached' errors by tuning connection pool limits and reducing concurrent distributed query load.

---

## Understanding the Error

When ClickHouse's distributed query engine exhausts its connection pool to remote shards, queries fail with errors such as:

```text
DB::Exception: All connection tries failed. (ALL_CONNECTION_TRIES_FAILED)
```

or, when per-server concurrency limits are hit:

```text
DB::Exception: Too many simultaneous queries. (TOO_MANY_SIMULTANEOUS_QUERIES)
```

This happens under heavy concurrent distributed query load when the connection pool to remote shards fills up or when remote shards reject new queries.

## Checking the Current Connection Pool Status

```sql
-- Check active connections and query concurrency
SELECT metric, value
FROM system.metrics
WHERE metric LIKE '%Connection%' OR metric LIKE '%Distributed%';

-- See active distributed queries
SELECT
    query_id,
    user,
    elapsed,
    left(query, 200) AS q
FROM system.processes
WHERE query LIKE '%Distributed%' OR query LIKE '%_distributed%'
ORDER BY elapsed DESC;
```

## Fix 1 - Increase the Distributed Connection Pool Size

`distributed_connections_pool_size` is a user/profile setting. Raise it in `users.xml`:

```xml
<!-- users.xml -->
<profiles>
  <default>
    <!-- Max simultaneous connections with remote servers for distributed processing -->
    <distributed_connections_pool_size>1024</distributed_connections_pool_size>
  </default>
</profiles>
```

You can also raise the server-wide connection cap in `config.xml`:

```xml
<!-- /etc/clickhouse-server/config.xml -->
<max_connections>4096</max_connections>
```

Or at the session level:

```sql
SET distributed_connections_pool_size = 2048;
```

## Fix 2 - Reduce Distributed Query Concurrency

Limit how many distributed queries can run simultaneously per user:

```xml
<!-- users.xml -->
<profiles>
  <analysts>
    <max_concurrent_queries_for_user>20</max_concurrent_queries_for_user>
  </analysts>
</profiles>
```

Server-wide limits in `config.xml`:

```xml
<!-- config.xml -->
<max_concurrent_queries>100</max_concurrent_queries>
<max_concurrent_select_queries>80</max_concurrent_select_queries>
<max_concurrent_insert_queries>20</max_concurrent_insert_queries>
```

## Fix 3 - Enable Compression for Inter-Shard Traffic

Reduce the network pressure on each connection by enabling compression between shards:

```xml
<!-- config.xml -->
<compression>
  <case>
    <min_part_size>10000000000</min_part_size>
    <min_part_size_ratio>0.01</min_part_size_ratio>
    <method>lz4</method>
  </case>
</compression>
```

## Fix 4 - Use HTTP Keep-Alive for Clients

If clients talk to ClickHouse over HTTP, keep-alive lets them reuse TCP sockets instead of opening a new one per request. This reduces the churn of incoming connections counted against `max_connections` (note: it does not affect the native inter-shard pool used by `Distributed` tables):

```xml
<!-- config.xml -->
<keep_alive_timeout>10</keep_alive_timeout>
```

## Fix 5 - Queue Distributed Queries

Instead of failing, queue excess queries:

```xml
<!-- config.xml -->
<concurrent_threads_soft_limit_num>0</concurrent_threads_soft_limit_num>
<!-- Enable query queue -->
<max_waiting_queries>100</max_waiting_queries>
```

## Identifying the Bottleneck

```sql
-- Find which shards are receiving the most connections
SELECT
    host_name,
    port,
    errors_count,
    estimated_recovery_time
FROM system.clusters
ORDER BY errors_count DESC;

-- Check if specific queries are monopolizing connections
SELECT
    user,
    count() AS query_count,
    max(elapsed) AS max_elapsed_sec
FROM system.processes
GROUP BY user
ORDER BY query_count DESC;
```

## Using Async Distributed Inserts

For write-heavy workloads, use async distributed inserts to reduce connection pressure:

```sql
-- Buffer inserts asynchronously to avoid connection spikes
SET async_insert = 1;
SET wait_for_async_insert = 0;
SET async_insert_max_data_size = 10000000;
SET async_insert_busy_timeout_ms = 200;

INSERT INTO analytics.events_distributed
SELECT * FROM analytics.staging_events;
```

## Summary

"Maximum distributed connections reached" errors occur when many concurrent distributed queries exhaust the connection pool to remote shards. Increase `distributed_connections_pool_size` in `config.xml` for immediate relief, and limit per-user concurrency with `max_concurrent_queries_for_user`. For sustained high-throughput scenarios, combine connection reuse via keep-alive, async inserts, and query queuing to balance load without hitting hard connection limits.
