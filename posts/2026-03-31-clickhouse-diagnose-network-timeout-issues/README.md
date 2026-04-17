# How to Diagnose ClickHouse Network Timeout Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Network Timeout, Distributed Query, Diagnosis, TCP, Configuration

Description: Diagnose and resolve ClickHouse network timeout errors in distributed queries by identifying slow shards, tuning timeout settings, and checking TCP configuration.

---

## Common Timeout Error Messages

```text
Code: 159. DB::Exception: Timeout exceeded while reading from socket
Code: 209. DB::Exception: Socket timeout exceeded
Code: 279. DB::Exception: All connection trials failed
```

These indicate that the coordinator node timed out waiting for a shard response.

## Step 1 - Identify Which Shard Is Slow

```sql
SELECT
    shard_num,
    host_name,
    host_address,
    port,
    is_local,
    errors_count,
    estimated_recovery_time
FROM system.clusters
WHERE cluster = 'my_cluster'
ORDER BY errors_count DESC;
```

High `errors_count` and a non-zero `estimated_recovery_time` point to a problem shard.

## Step 2 - Test Connectivity to the Shard

From the coordinator node:

```bash
clickhouse-client --host shard2.internal --port 9000 --query "SELECT 1"
```

If this hangs or times out, the issue is network-level.

Check TCP connectivity:

```bash
nc -zv shard2.internal 9000
nc -zv shard2.internal 9009  # interserver HTTP port (replication)
```

## Step 3 - Check Shard Load

On the slow shard:

```sql
SELECT
    query_id,
    elapsed,
    read_rows,
    memory_usage,
    query
FROM system.processes
ORDER BY elapsed DESC
LIMIT 10;
```

If the shard is overloaded, its response time exceeds the timeout threshold on the coordinator.

## Step 4 - Review Timeout Configuration

Current timeout settings:

```sql
SELECT name, value
FROM system.settings
WHERE name IN (
    'receive_timeout',
    'send_timeout',
    'connect_timeout_with_failover_ms',
    'tcp_keep_alive_timeout'
);
```

Increase timeouts for slow networks:

```sql
SET receive_timeout = 300;
SET send_timeout = 300;
SET connect_timeout_with_failover_ms = 1000;
```

## Step 5 - TCP Keep-Alive Configuration

Long-running distributed queries can be killed by intermediate firewalls or load balancers that drop idle connections. Enable TCP keep-alive:

```xml
<!-- config.xml -->
<tcp_keep_alive_timeout>290</tcp_keep_alive_timeout>
```

On Linux:

```bash
sysctl -w net.ipv4.tcp_keepalive_time=60
sysctl -w net.ipv4.tcp_keepalive_intvl=10
sysctl -w net.ipv4.tcp_keepalive_probes=5
```

## Step 6 - Enable Skip Unavailable Shards

For non-critical queries, allow partial results when a shard is unreachable:

```sql
SELECT count()
FROM distributed_events
SETTINGS skip_unavailable_shards = 1;
```

## Summary

Diagnose ClickHouse network timeouts by checking `system.clusters` for error-prone shards, testing direct TCP connectivity, reviewing `system.processes` on the slow shard, and tuning timeout settings. For long queries over slow networks, enable TCP keep-alive to prevent firewall-induced connection drops.
