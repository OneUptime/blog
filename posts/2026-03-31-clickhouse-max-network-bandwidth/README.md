# How to Configure ClickHouse Max Network Bandwidth

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Network Bandwidth, Throttling, Configuration, Performance

Description: Learn how to configure maximum network bandwidth limits in ClickHouse for queries and replication to prevent any single operation from saturating your network.

---

## Why Limit Network Bandwidth?

Without bandwidth limits, a single large query export or replication sync can saturate your network link, impacting other queries and services. ClickHouse provides per-user, per-query, and server-level bandwidth controls.

## Per-Query Bandwidth Limits

Limit how much bandwidth a single query can use when transferring results:

```sql
SET max_network_bandwidth = 104857600;  -- 100 MB/s per query
SET max_network_bandwidth_for_user = 209715200;  -- 200 MB/s for the user total
SET max_network_bandwidth_for_all_users = 524288000;  -- 500 MB/s server-wide
```

These settings throttle the speed of data exchange over the network in bytes per second for query execution.

## Setting Defaults in users.xml

Apply limits to a specific user by creating a settings profile and assigning it:

```xml
<profiles>
  <export_profile>
    <max_network_bandwidth>52428800</max_network_bandwidth>
    <max_network_bandwidth_for_user>104857600</max_network_bandwidth_for_user>
  </export_profile>
</profiles>

<users>
  <export_user>
    <password>secret</password>
    <profile>export_profile</profile>
    <networks><ip>::/0</ip></networks>
    <quota>default</quota>
  </export_user>
</users>
```

## Replication Bandwidth Limits

Prevent replication from consuming all available bandwidth:

```xml
<max_replicated_fetches_network_bandwidth_for_server>104857600</max_replicated_fetches_network_bandwidth_for_server>
<max_replicated_sends_network_bandwidth_for_server>104857600</max_replicated_sends_network_bandwidth_for_server>
```

For per-table limits:

```sql
ALTER TABLE events_local
  MODIFY SETTING max_replicated_fetches_network_bandwidth = 52428800;
```

## Background Merge and Download Limits

Limit bandwidth for background part fetches during recovery:

```xml
<max_replicated_fetches_network_bandwidth_for_server>52428800</max_replicated_fetches_network_bandwidth_for_server>
```

This is especially useful when adding a new replica to an existing cluster - the initial data sync can otherwise saturate the link.

## Monitoring Current Bandwidth Usage

```sql
SELECT
    query_id,
    user,
    read_bytes,
    written_bytes,
    elapsed
FROM system.processes
ORDER BY read_bytes DESC;
```

Check network interface utilization alongside ClickHouse metrics:

```bash
sar -n DEV 2 5
```

## Testing Throttling

Run a large export and observe it respects the limit:

```bash
# Set a 10 MB/s limit for testing
clickhouse-client --max_network_bandwidth=10485760 \
  --query "SELECT * FROM large_table FORMAT CSV" > /dev/null
```

Monitor speed with:

```bash
clickhouse-client --query "
  SELECT read_bytes / elapsed AS bytes_per_sec
  FROM system.processes
  WHERE query LIKE '%large_table%'
"
```

## Bandwidth Limit Reference Table

```text
Setting                                          | Scope
max_network_bandwidth                            | Per query
max_network_bandwidth_for_user                   | Per user (all queries combined)
max_network_bandwidth_for_all_users              | Server-wide
max_replicated_fetches_network_bandwidth_for_server | Replication incoming
max_replicated_sends_network_bandwidth_for_server   | Replication outgoing
```

## Summary

ClickHouse provides layered network bandwidth controls: per-query, per-user, and server-wide for query results, and separate controls for replication traffic. Apply limits in `users.xml` for permanent per-user constraints, and use session-level `SET` statements for temporary limits. Monitor `system.processes` to verify limits are being respected.
