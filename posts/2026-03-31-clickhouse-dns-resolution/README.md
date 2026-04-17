# How to Configure ClickHouse DNS Resolution Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, DNS, Networking, Configuration, Cluster

Description: Learn how to configure ClickHouse DNS resolution settings to control hostname caching, TTLs, and resolution behavior in distributed clusters.

---

## Why DNS Configuration Matters for ClickHouse

In distributed ClickHouse clusters, nodes refer to each other by hostname. DNS resolution failures or stale DNS cache can prevent inter-shard communication, block ZooKeeper connections, and cause replication errors. Tuning DNS settings reduces the time it takes ClickHouse to adapt when nodes change IP addresses.

## Default DNS Cache Behavior

ClickHouse caches DNS resolutions to avoid repeated lookups. By default, cached entries are refreshed every 15 seconds in the background. You can see DNS cache entries:

```sql
SELECT * FROM system.dns_cache;
```

## Configuring DNS Cache TTL

In `config.xml`:

```xml
<dns_cache_max_entries>10000</dns_cache_max_entries>
<dns_cache_update_period>15</dns_cache_update_period>
```

- `dns_cache_max_entries`: Maximum entries in the DNS cache (default 10000).
- `dns_cache_update_period`: Seconds between background cache refresh (default 15).

## Dropping the DNS Cache Manually

After a node IP change, drop the cache immediately:

```sql
SYSTEM DROP DNS CACHE;
```

This forces ClickHouse to re-resolve all hostnames on the next connection attempt.

## Using FQDN for Cluster Nodes

Always use fully qualified domain names in cluster configuration:

```xml
<remote_servers>
  <prod_cluster>
    <shard>
      <replica>
        <host>ch-node-1.internal.example.com</host>
        <port>9000</port>
      </replica>
    </shard>
  </prod_cluster>
</remote_servers>
```

Short hostnames may resolve differently depending on search domains and can cause issues in Kubernetes or multi-domain environments.

## DNS in Kubernetes

When running ClickHouse on Kubernetes, use headless Service DNS names:

```text
ch-0.clickhouse-headless.clickhouse.svc.cluster.local
ch-1.clickhouse-headless.clickhouse.svc.cluster.local
```

A headless service returns the pod IP directly, avoiding VIP load balancing for ClickHouse inter-node traffic.

## Configuring /etc/resolv.conf

For hosts outside Kubernetes, ensure the correct nameservers are set:

```text
nameserver 10.0.0.10
nameserver 10.0.0.11
search internal.example.com
options ndots:2 timeout:2 attempts:3
```

`ndots:2` means hostnames containing two or more dots are tried as absolute names first, skipping the search list. This avoids redundant lookups for names that already look qualified (e.g. `ch-node-1.internal`).

## Debugging DNS Issues

```bash
# Test DNS resolution from the ClickHouse server
dig ch-node-2.internal.example.com

# Check if ClickHouse can resolve its cluster peers
clickhouse-client --query "
  SELECT host_name, host_address
  FROM system.clusters
  WHERE cluster = 'prod_cluster'
"
```

## Summary

ClickHouse DNS resolution is controlled by `dns_cache_update_period` and `dns_cache_max_entries` in `config.xml`. Use `SYSTEM DROP DNS CACHE` after IP address changes, always specify FQDNs in cluster configuration, and in Kubernetes use headless Service names to ensure direct pod IP resolution. Monitor `system.dns_cache` to verify expected hostnames are cached correctly.
