# How to Load Data into Redshift with COPY Command

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Redshift, Data Warehouse, ETL

Description: Master the Redshift COPY command for fast parallel data loading from S3, including file formats, error handling, and performance optimization.

---

The COPY command is Redshift's fastest way to load data. It reads files from S3 in parallel across all compute nodes, which is dramatically faster than row-by-row INSERT statements. Loading a billion rows with COPY can take minutes; the same data with INSERTs would take hours. If you're using Redshift, mastering COPY is essential.

## Basic COPY Syntax

At its simplest, COPY loads data from S3 into a table.

Load a CSV file from S3:

```sql
-- Basic COPY from CSV
COPY sales.orders
FROM 's3://my-data-bucket/orders/2026/02/'
IAM_ROLE 'arn:aws:iam::123456789012:role/RedshiftLoadRole'
CSV
IGNOREHEADER 1
REGION 'us-east-1';
```

The FROM path can point to a single file, a prefix (loading all files under that prefix), or a manifest file listing specific files.

## File Formats

COPY supports multiple file formats. Here's how to use each one.

### CSV Files

```sql
-- CSV with custom delimiter and quote character
COPY sales.orders
FROM 's3://my-data-bucket/orders/'
IAM_ROLE 'arn:aws:iam::123456789012:role/RedshiftLoadRole'
CSV
DELIMITER ','
IGNOREHEADER 1
QUOTE '"'
DATEFORMAT 'YYYY-MM-DD'
TIMEFORMAT 'YYYY-MM-DD HH:MI:SS'
NULL AS 'NULL'
ACCEPTINVCHARS '?'  -- Replace invalid chars instead of failing
REGION 'us-east-1';
```

### Parquet Files

Parquet is usually the best choice. It's columnar, compressed, and Redshift reads it efficiently:

```sql
-- Parquet files (recommended for performance)
COPY sales.orders
FROM 's3://my-data-bucket/orders-parquet/'
IAM_ROLE 'arn:aws:iam::123456789012:role/RedshiftLoadRole'
FORMAT AS PARQUET;
```

Parquet files carry their own schema, so you don't need to specify column mappings, date formats, or delimiters. Much simpler.

### JSON Files

```sql
-- JSON with auto-mapping (keys match column names)
COPY sales.events
FROM 's3://my-data-bucket/events/'
IAM_ROLE 'arn:aws:iam::123456789012:role/RedshiftLoadRole'
JSON 'auto'
GZIP
REGION 'us-east-1';

-- JSON with a JSONPaths file for custom mapping
COPY sales.events
FROM 's3://my-data-bucket/events/'
IAM_ROLE 'arn:aws:iam::123456789012:role/RedshiftLoadRole'
JSON 's3://my-data-bucket/jsonpaths/events.json'
REGION 'us-east-1';
```

A JSONPaths file maps JSON keys to table columns:

```json
{
  "jsonpaths": [
    "$.event_id",
    "$.timestamp",
    "$.user.id",
    "$.user.email",
    "$.action",
    "$.metadata.source"
  ]
}
```

## Compressed Files

COPY can automatically decompress files during loading. Just specify the compression type:

```sql
-- Gzip compressed files
COPY sales.orders
FROM 's3://my-data-bucket/orders/'
IAM_ROLE 'arn:aws:iam::123456789012:role/RedshiftLoadRole'
CSV
IGNOREHEADER 1
GZIP;

-- Other supported compressions
-- BZIP2, LZOP, ZSTD
COPY sales.orders
FROM 's3://my-data-bucket/orders/'
IAM_ROLE 'arn:aws:iam::123456789012:role/RedshiftLoadRole'
CSV
ZSTD;  -- Zstandard compression
```

## Loading Specific Columns

You don't have to load all columns. Specify which columns to fill and leave others as defaults:

```sql
-- Load only specific columns
COPY sales.orders (order_date, customer_id, product_id, quantity, total_amount)
FROM 's3://my-data-bucket/partial-orders/'
IAM_ROLE 'arn:aws:iam::123456789012:role/RedshiftLoadRole'
CSV
IGNOREHEADER 1;
```

Columns not listed will get their default values or NULL.

## Using Manifest Files

A manifest file gives you explicit control over which files to load. This is important for ensuring exactly-once loading.

Create a manifest file:

```json
{
  "entries": [
    {"url": "s3://my-data-bucket/orders/2026-02-01.csv.gz", "mandatory": true},
    {"url": "s3://my-data-bucket/orders/2026-02-02.csv.gz", "mandatory": true},
    {"url": "s3://my-data-bucket/orders/2026-02-03.csv.gz", "mandatory": true},
    {"url": "s3://my-data-bucket/orders/2026-02-04.csv.gz", "mandatory": false}
  ]
}
```

Use the manifest in COPY:

```sql
-- Load using a manifest file
COPY sales.orders
FROM 's3://my-data-bucket/manifests/feb-orders.manifest'
IAM_ROLE 'arn:aws:iam::123456789012:role/RedshiftLoadRole'
CSV
IGNOREHEADER 1
GZIP
MANIFEST;  -- Tells COPY the path is a manifest, not data
```

With `mandatory: true`, the COPY fails if the file is missing. This prevents silent data loss.

## Error Handling

COPY fails on the first error by default. You can configure it to tolerate some errors.

Allow a certain number of errors:

