# How to Use ReplicatedVersionedCollapsingMergeTree in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ReplicatedVersionedCollapsingMergeTree, Replication, Mutation, Storage Engine

Description: Learn how to use ReplicatedVersionedCollapsingMergeTree in ClickHouse to safely cancel and update rows in any insert order across replicated nodes using sign and version.

---

`ReplicatedVersionedCollapsingMergeTree` extends `VersionedCollapsingMergeTree` with ClickHouse replication. It uses two special columns - a `sign` column (`Int8`, values `+1` or `-1`) and a `version` column (`UInt*`, `Int*`, `Date`, `Date32`, `DateTime`, or `DateTime64`) - to collapse paired rows regardless of insert order. During merges, pairs of rows with the same `ORDER BY` key, the same version, and opposite signs cancel each other. Unlike `CollapsingMergeTree`, cancellation rows can arrive before or after their counterpart in any order, making this engine safe for distributed or out-of-order write patterns.

## Prerequisites: Macros Configuration

```xml
<!-- /etc/clickhouse-server/config.d/macros.xml -->
<clickhouse>
  <macros>
    <shard>01</shard>
    <replica>replica-01</replica>
  </macros>
</clickhouse>
```

## Creating a ReplicatedVersionedCollapsingMergeTree Table

```sql
CREATE TABLE inventory
(
    warehouse_id UInt32,
    sku          String,
    quantity     Int64,
    unit_cost    Decimal(10, 2),
    updated_at   DateTime,
    sign         Int8,    -- +1 = current state, -1 = cancellation
    version      UInt64   -- monotonically increasing version per row state
)
ENGINE = ReplicatedVersionedCollapsingMergeTree(
    '/clickhouse/tables/{shard}/inventory',
    '{replica}',
    sign,           -- sign column
    version         -- version column
)
PARTITION BY toYYYYMM(updated_at)
ORDER BY (warehouse_id, sku);
```

## Writing an Initial Row

```sql
-- Version 1: initial inventory record
INSERT INTO inventory VALUES
    (10, 'SKU-WIDGET-A', 500, 4.99, '2024-06-01 08:00:00', 1, 1);
```

## Updating a Row (Order-Independent Cancel + Reinsert)

```sql
-- To update quantity: write the -1 cancellation for version 1,
-- then write the +1 insertion for version 2.
-- These can arrive in either order - VersionedCollapsing handles both.

-- Cancel version 1
INSERT INTO inventory VALUES
    (10, 'SKU-WIDGET-A', 500, 4.99, '2024-06-01 08:00:00', -1, 1);

-- Insert version 2 (updated quantity after receiving a shipment)
INSERT INTO inventory VALUES
    (10, 'SKU-WIDGET-A', 650, 4.99, '2024-06-15 09:00:00', 1, 2);
```

The cancel (-1, version 1) and original (+1, version 1) pair will collapse regardless of which arrived first, leaving only (+1, version 2).

## Querying: Sum by Sign for Correct Results

Always multiply by `sign` when aggregating to net out uncollapsed pairs.

```sql
SELECT
    warehouse_id,
    sku,
    sum(sign * quantity)    AS net_quantity,
    sum(sign * unit_cost * quantity) / nullif(sum(sign * quantity), 0) AS avg_unit_cost
FROM inventory
GROUP BY warehouse_id, sku
HAVING net_quantity > 0
ORDER BY warehouse_id, sku;
```

```text
warehouse_id  sku            net_quantity  avg_unit_cost
10            SKU-WIDGET-A   650           4.99
```

## Deleting a Record

```sql
-- Write a -1 with the current version to cancel the latest state
INSERT INTO inventory VALUES
    (10, 'SKU-WIDGET-A', 650, 4.99, '2024-06-15 09:00:00', -1, 2);
```

After this, `sum(sign * quantity)` for `SKU-WIDGET-A` in warehouse 10 returns 0.

## Full Lifecycle Example: Order Fulfillment

```sql
CREATE TABLE fulfillment_orders
(
    order_id    UInt64,
    status      LowCardinality(String),
    items       UInt32,
    total_value Decimal(12, 2),
    updated_at  DateTime,
    sign        Int8,
    version     UInt64
)
ENGINE = ReplicatedVersionedCollapsingMergeTree(
    '/clickhouse/tables/{shard}/fulfillment_orders',
    '{replica}',
    sign,
    version
)
ORDER BY order_id;

-- v1: order placed
INSERT INTO fulfillment_orders VALUES (7001, 'placed',     3, 89.97, '2024-06-15 09:00:00',  1, 1);

-- v2: order confirmed - cancel v1, insert v2
INSERT INTO fulfillment_orders VALUES
    (7001, 'placed',     3, 89.97, '2024-06-15 09:00:00', -1, 1),
    (7001, 'confirmed',  3, 89.97, '2024-06-15 09:05:00',  1, 2);

-- v3: order shipped - cancel v2, insert v3
INSERT INTO fulfillment_orders VALUES
    (7001, 'confirmed',  3, 89.97, '2024-06-15 09:05:00', -1, 2),
    (7001, 'shipped',    3, 89.97, '2024-06-15 14:00:00',  1, 3);

-- Current state of all active orders (using sign)
SELECT
    order_id,
    argMax(status, version) AS current_status,
    sum(sign * items)       AS net_items,
    sum(sign * total_value) AS net_value
FROM fulfillment_orders
GROUP BY order_id
HAVING net_items > 0
ORDER BY order_id;
```

```text
order_id  current_status  net_items  net_value
7001      shipped         3          89.97
```

## Using FINAL for Simpler Queries

`FINAL` forces collapse at query time, but carries a performance cost.

```sql
SELECT
    order_id,
    status,
    items,
    total_value,
    updated_at
FROM fulfillment_orders FINAL
WHERE sign = 1
ORDER BY order_id;
```

## Concurrent Multi-Source Writes

The version column is critical when multiple producers write to the same table concurrently. Each producer must know the current version and increment it atomically.

```sql
-- Producer A cancels and updates version 5
INSERT INTO inventory VALUES
    (10, 'SKU-WIDGET-B', 200, 9.99, '2024-06-15 10:00:00', -1, 5),
    (10, 'SKU-WIDGET-B', 195, 9.99, '2024-06-15 10:01:00',  1, 6);
```

## Replication Status

```sql
SELECT
    replica_name,
    is_leader,
    absolute_delay AS lag_s,
    queue_size
FROM system.replicas
WHERE table = 'inventory';
```

## Forcing a Collapse

```sql
OPTIMIZE TABLE inventory PARTITION '202406' FINAL;
```

## Comparison With CollapsingMergeTree

```text
Feature                            CollapsingMergeTree  VersionedCollapsingMergeTree
Cancel before original row         Fails (data not      Works correctly
                                   collapsed)
Out-of-order cancel rows           Unreliable           Reliable (matched by version)
Extra column required              sign only            sign + version
Suitable for distributed writes    No                   Yes
```

## Limitations

- Requires ZooKeeper/ClickHouse Keeper.
- Version values must be unique and monotonically increasing per `ORDER BY` key row state.
- Queries must account for sign until background merges run.
- Schema of the cancellation row must exactly match the original row (except sign).

## Summary

`ReplicatedVersionedCollapsingMergeTree` provides order-independent row cancellation with replication. By pairing sign and version columns, it safely collapses matching rows even when cancellations arrive before their counterpart - making it the correct engine for distributed write pipelines where insert order cannot be guaranteed. Use it for mutable fact tables in replicated production environments.
