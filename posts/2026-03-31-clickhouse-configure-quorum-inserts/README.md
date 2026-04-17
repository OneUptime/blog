# How to Configure Quorum Inserts in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Quorum Insert, Replication, Durability, Setting

Description: Learn how to configure quorum inserts in ClickHouse to ensure data is written to multiple replicas before an insert is acknowledged as successful.

---

By default, ClickHouse acknowledges an insert as soon as data is written to one replica. Quorum inserts change this behavior: the insert only succeeds after a specified number of replicas have confirmed they received the data. This provides stronger durability guarantees.

## What is a Quorum Insert

When `insert_quorum` is set to a value greater than 1, ClickHouse waits for confirmation from that many replicas before returning success to the client. If the required number of replicas do not confirm within the timeout, the insert fails.

This prevents scenarios where a single-replica write succeeds but the data is lost when that node fails before replication completes.

## Enabling Quorum Inserts

Set `insert_quorum` at the session or query level:

```sql
-- Require 2 replicas to acknowledge the insert
SET insert_quorum = 2;

INSERT INTO events (event_time, user_id, action)
VALUES (now(), 12345, 'purchase');
```

You can also set it in `users.xml` or via `ALTER USER`:

```xml
<profiles>
    <default>
        <insert_quorum>2</insert_quorum>
        <insert_quorum_timeout>60000</insert_quorum_timeout>
    </default>
</profiles>
```

## Configuring the Quorum Timeout

The `insert_quorum_timeout` setting controls how long to wait (in milliseconds) for the required replicas to confirm:

```sql
SET insert_quorum = 2;
SET insert_quorum_timeout = 30000;  -- 30 seconds

INSERT INTO critical_events SELECT * FROM staging_events;
```

If replication is slow or a replica is temporarily unavailable, increase the timeout rather than disabling quorum writes.

## Parallel Quorum Inserts

By default, ClickHouse allows parallel quorum inserts into the same table (`insert_quorum_parallel = 1`). Disable this setting if you need strict serialization of quorum inserts — for example, when you rely on `select_sequential_consistency` for read-after-write guarantees:

```sql
SET insert_quorum = 2;
SET insert_quorum_parallel = 0;  -- Serialize quorum inserts to the same table

INSERT INTO events VALUES (now(), 1, 'click');
```

Leaving parallel quorum inserts enabled (the default) improves throughput for applications that insert from multiple connections simultaneously, at the cost of sequential consistency on reads.

## Consistent Reads After Quorum Inserts

To guarantee that a SELECT after a quorum insert sees the written data, use `select_sequential_consistency`. Note that this setting has no effect while `insert_quorum_parallel` is enabled (the default), so you must disable it as well:

```sql
SET insert_quorum = 2;
SET insert_quorum_parallel = 0;
SET select_sequential_consistency = 1;

-- This insert waits for 2 replicas
INSERT INTO orders VALUES (now(), 999, 'completed');

-- This select will only run on replicas that confirmed the quorum insert
SELECT * FROM orders WHERE order_id = 999;
```

## Checking Quorum Status

Monitor quorum insert state in the system tables:

```sql
SELECT *
FROM system.zookeeper
WHERE path = '/clickhouse/tables/default/events/quorum';
```

Failed quorum inserts leave data in a special "quorum" part that gets cleaned up automatically.

## Trade-offs

Quorum inserts add latency because the insert waits for replication. For write-heavy workloads, measure the impact:

```sql
SELECT
    query,
    query_duration_ms,
    written_rows
FROM system.query_log
WHERE query LIKE 'INSERT INTO events%'
  AND type = 'QueryFinish'
ORDER BY event_time DESC
LIMIT 10;
```

## Summary

Quorum inserts in ClickHouse provide stronger durability by requiring multiple replicas to acknowledge each insert. Configure `insert_quorum` to the desired replica count, set a generous `insert_quorum_timeout`, and enable `select_sequential_consistency` when you need read-after-write guarantees. Use `insert_quorum_parallel` to maintain throughput in concurrent insert scenarios.
