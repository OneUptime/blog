# How to Use insert_quorum Setting in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, insert_quorum, Replication, Data Consistency, Setting, ReplicatedMergeTree

Description: Use insert_quorum to require that writes are confirmed by a minimum number of replicas before acknowledging an INSERT in ClickHouse.

---

In replicated ClickHouse clusters, inserts are normally acknowledged after the data lands on one replica, with replication happening asynchronously in the background. The `insert_quorum` setting requires that a minimum number of replicas confirm the write before the INSERT is acknowledged, providing stronger durability guarantees.

## What is insert_quorum?

`insert_quorum` is an integer setting (default: `0`, disabled) that specifies how many replicas must successfully write the data before the INSERT returns to the client. A value of `0` means no quorum check (async replication). A value of `2` means at least 2 replicas must confirm the write.

This setting only applies to `ReplicatedMergeTree` tables and their variants.

## Basic Usage

Require 2 replicas to confirm before acknowledging:

```sql
INSERT INTO events (id, ts, user_id, action)
VALUES (1, now(), 42, 'purchase')
SETTINGS insert_quorum = 2;
```

If the second replica does not confirm within `insert_quorum_timeout` (default: 600 seconds), the INSERT fails.

## Setting the Timeout

Control how long ClickHouse waits for quorum:

```sql
INSERT INTO critical_events
SELECT * FROM staging_events
SETTINGS
    insert_quorum         = 2,
    insert_quorum_timeout = 30000;  -- 30 seconds in milliseconds
```

If fewer than 2 replicas acknowledge within 30 seconds, the insert is rolled back and an exception is raised.

## insert_quorum_parallel

The `insert_quorum_parallel` setting (default: `1`) allows multiple quorum inserts to proceed in parallel without waiting for each other to complete. While enabled (the default), `select_sequential_consistency` does not work, because parallel quorum inserts may land on different sets of replicas. To guarantee that subsequent `SELECT` queries see data from all prior quorum `INSERT`s, disable parallel quorum and enable sequential consistency on reads:

```sql
SET insert_quorum             = 2;
SET insert_quorum_parallel    = 0;
SET select_sequential_consistency = 1;
```

## Monitoring Quorum Replication

Check that replicas are in sync:

```sql
SELECT
    database,
    table,
    replica_name,
    is_leader,
    total_replicas,
    active_replicas,
    queue_size,
    inserts_in_queue
FROM system.replicas
WHERE database = 'mydb';
```

Watch for `inserts_in_queue` growing, which indicates replicas are falling behind.

## When to Use insert_quorum

Use quorum writes when:

- Data loss is not acceptable (financial records, audit logs, billing events)
- You cannot afford to serve stale reads after a replica failover
- Compliance requirements mandate confirmed multi-replica durability

For high-throughput, loss-tolerant workloads (telemetry, clickstream) the overhead of waiting for quorum is usually not worth it.

## Performance Impact

Quorum inserts add latency equal to the replication lag of the slowest confirming replica. In a healthy cluster this is typically tens of milliseconds. Under load or with a lagging replica, it can be seconds. Monitor replication lag before enabling this in production.

```sql
SELECT
    database,
    table,
    replica_name,
    absolute_delay
FROM system.replicas
ORDER BY absolute_delay DESC
LIMIT 10;
```

## Summary

`insert_quorum` strengthens write durability in ClickHouse replicated clusters by requiring multiple replicas to confirm writes. Set it to `2` or more for critical data, tune `insert_quorum_timeout` for your SLA, and monitor `system.replicas` to ensure replicas stay healthy and responsive.
