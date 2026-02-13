# How to Use Athena CTAS for Creating Optimized Tables

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Athena, S3, Performance, Data Lake

Description: Learn how to use Athena CTAS statements to create optimized, partitioned, and compressed tables that dramatically reduce query costs and improve performance.

---

CTAS stands for CREATE TABLE AS SELECT, and in Athena it's one of the most versatile tools you have for data optimization. It lets you take any query result and materialize it as a new table in an optimized format. You can change the file format, add partitioning, compress the data, bucket it, and compact small files - all in a single SQL statement.

I use CTAS for everything from one-time format conversions to creating precomputed summary tables. It's the Swiss Army knife of Athena data optimization.

## Basic CTAS Syntax

At its simplest, CTAS creates a new table from a SELECT query:

```sql
-- Basic CTAS: create a Parquet copy of a CSV table
CREATE TABLE optimized_sales
WITH (
    format = 'PARQUET',
    external_location = 's3://my-data-lake/optimized/sales/'
) AS
SELECT * FROM raw_sales_csv;
```

But the real power comes from the WITH clause options:

```sql
-- CTAS with all the optimization options
CREATE TABLE optimized_sales
WITH (
    format = 'PARQUET',
    parquet_compression = 'SNAPPY',
    external_location = 's3://my-data-lake/optimized/sales/',
    partitioned_by = ARRAY['year', 'month'],
    bucketed_by = ARRAY['customer_id'],
    bucket_count = 10
) AS
SELECT
    sale_id,
    customer_id,
    product_name,
    category,
    sale_date,
    amount,
    CAST(YEAR(sale_date) AS VARCHAR) AS year,
    LPAD(CAST(MONTH(sale_date) AS VARCHAR), 2, '0') AS month
FROM raw_sales;
```

## Understanding the Options

**format** - Choose between PARQUET, ORC, AVRO, JSON, or TEXTFILE. Parquet and ORC are columnar formats that give you the best query performance with Athena.

**parquet_compression / orc_compression** - Compression codec. SNAPPY for speed, GZIP for maximum compression, ZSTD for the best balance.

**external_location** - Where the output files go in S3. Without this, Athena uses a default location that's harder to manage.

**partitioned_by** - Columns to use as partition keys. These must be the LAST columns in your SELECT statement.

**bucketed_by / bucket_count** - Distributes data into fixed-size buckets based on a column. Great for tables you frequently join on a specific column.

## Format Conversion

The most common CTAS use case is converting from an unoptimized format to Parquet:

```sql
-- Convert JSON logs to partitioned Parquet
CREATE TABLE logs_parquet
WITH (
    format = 'PARQUET',
    parquet_compression = 'SNAPPY',
    external_location = 's3://my-data-lake/optimized/logs/',
    partitioned_by = ARRAY['dt']
) AS
SELECT
    event_id,
    user_id,
    event_type,
    CAST(event_data AS VARCHAR) AS event_data,
    event_timestamp,
    source_ip,
    CAST(DATE(event_timestamp) AS VARCHAR) AS dt
FROM raw_json_logs
WHERE event_timestamp >= TIMESTAMP '2026-01-01 00:00:00';
```

## Creating Summary Tables

CTAS is perfect for creating precomputed aggregates that speed up dashboard queries:

```sql
-- Create a daily summary table from detailed transaction data
-- Dashboard queries against this table will be much faster
CREATE TABLE daily_sales_summary
WITH (
    format = 'PARQUET',
    parquet_compression = 'SNAPPY',
    external_location = 's3://my-data-lake/summaries/daily-sales/',
    partitioned_by = ARRAY['year_month']
) AS
SELECT
    sale_date,
    region,
    category,
    COUNT(*) AS transaction_count,
    COUNT(DISTINCT customer_id) AS unique_customers,
    SUM(amount) AS total_revenue,
    AVG(amount) AS avg_transaction_value,
    MIN(amount) AS min_transaction,
    MAX(amount) AS max_transaction,
    APPROX_PERCENTILE(amount, 0.5) AS median_transaction,
    APPROX_PERCENTILE(amount, 0.95) AS p95_transaction,
    CONCAT(CAST(YEAR(sale_date) AS VARCHAR), '-', LPAD(CAST(MONTH(sale_date) AS VARCHAR), 2, '0')) AS year_month
FROM detailed_transactions
GROUP BY sale_date, region, category,
    CONCAT(CAST(YEAR(sale_date) AS VARCHAR), '-', LPAD(CAST(MONTH(sale_date) AS VARCHAR), 2, '0'));
```

## Compacting Small Files

One of the biggest performance killers in Athena is having thousands of tiny files. Each file requires a separate S3 GetObject call, and there's overhead for opening and processing each file. CTAS can compact them:

```sql
-- Compact small files in a specific partition
-- This reads many tiny files and writes fewer, larger ones
CREATE TABLE events_compacted
WITH (
    format = 'PARQUET',
    parquet_compression = 'SNAPPY',
    external_location = 's3://my-data-lake/compacted/events/dt=2026-02-12/'
) AS
SELECT
    event_id, user_id, event_type, event_data, event_timestamp
FROM events
WHERE dt = '2026-02-12';
```

