# How to Use Iceberg Table Engine in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Iceberg, Storage, Table Engine, S3, Data Lake

Description: Learn how to use the Iceberg table engine in ClickHouse to query Apache Iceberg tables on S3 or GCS without ETL, enabling fast analytics on your open lakehouse.

---

## Introduction

Apache Iceberg is an open table format for large analytic datasets. ClickHouse includes a native `Iceberg` table engine that reads Iceberg tables stored on S3, GCS, or HDFS. You get time travel, partition evolution, and schema evolution support -- all queryable with standard ClickHouse SQL.

## Architecture Overview

```mermaid
graph LR
    A[Iceberg Table on S3] -->|metadata| B[ClickHouse Iceberg Engine]
    A --> C[metadata/]
    A --> D[data/*.parquet]
    B --> E[ClickHouse SQL Queries]
    C --> F[snapshot manifests]
```

## Prerequisites

- ClickHouse 23.3 or later
- Apache Iceberg table in S3 (Parquet format)
- IAM access key or instance profile with `s3:GetObject`, `s3:ListBucket`

## Creating an Iceberg Table

```sql
CREATE TABLE iceberg_sales
ENGINE = Iceberg(
    's3://my-data-lake/iceberg/sales/',
    'AKIAIOSFODNN7EXAMPLE',
    'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
);
```

ClickHouse reads the `metadata/` directory to locate the current snapshot and manifest files that point to active Parquet data files.

## With Named Collections

```xml
<!-- config.xml -->
<clickhouse>
  <named_collections>
    <s3_lake>
      <access_key_id>AKIAIOSFODNN7EXAMPLE</access_key_id>
      <secret_access_key>wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY</secret_access_key>
      <region>us-east-1</region>
    </s3_lake>
  </named_collections>
</clickhouse>
```

```sql
CREATE TABLE iceberg_sales
ENGINE = Iceberg(s3_lake, filename = 'iceberg/sales/');
```

## Querying the Table

```sql
SELECT
    region,
    product_id,
    sum(quantity)    AS total_qty,
    sum(revenue)     AS total_revenue
FROM iceberg_sales
WHERE sale_date >= '2024-01-01'
GROUP BY region, product_id
ORDER BY total_revenue DESC
LIMIT 20;
```

## Time Travel Queries

ClickHouse 24.1+ supports querying a specific Iceberg snapshot:

```sql
-- Query snapshot by ID
SELECT count()
FROM iceberg_sales
SETTINGS iceberg_snapshot_id = 1234567890123456789;
```

Or by timestamp:

```sql
SELECT count()
FROM iceberg_sales
SETTINGS iceberg_timestamp_ms = 1704067200000;
```

## Inspecting Table Metadata

```sql
DESCRIBE TABLE iceberg_sales;
```

```text
Column       Type       Comment
sale_id      Int64
product_id   Int64
quantity     Int32
revenue      Float64
sale_date    Date
region       String
```

## GCS-Backed Iceberg Table

The `Iceberg` engine is an alias for `IcebergS3`, so GCS is accessed via its S3-compatible endpoint using an HMAC key pair:

```sql
CREATE TABLE iceberg_sales_gcs
ENGINE = Iceberg(
    'https://storage.googleapis.com/my-lake-bucket/iceberg/sales/',
    '<HMAC_ACCESS_KEY>',
    '<HMAC_SECRET>'
);
```

## Partition Pruning

Iceberg stores partition statistics in manifest files. ClickHouse uses these to skip partitions that do not match the WHERE clause. Enable it with `use_iceberg_partition_pruning = 1`:

```sql
-- If table is partitioned by region and sale_date,
-- this query will skip all other partitions
SELECT sum(revenue)
FROM iceberg_sales
WHERE region = 'us-east'
  AND sale_date = '2024-06-01'
SETTINGS use_iceberg_partition_pruning = 1;
```

## Performance Tips

- Use Iceberg v2 tables (position delete files) written with Spark 3.3+ for the best read consistency.
- Partition by high-cardinality date columns so ClickHouse can prune effectively.
- Run `DESCRIBE TABLE` to verify ClickHouse inferred the correct types.
- The Iceberg engine is read-only in ClickHouse; writes require Spark, Flink, or PyIceberg.

## Monitoring Reads

```sql
SELECT
    query_id,
    read_rows,
    read_bytes,
    query_duration_ms
FROM system.query_log
WHERE tables LIKE '%iceberg_sales%'
  AND type = 'QueryFinish'
ORDER BY event_time DESC
LIMIT 10;
```

## Summary

The Iceberg table engine in ClickHouse reads Apache Iceberg tables directly from S3 or GCS by parsing Iceberg metadata manifests. You get partition pruning, time travel snapshots, and full schema inspection -- all with standard SQL and no data movement. This makes ClickHouse an excellent query engine layer on top of an Iceberg-based data lakehouse.
