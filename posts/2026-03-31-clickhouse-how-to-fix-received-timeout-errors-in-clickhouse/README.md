# How to Fix 'Received timeout' Errors in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Timeout, Debugging, Performance, Troubleshooting

Description: Diagnose and resolve 'Received timeout' errors in ClickHouse by tuning connection, query, and receive timeout settings for your workload.

---

## Understanding the Error

ClickHouse raises a `Received timeout` error when a client or server waits longer than configured for a response. The error text typically reads:

```text
DB::Exception: Received timeout while reading from socket. (SOCKET_TIMEOUT)
```

Timeouts can happen at the client-connection layer, during heavy query execution, or during inter-node communication in a distributed cluster.

## Types of Timeout Settings

ClickHouse has several distinct timeout parameters. Knowing which one fired helps you apply the right fix.

| Setting | Scope | Default |
|---|---|---|
| `connect_timeout` | TCP handshake | 10s |
| `receive_timeout` | Reading server response | 300s |
| `send_timeout` | Sending data to server | 300s |
| `max_execution_time` | Total query execution | 0 (unlimited) |
| `connect_timeout_with_failover_ms` | Shard connection (with failover) | 1000ms |

```sql
-- Check current session timeout values
SELECT name, value, description
FROM system.settings
WHERE name LIKE '%timeout%'
ORDER BY name;
```

## Common Causes and Fixes

### Long-Running Queries

A query that scans too much data will exhaust `receive_timeout`. First profile the query:

```sql
-- Check active queries and their elapsed time
SELECT
    query_id,
    elapsed,
    read_rows,
    read_bytes,
    memory_usage,
    query
FROM system.processes
ORDER BY elapsed DESC;
```

Then increase the timeout for heavy analytical queries at the session level:

```sql
-- Increase receive_timeout for this session only
SET receive_timeout = 600;
SET max_execution_time = 600;

SELECT count(), sum(revenue)
FROM analytics.sales
WHERE sale_date >= '2024-01-01';
```

### Misconfigured config.xml Defaults

For server-wide changes, edit `/etc/clickhouse-server/users.xml`:

```xml
<profiles>
  <default>
    <max_execution_time>600</max_execution_time>
    <receive_timeout>600</receive_timeout>
    <send_timeout>600</send_timeout>
  </default>
</profiles>
```

### Distributed Query Timeouts

In a multi-shard setup, one slow shard causes the coordinator to time out. Check per-shard latency:

```sql
-- Inspect distributed table settings
SELECT
    host_name,
    port,
    errors_count,
    estimated_recovery_time
FROM system.clusters
WHERE cluster = 'my_cluster';
```

Tune distributed-specific timeouts:

```sql
SET connect_timeout_with_failover_ms = 3000;
SET connect_timeout_with_failover_secure_ms = 3000;
```

### Network Bottlenecks

High inter-node traffic compresses or fragments responses. Enable compression to reduce transfer size:

```sql
SET enable_http_compression = 1;
SET http_zlib_compression_level = 3;
```

From the CLI, verify network latency between nodes:

```bash
# Test TCP connectivity to ClickHouse port
nc -zv clickhouse-shard-2.internal 9000

# Check for packet loss
ping -c 20 clickhouse-shard-2.internal
```

## Monitoring Timeout Events

```sql
-- Count timeout errors in the last 24 hours
SELECT
    toStartOfHour(event_time) AS hour,
    count() AS errors
FROM system.query_log
WHERE exception LIKE '%timeout%'
  AND event_time > now() - INTERVAL 24 HOUR
GROUP BY hour
ORDER BY hour;
```

## Summary

`Received timeout` errors in ClickHouse stem from slow queries, conservative timeout defaults, distributed shard lag, or network issues. Identify which timeout fired using `system.settings` and `system.processes`, then tune the appropriate setting at session, profile, or server level. For distributed deployments, monitor `system.clusters` to catch unhealthy shards before they cascade into client-visible timeouts.
