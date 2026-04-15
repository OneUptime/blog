# How to Use select_sequential_consistency in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, select_sequential_consistency, Replication, Consistency, Setting

Description: Learn how select_sequential_consistency in ClickHouse ensures reads reflect the latest quorum-confirmed writes, preventing stale reads from lagging replicas.

---

When running replicated ClickHouse clusters, reads may be served by any replica. A replica that is slightly behind could return stale data. The `select_sequential_consistency` setting ensures that a SELECT query only reads data that has been confirmed by a quorum of replicas.

## What Is select_sequential_consistency?

`select_sequential_consistency` is a query-level setting that forces reads to use the most recently quorum-confirmed data. It is designed to complement `insert_quorum` - together they provide a read-your-writes consistency model across replicated tables.

When enabled, ClickHouse checks quorum metadata in ZooKeeper (or ClickHouse Keeper) and only reads parts that have been confirmed across the required number of replicas.

## Enabling select_sequential_consistency

You can enable it per query:

```sql
SET select_sequential_consistency = 1;

SELECT count() FROM events WHERE timestamp >= today();
```

Or configure it for a user profile:

```sql
ALTER PROFILE default SETTINGS select_sequential_consistency = 1;
```

## Using with insert_quorum

The typical pattern is to pair both settings. Note that `select_sequential_consistency` does not work when `insert_quorum_parallel` is enabled, which is the default. You must disable it explicitly:

```sql
SET insert_quorum = 2;
SET insert_quorum_parallel = 0;
SET select_sequential_consistency = 1;

-- Write
INSERT INTO orders (order_id, status, updated_at)
VALUES (42, 'confirmed', now());

-- Read - guaranteed to see the just-written row
SELECT order_id, status
FROM orders
WHERE order_id = 42;
```

Without `select_sequential_consistency`, the SELECT might hit a lagging replica and miss the row.

## How It Works Internally

When `select_sequential_consistency = 1` is set, ClickHouse synchronously reads quorum metadata from ZooKeeper (or ClickHouse Keeper). Specifically, it checks the `quorum/last_part` and `quorum/status` paths to determine the last quorum-confirmed part. The query only proceeds if the local replica has the quorum-confirmed part. If the replica does not have it, ClickHouse immediately returns a `REPLICA_IS_NOT_IN_QUORUM` error suggesting you send the query to another replica.

You can monitor replication lag using:

```sql
SELECT
    replica_name,
    log_pointer,
    log_max_index,
    log_max_index - log_pointer AS lag
FROM system.replicas
WHERE table = 'orders';
```

## Checking Consistency State

To verify which parts are fully replicated across all replicas:

```sql
SELECT
    partition,
    name,
    active,
    replica_name
FROM system.parts
WHERE table = 'orders'
  AND active = 1;
```

## Performance Considerations

Enabling `select_sequential_consistency` adds overhead:
- Queries will fail with a `REPLICA_IS_NOT_IN_QUORUM` error if the replica is behind, requiring a retry on another replica
- Each SELECT requires a synchronous round-trip to ZooKeeper or ClickHouse Keeper for quorum metadata checks, increasing load on the coordination service

Only use it when consistency is more important than latency.

## When to Use select_sequential_consistency

- After a quorum insert when the application immediately queries the same data
- Read-after-write scenarios in critical business workflows (order status, payments)
- Avoiding ghost reads in reporting pipelines that process newly inserted data

## Summary

`select_sequential_consistency` ensures that SELECT queries in ClickHouse only read data that has been confirmed by a quorum of replicas. Combined with `insert_quorum`, it provides a strong consistency model suitable for workloads where stale reads are not acceptable. Use it selectively to avoid performance overhead on read-heavy, latency-sensitive queries.
