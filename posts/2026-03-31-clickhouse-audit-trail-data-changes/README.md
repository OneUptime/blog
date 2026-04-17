# How to Build an Audit Trail for Data Changes in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Audit Trail, Materialized View, Change Tracking, Compliance, MergeTree

Description: Build an immutable audit trail in ClickHouse that captures every data change, who made it, and when - using materialized views and query logs.

---

Audit trails for data changes in ClickHouse require a different approach than traditional databases because ClickHouse is append-only. The strategy is to capture mutations before they execute and to log every significant write event into an immutable audit table.

## Immutable Audit Log Table

Create a dedicated audit table that records every data change event:

```sql
CREATE TABLE data_change_audit
(
    change_time     DateTime DEFAULT now(),
    table_name      LowCardinality(String),
    operation       LowCardinality(String), -- INSERT, UPDATE, DELETE
    partition_key   String,
    changed_by      LowCardinality(String),
    rows_affected   UInt64,
    change_details  String
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(change_time)
ORDER BY (change_time, table_name, operation);
```

## Tracking Mutations via system.mutations

Mutations leave a permanent record in `system.mutations`. Mirror them to your audit log:

```sql
INSERT INTO data_change_audit
SELECT
    create_time,
    table                                               AS table_name,
    'MUTATION'                                          AS operation,
    arrayStringConcat(block_numbers.partition_id, ',')  AS partition_key,
    'system'                                            AS changed_by,
    0                                                   AS rows_affected,
    command                                             AS change_details
FROM system.mutations
WHERE table = 'orders' AND is_done = 1
  AND create_time >= yesterday();
```

## Tracking Inserts via system.query_log

```sql
INSERT INTO data_change_audit
SELECT
    event_time,
    tables[1]               AS table_name,
    'INSERT'                AS operation,
    ''                      AS partition_key,
    user                    AS changed_by,
    written_rows            AS rows_affected,
    query                   AS change_details
FROM system.query_log
WHERE type = 'QueryFinish'
  AND query_kind = 'Insert'
  AND tables[1] = 'orders'
  AND event_time >= yesterday();
```

## Automatic Capture with a Materialized View

Create a shadow table and a materialized view to capture every insert as it arrives:

```sql
CREATE TABLE orders_audit_shadow
(
    captured_at DateTime DEFAULT now(),
    order_id    UInt64,
    user_id     UInt64,
    amount      Decimal(10,2),
    operation   String DEFAULT 'INSERT'
)
ENGINE = MergeTree()
ORDER BY (captured_at, order_id);

CREATE MATERIALIZED VIEW mv_orders_audit
TO orders_audit_shadow
AS SELECT
    now()     AS captured_at,
    order_id,
    user_id,
    amount,
    'INSERT'  AS operation
FROM orders;
```

Every row inserted into `orders` is also captured in `orders_audit_shadow`.

## Querying the Audit Trail

```sql
SELECT
    change_time,
    operation,
    changed_by,
    rows_affected,
    change_details
FROM data_change_audit
WHERE table_name = 'orders'
  AND change_time >= now() - INTERVAL 7 DAY
ORDER BY change_time DESC
LIMIT 50;
```

## Summary

An effective ClickHouse audit trail combines an immutable audit log table, periodic ingestion from `system.mutations` and `system.query_log`, and a materialized view to capture inserts in real time. This three-layer approach records who changed what and when without impacting query performance on the primary tables.
