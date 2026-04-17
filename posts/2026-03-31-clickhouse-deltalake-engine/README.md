# How to Use DeltaLake Table Engine in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, DeltaLake, Storage, Table Engine, S3, Data Lake

Description: Learn how to use the DeltaLake table engine in ClickHouse to query Delta Lake tables stored on S3 or local storage directly without ETL pipelines.

---

## Introduction

ClickHouse ships with a built-in `DeltaLake` table engine that lets you query Delta Lake tables stored on object storage such as Amazon S3, Google Cloud Storage, or local paths. This lets analytics teams skip ETL and run ClickHouse SQL directly against their existing Delta Lake data.

Delta Lake is an open-source storage layer developed by Databricks. It adds ACID transactions, schema enforcement, and time travel on top of Parquet files.

## Architecture Overview

```mermaid
graph LR
    A[Delta Lake on S3] -->|DeltaLake Engine| B[ClickHouse]
    B --> C[SQL Queries]
    A --> D[_delta_log/]
    A --> E[part-00000.parquet]
    A --> F[part-00001.parquet]
```

## Prerequisites

- ClickHouse 23.3 or later
- An S3 bucket containing a Delta Lake table
- IAM credentials or instance profile with `s3:GetObject` and `s3:ListBucket` permissions

## Configuring S3 Credentials

Add credentials to `config.xml` or use named collections:

```xml
<clickhouse>
  <named_collections>
    <my_s3>
      <access_key_id>AKIAIOSFODNN7EXAMPLE</access_key_id>
      <secret_access_key>wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY</secret_access_key>
      <region>us-east-1</region>
    </my_s3>
  </named_collections>
</clickhouse>
```

## Creating a DeltaLake Table

Use the `DeltaLake` engine to attach a Delta Lake table stored in S3:

```sql
CREATE TABLE delta_orders
ENGINE = DeltaLake(
    's3://my-data-lake/orders/',
    'AKIAIOSFODNN7EXAMPLE',
    'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
);
```

With a named collection:

```sql
CREATE TABLE delta_orders
ENGINE = DeltaLake(my_s3, url = 's3://my-data-lake/orders/');
```

ClickHouse reads the `_delta_log` directory to discover the current version of the table and determine which Parquet files to read.

## Querying the Table

```sql
SELECT
    order_id,
    customer_id,
    total_amount,
    order_date
FROM delta_orders
WHERE order_date >= '2024-01-01'
  AND total_amount > 100
ORDER BY order_date DESC
LIMIT 100;
```

Aggregation example:

```sql
SELECT
    toStartOfMonth(order_date) AS month,
    count()                    AS order_count,
    sum(total_amount)          AS revenue
FROM delta_orders
WHERE order_date >= '2023-01-01'
GROUP BY month
ORDER BY month;
```

## Reading a Specific Delta Lake Version (Time Travel)

Delta Lake stores transaction logs in `_delta_log`. ClickHouse 25.9+ supports the `delta_lake_snapshot_version` setting:

```sql
SELECT count()
FROM delta_orders
SETTINGS delta_lake_snapshot_version = 5;
```

This reads the table as it existed at version 5.

## Local Delta Lake Table

The `DeltaLake` table engine targets object storage (S3, GCS, Azure). For local testing against a Delta Lake table on the filesystem, use the `deltaLakeLocal` table function:

```sql
SELECT *
FROM deltaLakeLocal('/var/lib/clickhouse/user_files/orders/')
LIMIT 10;
```

## Checking Table Schema

```sql
DESCRIBE TABLE delta_orders;
```

```text
Column          Type       Comment
order_id        Int64
customer_id     Int64
total_amount    Float64
order_date      Date
status          String
```

## Performance Tips

- Partition Delta Lake tables by date before writing from Spark or Databricks so ClickHouse can skip partitions during reads.
- Use `PREWHERE` in ClickHouse queries to apply lightweight filtering before reading full rows.
- Place ClickHouse in the same cloud region as the S3 bucket to minimize egress latency.
- The `DeltaLake` engine is read-only; writes must go through Spark or the Delta Rust library.

```sql
-- Efficient: date pruning pushed down
SELECT order_id, total_amount
FROM delta_orders
PREWHERE order_date = '2024-06-01';
```

## Monitoring S3 Read Activity

```sql
SELECT
    query_id,
    query,
    read_rows,
    read_bytes,
    query_duration_ms
FROM system.query_log
WHERE has(tables, 'default.delta_orders')
  AND type = 'QueryFinish'
ORDER BY event_time DESC
LIMIT 10;
```

## Summary

The DeltaLake table engine in ClickHouse enables direct SQL queries against Delta Lake tables stored on S3 or local paths. You create a table pointing to the Delta Lake location, and ClickHouse reads the transaction log to determine which Parquet files are live. This approach eliminates ETL copy steps for read-heavy analytics while keeping your Delta Lake as the source of truth for write workloads.