For a target file size around 128 MB, you can control the number of output files using bucketing:

```sql
-- Control the number of output files with bucketing
-- 20 buckets means roughly 20 output files per partition
CREATE TABLE events_compacted
WITH (
    format = 'PARQUET',
    parquet_compression = 'SNAPPY',
    external_location = 's3://my-data-lake/compacted/events/',
    partitioned_by = ARRAY['dt'],
    bucketed_by = ARRAY['event_id'],
    bucket_count = 20
) AS
SELECT
    event_id, user_id, event_type, event_data, event_timestamp,
    CAST(DATE(event_timestamp) AS VARCHAR) AS dt
FROM events_raw
WHERE event_timestamp >= TIMESTAMP '2026-02-01 00:00:00';
```

## Incremental CTAS with INSERT INTO

CTAS creates a new table, but you can also use INSERT INTO to add data to an existing CTAS table:

```sql
-- First, create the table structure with initial data
CREATE TABLE incremental_sales
WITH (
    format = 'PARQUET',
    parquet_compression = 'SNAPPY',
    external_location = 's3://my-data-lake/incremental/sales/',
    partitioned_by = ARRAY['sale_month']
) AS
SELECT
    sale_id, customer_id, product_name, amount, sale_date,
    DATE_FORMAT(sale_date, '%Y-%m') AS sale_month
FROM raw_sales
WHERE sale_date < DATE '2026-02-01';

-- Then incrementally add new data
INSERT INTO incremental_sales
SELECT
    sale_id, customer_id, product_name, amount, sale_date,
    DATE_FORMAT(sale_date, '%Y-%m') AS sale_month
FROM raw_sales
WHERE sale_date >= DATE '2026-02-01' AND sale_date < DATE '2026-03-01';
```

This pattern is useful for maintaining optimized tables that get updated regularly. Run the INSERT INTO daily or hourly to keep the optimized table current.

## CTAS with Joins and Denormalization

CTAS is excellent for creating denormalized tables that combine data from multiple sources, eliminating expensive runtime joins:

```sql
-- Create a denormalized table that joins at write time instead of query time
CREATE TABLE enriched_orders
WITH (
    format = 'PARQUET',
    parquet_compression = 'SNAPPY',
    external_location = 's3://my-data-lake/enriched/orders/',
    partitioned_by = ARRAY['order_month']
) AS
SELECT
    o.order_id,
    o.order_date,
    o.amount,
    c.customer_name,
    c.customer_segment,
    c.customer_region,
    p.product_name,
    p.product_category,
    p.product_subcategory,
    DATE_FORMAT(o.order_date, '%Y-%m') AS order_month
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
JOIN products p ON o.product_id = p.product_id
WHERE o.order_date >= DATE '2026-01-01';
```

Queries against this denormalized table only scan one table instead of three, which is faster and cheaper.

## Limitations to Know

**100 partition limit** - A single CTAS or INSERT INTO statement can create at most 100 new partitions. If your data spans more than 100 partitions, you need to run multiple statements or use a Glue job.

**No updates** - CTAS creates immutable files. You can't update individual rows. To refresh data, either drop and recreate the table or use INSERT INTO for new partitions.

**Query timeout** - CTAS has the same 30-minute default query timeout as regular queries. For very large conversions, use a Glue job instead.

```sql
-- Working around the 100-partition limit
-- Process data in chunks by month
INSERT INTO optimized_table
SELECT ...
FROM raw_table
WHERE sale_date >= DATE '2026-01-01' AND sale_date < DATE '2026-04-01';

INSERT INTO optimized_table
SELECT ...
FROM raw_table
WHERE sale_date >= DATE '2026-04-01' AND sale_date < DATE '2026-07-01';
```

## Automating CTAS with Step Functions

For recurring CTAS operations, automate them with Step Functions calling the Athena API:

```json
{
    "StartAt": "RunCTAS",
    "States": {
        "RunCTAS": {
            "Type": "Task",
            "Resource": "arn:aws:states:::athena:startQueryExecution.sync",
            "Parameters": {
                "QueryString": "INSERT INTO optimized_sales SELECT sale_id, customer_id, amount, sale_date, DATE_FORMAT(sale_date, '%Y-%m') AS sale_month FROM raw_sales WHERE sale_date = current_date - interval '1' day",
                "WorkGroup": "primary",
                "ResultConfiguration": {
                    "OutputLocation": "s3://athena-results/ctas-automation/"
                }
            },
            "End": true
        }
    }
}
```

CTAS is one of the most practical tools in the Athena toolkit. Combined with [proper partitioning](https://oneuptime.com/blog/post/2026-02-12-partition-data-s3-efficient-athena-queries/view) and [Parquet format](https://oneuptime.com/blog/post/2026-02-12-convert-csv-to-parquet-aws/view), it gives you a highly optimized data lake. For parameterized queries against these optimized tables, see [Athena prepared statements](https://oneuptime.com/blog/post/2026-02-12-athena-prepared-statements-parameterized-queries/view).
