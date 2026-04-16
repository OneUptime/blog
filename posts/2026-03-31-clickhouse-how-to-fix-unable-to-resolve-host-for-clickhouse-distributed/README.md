# How to Fix 'Unable to resolve host' for ClickHouse Distributed Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Distributed, Networking, Troubleshooting

Description: Fix 'Unable to resolve host' errors in ClickHouse distributed queries by correcting cluster configuration, DNS settings, and network connectivity.

---

## Understanding the Error

When ClickHouse executes a distributed query, it needs to connect to shard hosts defined in the cluster configuration. If DNS resolution fails for any shard, you see:

```text
Code: 198. DB::Exception: Unable to resolve host (clickhouse-shard2.internal): Name or service not known.
```

or:

```text
DB::NetException: Connection refused (clickhouse-shard1:9000)
```

## Common Causes

- Incorrect hostname in `config.xml` cluster configuration
- DNS not configured or not propagated for new hosts
- Firewall blocking port 9000 (native protocol) or 9009 (inter-server replication)
- The remote shard is down or not yet started
- Using container names instead of resolvable hostnames
- Cluster config not reloaded after changes

## Diagnosing the Problem

Check your cluster configuration:

```sql
SELECT
    cluster,
    shard_num,
    replica_num,
    host_name,
    host_address,
    port,
    errors_count,
    estimated_recovery_time
FROM system.clusters
WHERE cluster = 'your_cluster_name';
```

High `errors_count` or a future `estimated_recovery_time` indicates connection problems.

Test DNS resolution manually:

```bash
# From the ClickHouse server
nslookup clickhouse-shard2.internal
dig clickhouse-shard2.internal

# Test connectivity to the shard port
nc -zv clickhouse-shard2.internal 9000
telnet clickhouse-shard2.internal 9000
```

## Fix 1 - Correct the Hostname in config.xml

```xml
<!-- /etc/clickhouse-server/config.d/clusters.xml -->
<clickhouse>
  <remote_servers>
    <production_cluster>
      <shard>
        <replica>
          <!-- Use FQDN or IP that resolves from this server -->
          <host>clickhouse-shard1.prod.internal</host>
          <port>9000</port>
        </replica>
      </shard>
      <shard>
        <replica>
          <!-- Verify this resolves correctly -->
          <host>clickhouse-shard2.prod.internal</host>
          <port>9000</port>
        </replica>
      </shard>
    </production_cluster>
  </remote_servers>
</clickhouse>
```

ClickHouse automatically reloads config files in `config.d`. To trigger a reload manually:

```bash
clickhouse-client --query "SYSTEM RELOAD CONFIG"
```

## Fix 2 - Use IP Addresses Instead of Hostnames

If DNS is unreliable, use IP addresses directly:

```xml
<shard>
  <replica>
    <host>10.0.1.11</host>
    <port>9000</port>
  </replica>
</shard>
```

## Fix 3 - Fix /etc/hosts Entries

Add static hostname entries if DNS is not available:

```bash
sudo tee -a /etc/hosts << 'EOF'
10.0.1.11 clickhouse-shard1.internal
10.0.1.12 clickhouse-shard2.internal
10.0.1.13 clickhouse-shard3.internal
EOF
```

Verify:

```bash
ping -c 1 clickhouse-shard2.internal
```

## Fix 4 - Fix Firewall Rules

Ensure the required ports are open between shards:

```bash
# ClickHouse native protocol
sudo ufw allow from 10.0.1.0/24 to any port 9000

# ClickHouse inter-server replication
sudo ufw allow from 10.0.1.0/24 to any port 9009

# ClickHouse HTTP (optional)
sudo ufw allow from 10.0.1.0/24 to any port 8123

# Check existing rules
sudo ufw status
```

## Fix 5 - Fix Docker or Kubernetes Hostname Resolution

In Docker Compose, use service names and ensure they are on the same network:

```yaml
services:
  clickhouse-shard1:
    image: clickhouse/clickhouse-server
    networks:
      - ch_network

  clickhouse-shard2:
    image: clickhouse/clickhouse-server
    networks:
      - ch_network

networks:
  ch_network:
    driver: bridge
```

In Kubernetes, use the full service DNS name:

```xml
<!-- Use Kubernetes service DNS: service-name.namespace.svc.cluster.local -->
<host>clickhouse-shard2.clickhouse.svc.cluster.local</host>
<port>9000</port>
```

## Fix 6 - Set interserver_http_host to Avoid Reverse DNS Issues

In some environments, ClickHouse uses a reverse DNS lookup for the local hostname. Disable this if it causes issues:

```xml
<clickhouse>
  <interserver_http_host>10.0.1.11</interserver_http_host>
</clickhouse>
```

## Checking Cluster Health After Fix

```sql
-- Verify all shards are reachable
SELECT
    cluster,
    host_name,
    host_address,
    errors_count,
    estimated_recovery_time
FROM system.clusters
ORDER BY cluster, shard_num;

-- Run a test distributed query
SELECT count()
FROM distributed_table;
```

## Summary

"Unable to resolve host" in ClickHouse distributed queries is almost always a DNS or network configuration issue. Fix it by verifying hostnames in `config.xml`, adding `/etc/hosts` entries, opening firewall ports 9000 and 9009, or switching to IP addresses. In container environments, ensure all shards share the same network and use the correct service DNS names.
