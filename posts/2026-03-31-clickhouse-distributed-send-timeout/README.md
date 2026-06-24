# How to Configure ClickHouse Distributed Send Timeout

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Distributed Table, Timeout, Configuration, Network, Cluster

Description: Configure distributed_send_timeout and related settings in ClickHouse to control how long distributed queries wait for shard responses before failing.

---

## What Is Distributed Send Timeout?

When a ClickHouse query runs against a Distributed table, the initiator node sends sub-queries to each shard. If a shard is slow or unreachable, the initiator waits up to `send_timeout` seconds when writing to the remote socket and up to `receive_timeout` seconds when waiting for a response before giving up. Misconfiguration causes either premature timeouts or hung queries.

## Key Timeout Settings

```xml
<!-- users.xml profile -->
<send_timeout>300</send_timeout>
<receive_timeout>300</receive_timeout>
<connect_timeout_with_failover_ms>50</connect_timeout_with_failover_ms>
```

Or set per query:

```sql
SELECT count()
FROM distributed_events
WHERE ts >= today()
SETTINGS
    receive_timeout = 120,
    send_timeout = 30;
```

## Understanding Each Setting

| Setting | What It Controls |
|---------|-----------------|
| `send_timeout` | Seconds to wait when writing data to a remote socket |
| `receive_timeout` | Seconds to wait for data from a remote shard |
| `connect_timeout_with_failover_ms` | Milliseconds before trying the next replica when a Distributed table has failover replicas |

## Tuning for Different Scenarios

For fast internal networks (single datacenter):

```sql
SET send_timeout = 30;
SET receive_timeout = 60;
SET connect_timeout_with_failover_ms = 50;
```

For cross-region or WAN clusters:

```sql
SET send_timeout = 120;
SET receive_timeout = 300;
SET connect_timeout_with_failover_ms = 500;
```

## Handling Timeout Errors

When a timeout occurs, ClickHouse returns an error like:

```text
Code: 159. DB::Exception: Timeout exceeded while reading from socket
```

Check whether a specific shard is slow:

```sql
SELECT shard_num, host_name, is_local, errors_count, estimated_recovery_time
FROM system.clusters
WHERE cluster = 'my_cluster';
```

If `errors_count` is high for a shard, it may be overloaded or unreachable.

## Configuring Failover Behavior

Set `skip_unavailable_shards` to allow queries to continue even if some shards are down:

```sql
SELECT count()
FROM distributed_events
SETTINGS skip_unavailable_shards = 1;
```

Use with caution - partial results may be misleading without proper monitoring.

## Async Distributed Sends

For INSERT into Distributed tables, configure async send to avoid blocking the application:

```xml
<distributed_background_insert_sleep_time_ms>500</distributed_background_insert_sleep_time_ms>
<distributed_background_insert_max_sleep_time_ms>5000</distributed_background_insert_max_sleep_time_ms>
```

Async sends buffer data locally and retry if the remote shard is temporarily unavailable.

## Summary

Configure ClickHouse distributed query timeouts (`send_timeout`, `receive_timeout`, and `connect_timeout_with_failover_ms`) based on your network topology - lower values for same-datacenter clusters, higher for cross-region. Use `skip_unavailable_shards` with care for partial-results tolerance, monitor `system.clusters` for shard health, and enable async distributed sends for resilient INSERT pipelines.