```sql
-- Allow up to 100 errors before failing
COPY sales.orders
FROM 's3://my-data-bucket/orders/'
IAM_ROLE 'arn:aws:iam::123456789012:role/RedshiftLoadRole'
CSV
IGNOREHEADER 1
MAXERROR 100;

-- Check what went wrong
SELECT
    starttime,
    filename,
    line_number,
    colname,
    type,
    raw_field_value,
    err_reason
FROM stl_load_errors
WHERE starttime > DATEADD(hour, -1, GETDATE())
ORDER BY starttime DESC;
```

The `stl_load_errors` table is your best friend for debugging load failures. It shows the exact file, line, column, and reason for each error.

## Performance Optimization

### Split Files for Parallel Loading

Redshift loads fastest when the number of files is a multiple of the number of slices. Each slice loads files in parallel.

```bash
# Split a large file into multiple smaller files
# Aim for file sizes between 1MB and 1GB each
split -l 1000000 large_file.csv orders_part_

# Compress each part
gzip orders_part_*

# Upload to S3
aws s3 cp . s3://my-data-bucket/orders/ --recursive --exclude "*" --include "orders_part_*.gz"
```

A good rule of thumb: create at least as many files as there are slices in your cluster. For Redshift Serverless, aim for at least 8-16 files.

### Use Columnar Formats

Parquet and ORC are much faster than CSV for large loads because Redshift can read only the columns it needs:

```sql
-- Parquet loads are typically 2-5x faster than CSV
COPY sales.orders
FROM 's3://my-data-bucket/orders-parquet/'
IAM_ROLE 'arn:aws:iam::123456789012:role/RedshiftLoadRole'
FORMAT AS PARQUET;
```

### Use COMPUPDATE OFF for Known Data

If you've already set column encodings on your table, skip the automatic compression analysis:

```sql
-- Skip compression analysis for faster loads
COPY sales.orders
FROM 's3://my-data-bucket/orders/'
IAM_ROLE 'arn:aws:iam::123456789012:role/RedshiftLoadRole'
CSV
IGNOREHEADER 1
COMPUPDATE OFF
STATUPDATE OFF;  -- Skip statistics update too
```

## Incremental Loading Pattern

For daily data loads, use a staging table pattern to handle upserts:

```sql
-- Create a staging table matching the target
CREATE TEMP TABLE staging_orders (LIKE sales.orders);

-- Load new data into staging
COPY staging_orders
FROM 's3://my-data-bucket/daily/2026-02-12/'
IAM_ROLE 'arn:aws:iam::123456789012:role/RedshiftLoadRole'
CSV
IGNOREHEADER 1;

-- Delete existing records that will be updated
DELETE FROM sales.orders
USING staging_orders
WHERE sales.orders.order_id = staging_orders.order_id;

-- Insert all records from staging (new + updated)
INSERT INTO sales.orders
SELECT * FROM staging_orders;

-- Clean up
DROP TABLE staging_orders;

-- Analyze the table for optimal query planning
ANALYZE sales.orders;
```

## Automating Loads with Lambda

Trigger a COPY command automatically when new files land in S3:

```python
import boto3

redshift_data = boto3.client("redshift-data")


def lambda_handler(event, context):
    """Triggered by S3 event when new data files arrive."""
    bucket = event["Records"][0]["s3"]["bucket"]["name"]
    key = event["Records"][0]["s3"]["object"]["key"]

    # Build the COPY command
    sql = f"""
    BEGIN;

    COPY sales.orders
    FROM 's3://{bucket}/{key}'
    IAM_ROLE 'arn:aws:iam::123456789012:role/RedshiftLoadRole'
    CSV
    IGNOREHEADER 1
    GZIP;

    ANALYZE sales.orders;

    COMMIT;
    """

    # Execute using Redshift Data API
    response = redshift_data.execute_statement(
        WorkgroupName="analytics-workgroup",
        Database="analytics_db",
        Sql=sql,
    )

    print(f"Started load: {response['Id']}")
    return {"execution_id": response["Id"]}
```

## Monitoring Load Performance

Check load status and performance:

```sql
-- Check recent COPY operations
SELECT
    query,
    TRIM(filename) AS filename,
    lines_scanned,
    lines_loaded,
    bytes_scanned,
    DATEDIFF(second, starttime, endtime) AS duration_seconds
FROM stl_load_commits lc
JOIN stl_query q ON lc.query = q.query
WHERE q.starttime > DATEADD(hour, -24, GETDATE())
ORDER BY q.starttime DESC
LIMIT 20;

-- Check for currently running loads
SELECT
    query,
    pid,
    TRIM(querytxt) AS sql,
    starttime,
    DATEDIFF(second, starttime, GETDATE()) AS running_seconds
FROM stv_recents
WHERE status = 'Running'
  AND TRIM(querytxt) LIKE 'COPY%';
```

For comprehensive monitoring of your Redshift data loading pipelines, check out our guide on [data pipeline monitoring](https://oneuptime.com/blog/post/2026-02-06-aws-cloudwatch-logs-exporter-opentelemetry-collector/view).

## Wrapping Up

The COPY command is the right tool for any bulk data loading into Redshift. Use Parquet when you can, split large files for parallel loading, and always check `stl_load_errors` when things go wrong. For incremental loads, the staging table pattern with DELETE/INSERT is the standard approach. And always run ANALYZE after loading to keep Redshift's query planner informed about your data distribution.
