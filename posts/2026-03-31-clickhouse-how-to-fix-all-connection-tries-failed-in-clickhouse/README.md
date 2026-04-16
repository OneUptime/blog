# How to Fix 'All connection tries failed' in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Connection, Networking, Troubleshooting, Distributed System

Description: Resolve ClickHouse 'All connection tries failed' errors in distributed setups by checking shard availability, network configuration, and connection pool settings.

---

## Understanding the Error

When a ClickHouse distributed query cannot reach any shard, it raises:

```text
DB::Exception: All connection tries failed. Failed to connect to all replicas. (ALL_CONNECTION_TRIES_FAILED)
```

This error appears at the query coordinator when none of the destination shards (or replicas within a shard) are reachable.

## Step 1 - Verify Cluster Configuration

```sql
-- Check your cluster definition
SELECT
    cluster,
    shard_num,
    replica_num,
    host_name,
    port,
    errors_count,
    estimated_recovery_time
FROM system.clusters
WHERE cluster = 'my_cluster'
ORDER BY shard_num, replica_num;
```

High `errors_count` or non-zero `estimated_recovery_time` identifies the unreachable node.

## Step 2 - Test Connectivity

```bash
# Test TCP connectivity to the ClickHouse native port
nc -zv clickhouse-shard1.internal 9000

# Test HTTP port
curl -s http://clickhouse-shard1.internal:8123/ping

# Check DNS resolution
dig clickhouse-shard1.internal
nslookup clickhouse-shard1.internal
```

## Step 3 - Check if the Remote Server is Running

```bash
# SSH to the shard node and check the service
ssh clickhouse-shard1.internal
systemctl status clickhouse-server

# Check for OOM kills or crash signals
journalctl -u clickhouse-server --since "1 hour ago" | tail -50

# Check if the port is open
ss -tlnp | grep 9000
```

## Common Fixes

### Fix 1 - Restart a Down Shard Node

```bash
systemctl start clickhouse-server

# Verify it is up
clickhouse-client --host clickhouse-shard1.internal --query "SELECT 1"
```

### Fix 2 - Update Cluster Configuration

If a shard address changed (e.g., after a migration), update `config.xml`:

```xml
<remote_servers>
  <my_cluster>
    <shard>
      <replica>
        <host>clickhouse-shard1-new.internal</host>
        <port>9000</port>
      </replica>
    </shard>
    <shard>
      <replica>
        <host>clickhouse-shard2.internal</host>
        <port>9000</port>
      </replica>
    </shard>
  </my_cluster>
</remote_servers>
```

Reload the config without restart. ClickHouse automatically picks up config file changes (polled every `config_reload_interval_ms`, default 2000ms), or you can trigger a reload explicitly:

```sql
SYSTEM RELOAD CONFIG;
```

### Fix 3 - Allow Partial Distributed Query Execution

If you can tolerate missing data from an unavailable shard:

```sql
-- Skip unavailable shards instead of failing
SET skip_unavailable_shards = 1;

SELECT count() FROM analytics.events_distributed;
```

### Fix 4 - Increase Connection Retry Settings

```xml
<!-- config.xml -->
<distributed_connections_pool_size>1024</distributed_connections_pool_size>
<connect_timeout>10</connect_timeout>
<receive_timeout>300</receive_timeout>
<send_timeout>300</send_timeout>
```

Or at query time:

```sql
SET connect_timeout_with_failover_ms = 5000;
SET connections_with_failover_max_tries = 5;
```

### Fix 5 - Fix Firewall or Security Group Rules

```bash
# Check if firewall is blocking port 9000
iptables -L INPUT -n | grep 9000

# Allow ClickHouse native protocol port
iptables -A INPUT -p tcp --dport 9000 -s clickhouse-coordinator.internal -j ACCEPT

# On cloud: ensure security group allows inter-node traffic on port 9000
```

## Monitoring Connection Errors

```sql
-- Track connection failures over time
SELECT
    toStartOfHour(event_time) AS hour,
    hostname,
    count() AS errors
FROM system.query_log
WHERE exception LIKE '%connection%failed%'
  AND event_time > now() - INTERVAL 24 HOUR
GROUP BY hour, hostname
ORDER BY hour, errors DESC;
```

## Summary

"All connection tries failed" in ClickHouse indicates that a distributed query coordinator cannot reach any replica in a shard. Diagnose with `system.clusters` to identify the failing host, then verify connectivity with `nc` and `curl`. Common fixes include restarting stopped nodes, correcting cluster configuration after infrastructure changes, and enabling `skip_unavailable_shards` to keep queries running during partial outages.
