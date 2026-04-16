# How to Fix 'Network is unreachable' for ClickHouse Replication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Replication, Networking, Troubleshooting, Distributed System

Description: Fix ClickHouse 'Network is unreachable' replication errors by diagnosing inter-node connectivity, DNS resolution, and firewall configuration.

---

## Understanding the Error

ClickHouse raises this error when a replication fetch or distributed query cannot establish a TCP connection to a remote node:

```text
DB::Exception: Network is unreachable. (NETWORK_ERROR)
```

or more specifically:

```text
DB::Exception: Couldn't connect to replica analytics.events on clickhouse-node2.internal:9009. Network is unreachable.
```

Port `9009` is the default inter-server HTTP port used for replication part transfers.

## Quick Connectivity Tests

```bash
# Test replication port (9009) to the failing replica
nc -zv clickhouse-node2.internal 9009

# Test native port (9000)
nc -zv clickhouse-node2.internal 9000

# Test DNS resolution
dig clickhouse-node2.internal
host clickhouse-node2.internal

# Ping test (ICMP may be blocked - not definitive)
ping -c 5 clickhouse-node2.internal
```

## Diagnosing in ClickHouse

```sql
-- Check cluster node status and error counts
SELECT
    cluster,
    host_name,
    port,
    errors_count,
    estimated_recovery_time
FROM system.clusters
ORDER BY errors_count DESC;

-- Check replication queue for network errors
SELECT
    table,
    type,
    source_replica,
    last_exception,
    num_tries
FROM system.replication_queue
WHERE last_exception LIKE '%Network%' OR last_exception LIKE '%unreachable%'
ORDER BY num_tries DESC;
```

## Common Fixes

### Fix 1 - Restart the ClickHouse Service on the Remote Node

```bash
# SSH to the unreachable node
ssh clickhouse-node2.internal

# Check if the service is running
systemctl status clickhouse-server

# Restart if stopped
systemctl start clickhouse-server

# Verify the replication port is listening
ss -tlnp | grep 9009
```

### Fix 2 - Configure the Correct Listen Address

ClickHouse must listen on the correct network interface:

```xml
<!-- config.xml on each node -->
<listen_host>0.0.0.0</listen_host>
<!-- Or bind to a specific interface:
<listen_host>10.0.1.5</listen_host>
-->

<!-- Interserver HTTP port for part transfers -->
<interserver_http_port>9009</interserver_http_port>

<!-- Announce the correct hostname to ZooKeeper -->
<interserver_http_host>clickhouse-node2.internal</interserver_http_host>
```

### Fix 3 - Fix Firewall Rules

```bash
# Allow inter-node replication traffic
iptables -A INPUT -p tcp --dport 9009 -s 10.0.0.0/8 -j ACCEPT

# On cloud platforms, update security groups to allow:
# TCP 9000 (native protocol)
# TCP 9009 (interserver HTTP)
# TCP 2181 (ZooKeeper)
# TCP 9181 (ClickHouse Keeper)
```

### Fix 4 - Fix DNS Resolution

If hostname resolution fails, ClickHouse cannot find the replica:

```bash
# Add entries to /etc/hosts on each node
echo "10.0.1.4 clickhouse-node1.internal" >> /etc/hosts
echo "10.0.1.5 clickhouse-node2.internal" >> /etc/hosts
echo "10.0.1.6 clickhouse-node3.internal" >> /etc/hosts
```

Or fix DNS server configuration and flush the cache:

```bash
systemctl restart systemd-resolved
resolvectl flush-caches
```

### Fix 5 - Fix interserver_http_host Mismatch

If ZooKeeper stores the wrong hostname for a replica:

```sql
-- Find the ZooKeeper path for each replica of the table
SELECT database, table, replica_name, replica_path
FROM system.replicas
WHERE table = 'events';

-- Then inspect the host value registered in ZooKeeper for a specific replica
SELECT name, value
FROM system.zookeeper
WHERE path = '/clickhouse/tables/{shard}/events/replicas/{replica}';
```

Update the configuration and restart the node to re-register with the correct hostname.

## Monitoring Replication Network Health

```bash
#!/bin/bash
# Check connectivity to all cluster nodes
NODES=("clickhouse-node1.internal" "clickhouse-node2.internal" "clickhouse-node3.internal")
for node in "${NODES[@]}"; do
    if nc -zw3 "$node" 9009 2>/dev/null; then
        echo "OK: $node:9009"
    else
        echo "FAIL: $node:9009 unreachable!"
    fi
done
```

## Summary

"Network is unreachable" errors during ClickHouse replication are caused by stopped nodes, misconfigured listen addresses, firewall rules blocking port 9009, or DNS resolution failures. Start with `nc -zv` to test connectivity, check `system.replication_queue` for the specific failing node, and verify that `interserver_http_host` in `config.xml` matches the hostname resolvable by other nodes. Always ensure ports 9000 and 9009 are open between all cluster members.
