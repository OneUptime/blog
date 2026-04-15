# How to Query Delta Lake Tables with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, DeltaLake, S3, Data Lake, Analytics, Parquet

Description: Step-by-step guide to querying Delta Lake tables from ClickHouse using the DeltaLake engine and deltaLake table function, with tips for performance and schema handling.

---

## Introduction

ClickHouse offers two ways to query Delta Lake tables: the `DeltaLake` table engine (persistent table definition) and the `deltaLake` table function (ad-hoc queries). Both read the Delta Lake transaction log to identify live Parquet files and serve SQL results without copying data.

## Two Approaches Compared

```mermaid
graph TD
    A[Delta Lake on S3] --> B{Access Method}
    B --> C[DeltaLake Engine\npersistent table definition]
    B --> D[deltaLake function\nad-hoc query]
    C --> E[CREATE TABLE ... ENGINE = DeltaLake]
    D --> F[SELECT * FROM deltaLake(...)]
```

| Feature | DeltaLake Engine | deltaLake Function |
|---|---|---|
| Persistent | Yes | No |
| Schema cached | Yes | Inferred each run |
| Use case | Dashboards, repeated queries | One-off exploration |

## Using the deltaLake Table Function

Query a Delta Lake table without creating a persistent table definition:

```sql
SELECT
    order_id,
    customer_id,
    total_amount
FROM deltaLake(
    's3://my-bucket/delta/orders/',
    'AKIAIOSFODNN7EXAMPLE',
    'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
)
WHERE total_amount > 500
ORDER BY total_amount DESC
LIMIT 20;
```

## Using the DeltaLake Engine

Create a persistent table:

```sql
CREATE TABLE orders_delta
ENGINE = DeltaLake(
    's3://my-bucket/delta/orders/',
    'AKIAIOSFODNN7EXAMPLE',
    'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
);
```

Query it like any other ClickHouse table:

```sql
SELECT
    toStartOfMonth(order_date) AS month,
    count()                    AS orders,
    round(avg(total_amount), 2) AS avg_order
FROM orders_delta
WHERE order_date >= '2024-01-01'
GROUP BY month
ORDER BY month;
```

## Inspecting Delta Lake Schema

```sql
DESCRIBE TABLE orders_delta;
```

```text
Column          Type
order_id        Int64
customer_id     Int64
total_amount    Float64
order_date      Date32
status          String
region          LowCardinality(String)
```

## Querying Delta Lake with Partition Pruning

Delta Lake stores partition values in directory names (e.g., `region=us-east/date=2024-06-01`). ClickHouse can push predicates down to skip irrelevant directories:

```sql
SELECT sum(total_amount) AS revenue
FROM orders_delta
WHERE region = 'us-east'
  AND order_date = '2024-06-01';
```

## Time Travel on Delta Lake

Read the table at a specific version:

```sql
SELECT count()
FROM orders_delta
SETTINGS delta_lake_snapshot_version = 10;
```

This is useful for debugging data quality issues or auditing historical states.

## Joining Delta Lake with Native Tables

```sql
-- Enrich Delta Lake data with a native ClickHouse dimension table
SELECT
    o.order_id,
    o.total_amount,
    c.name AS customer_name,
    c.tier
FROM orders_delta AS o
JOIN customers AS c ON o.customer_id = c.id
WHERE o.order_date >= today() - INTERVAL 30 DAY
  AND c.tier = 'Gold';
```

## Writing a Materialized View from Delta Lake

Create a native MergeTree table and populate it from Delta Lake for fast repeated queries:

```sql
CREATE TABLE orders_local
(
    order_id     Int64,
    customer_id  Int64,
    total_amount Float64,
    order_date   Date,
    region       LowCardinality(String)
)
ENGINE = MergeTree
ORDER BY (order_date, region);

INSERT INTO orders_local
SELECT order_id, customer_id, total_amount, order_date, region
FROM orders_delta
WHERE order_date >= '2024-01-01';
```

## Performance Tips

- Ensure the Delta Lake table is partitioned by date or region for partition pruning.
- Use `deltaLake()` function for exploratory queries; switch to the engine for production dashboards.
- Run ClickHouse in the same cloud region as S3 to reduce latency.
- Use `WHERE` clauses on partition columns to enable predicate pushdown and skip irrelevant files.

```sql
-- Efficient filtering on a partition column
SELECT order_id, total_amount
FROM orders_delta
WHERE order_date >= '2024-06-01';
```

## Checking Read Statistics

```sql
SELECT
    query,
    read_rows,
    read_bytes,
    query_duration_ms
FROM system.query_log
WHERE tables LIKE '%orders_delta%'
  AND type = 'QueryFinish'
ORDER BY event_time DESC
LIMIT 5;
```

## Summary

ClickHouse provides the `DeltaLake` table engine for persistent Delta Lake table definitions and the `deltaLake()` table function for ad-hoc queries. Both read the Delta transaction log to find live Parquet files. Use the engine for dashboards and repeated workloads, and the function for quick exploration. Partition pushdown, time travel, and joining with native tables make this integration highly practical for lakehouse analytics.
