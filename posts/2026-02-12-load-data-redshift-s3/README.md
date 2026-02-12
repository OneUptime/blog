# How to Load Data into Redshift from S3

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Redshift, S3, ETL, Data Warehouse

Description: A detailed guide to loading data into Amazon Redshift from S3 using the COPY command, covering file formats, compression, error handling, and performance tuning.

---

The COPY command is the workhorse of Redshift data loading. It's dramatically faster than row-by-row INSERT statements because it reads files in parallel from S3, distributes the work across all your cluster nodes, and handles compression and format conversion automatically. If you're moving data into Redshift, COPY should be your default approach.

This guide covers everything you need to know - from basic COPY syntax to production-ready loading patterns. If you're still setting up your cluster, start with our [Redshift data warehousing guide](https://oneuptime.com/blog/post/amazon-redshift-data-warehousing/view).

## Prerequisites

Your Redshift cluster needs an IAM role that allows reading from S3. Create one if you haven't already.

```bash
# Create an IAM role for Redshift to access S3
aws iam create-role \
  --role-name RedshiftS3ReadRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "redshift.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

# Attach S3 read-only policy
aws iam attach-role-policy \
  --role-name RedshiftS3ReadRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess

# Associate the role with your Redshift cluster
aws redshift modify-cluster-iam-roles \
  --cluster-identifier analytics-warehouse \
  --add-iam-roles arn:aws:iam::123456789:role/RedshiftS3ReadRole
```

## Basic COPY Command

Here's the simplest form of COPY, loading a CSV file from S3.

```sql
-- Load a CSV file into a Redshift table
COPY orders
FROM 's3://my-data-bucket/orders/orders.csv'
IAM_ROLE 'arn:aws:iam::123456789:role/RedshiftS3ReadRole'
CSV
IGNOREHEADER 1;
```

The `IGNOREHEADER 1` skips the first row, which typically contains column headers.

## File Formats

Redshift supports several file formats. Each has trade-offs.

### CSV

The most common format for simple data loads.

```sql
-- CSV with custom delimiter and quote character
COPY products
FROM 's3://my-data-bucket/products/'
IAM_ROLE 'arn:aws:iam::123456789:role/RedshiftS3ReadRole'
CSV
DELIMITER '|'
QUOTE '"'
IGNOREHEADER 1
DATEFORMAT 'YYYY-MM-DD'
TIMEFORMAT 'YYYY-MM-DD HH:MI:SS'
NULL AS 'NULL'
ACCEPTINVCHARS '?';
```

### JSON

Good when your source data is already JSON, but slower than columnar formats.

```sql
-- Load JSON data with a JSONPaths file for column mapping
COPY events
FROM 's3://my-data-bucket/events/'
IAM_ROLE 'arn:aws:iam::123456789:role/RedshiftS3ReadRole'
JSON 's3://my-data-bucket/jsonpaths/events_paths.json';
```

The JSONPaths file maps JSON fields to table columns.

```json
{
  "jsonpaths": [
    "$.event_id",
    "$.event_type",
    "$.user_id",
    "$.timestamp",
    "$.properties.page_url",
    "$.properties.referrer"
  ]
}
```

### Parquet

The best format for large datasets. It's columnar, compressed, and self-describing.

```sql
-- Load Parquet files - no need to specify columns, they're in the file
COPY fact_sales
FROM 's3://my-data-bucket/sales/year=2026/month=01/'
IAM_ROLE 'arn:aws:iam::123456789:role/RedshiftS3ReadRole'
FORMAT AS PARQUET;
```

Parquet is typically 2-4x faster to load than CSV because Redshift doesn't need to parse text.

## Compression

Always compress your files before uploading to S3. It reduces both storage costs and load time since there's less data to transfer.

```sql
-- Load GZIP-compressed CSV files
COPY orders
FROM 's3://my-data-bucket/orders/'
IAM_ROLE 'arn:aws:iam::123456789:role/RedshiftS3ReadRole'
CSV
IGNOREHEADER 1
GZIP;

-- Load ZSTD-compressed files (better compression ratio than GZIP)
COPY orders
FROM 's3://my-data-bucket/orders/'
IAM_ROLE 'arn:aws:iam::123456789:role/RedshiftS3ReadRole'
CSV
IGNOREHEADER 1
ZSTD;

-- Load LZO-compressed files
COPY orders
FROM 's3://my-data-bucket/orders/'
IAM_ROLE 'arn:aws:iam::123456789:role/RedshiftS3ReadRole'
CSV
IGNOREHEADER 1
LZOP;
```

## Splitting Files for Parallel Loading

This is the single biggest performance optimization you can make. Split your data into multiple files so each Redshift slice can load a file in parallel.

The ideal number of files is a multiple of your cluster's total slice count. For a 2-node ra3.xlplus cluster, you have 4 slices, so split into 4, 8, or 16 files.

```bash
# Split a large CSV file into smaller chunks on the command line
split -l 1000000 --additional-suffix=.csv large_file.csv orders_part_

# Compress each chunk
gzip orders_part_*.csv

# Upload all chunks to S3 with a common prefix
aws s3 cp . s3://my-data-bucket/orders/ --recursive --exclude "*" --include "orders_part_*.csv.gz"
```

When you point COPY at a prefix (ending with `/` or without a file extension), it loads all matching files in parallel.

```sql
-- Load all files matching the prefix in parallel
COPY orders
FROM 's3://my-data-bucket/orders/orders_part_'
IAM_ROLE 'arn:aws:iam::123456789:role/RedshiftS3ReadRole'
CSV
GZIP;
```

## Using a Manifest File

For precise control over which files to load, use a manifest.

```json
{
  "entries": [
    {"url": "s3://my-data-bucket/orders/2026/01/part-001.csv.gz", "mandatory": true},
    {"url": "s3://my-data-bucket/orders/2026/01/part-002.csv.gz", "mandatory": true},
    {"url": "s3://my-data-bucket/orders/2026/01/part-003.csv.gz", "mandatory": true},
    {"url": "s3://my-data-bucket/orders/2026/01/part-004.csv.gz", "mandatory": true}
  ]
}
```

```sql
-- Load files specified in the manifest
COPY orders
FROM 's3://my-data-bucket/manifests/january_orders.manifest'
IAM_ROLE 'arn:aws:iam::123456789:role/RedshiftS3ReadRole'
CSV
GZIP
MANIFEST;
```

The `mandatory: true` flag means the COPY will fail if any listed file is missing. This prevents silent data loss.

## Error Handling

By default, COPY fails on the first error. In production, you usually want to allow some errors and investigate them later.

```sql
-- Allow up to 100 errors before failing the entire load
COPY orders
FROM 's3://my-data-bucket/orders/'
IAM_ROLE 'arn:aws:iam::123456789:role/RedshiftS3ReadRole'
CSV
IGNOREHEADER 1
GZIP
MAXERROR 100;
```

After a COPY finishes (whether it succeeds or fails), check the error log.

```sql
-- View load errors from the most recent COPY
SELECT query, filename, line_number, colname, type, raw_line, err_reason
FROM stl_load_errors
ORDER BY starttime DESC
LIMIT 20;

-- Get a summary of load results
SELECT query, filename, lines_scanned, bytes_scanned, status
FROM stl_load_commits
ORDER BY starttime DESC
LIMIT 10;
```

## The Staging Table Pattern

For production ETL, don't load directly into your target table. Use a staging table and then merge.

```sql
-- Step 1: Create a staging table that mirrors the target
CREATE TEMP TABLE orders_staging (LIKE orders);

-- Step 2: Load new data into staging
COPY orders_staging
FROM 's3://my-data-bucket/daily-orders/2026-02-12/'
IAM_ROLE 'arn:aws:iam::123456789:role/RedshiftS3ReadRole'
CSV GZIP IGNOREHEADER 1;

-- Step 3: Delete existing rows that will be updated
DELETE FROM orders
USING orders_staging
WHERE orders.order_id = orders_staging.order_id;

-- Step 4: Insert all rows from staging (new + updated)
INSERT INTO orders
SELECT * FROM orders_staging;

-- Step 5: Clean up
DROP TABLE orders_staging;

-- Step 6: Update statistics after large changes
ANALYZE orders;
```

This upsert pattern handles both inserts and updates cleanly, and the temp staging table is automatically cleaned up at the end of your session.

## Automating Data Loads

For regular data loads, you can use a Lambda function triggered by S3 events.

```python
# Lambda function that triggers a Redshift COPY when new files arrive in S3
import boto3
import redshift_connector

def handler(event, context):
    # Get the S3 key from the event
    bucket = event['Records'][0]['s3']['bucket']['name']
    key = event['Records'][0]['s3']['object']['key']
    s3_path = f's3://{bucket}/{key}'

    # Connect to Redshift
    conn = redshift_connector.connect(
        host='analytics-warehouse.xxxxx.us-east-1.redshift.amazonaws.com',
        port=5439,
        database='warehouse',
        user='admin',
        password='SecurePassword123!'
    )

    cursor = conn.cursor()

    # Run the COPY command
    copy_sql = f"""
        COPY orders
        FROM '{s3_path}'
        IAM_ROLE 'arn:aws:iam::123456789:role/RedshiftS3ReadRole'
        CSV GZIP IGNOREHEADER 1
        MAXERROR 50
    """

    cursor.execute(copy_sql)
    conn.commit()
    conn.close()

    return {'statusCode': 200, 'body': f'Loaded {s3_path}'}
```

## Performance Benchmarks

Here's what to expect for load speeds with different configurations on a 2-node ra3.xlplus cluster:

| Format | Compression | Files | 1GB Load Time |
|--------|------------|-------|---------------|
| CSV | None | 1 | ~45 seconds |
| CSV | GZIP | 1 | ~30 seconds |
| CSV | GZIP | 8 | ~8 seconds |
| Parquet | Built-in | 8 | ~4 seconds |

The takeaway: split your files and use Parquet when possible. The difference between a single uncompressed CSV and 8 Parquet files is roughly 10x.

## Wrapping Up

The COPY command is simple in concept but has a lot of knobs you can turn. The biggest wins come from splitting files for parallel loading, using columnar formats like Parquet, and compressing everything. Use the staging table pattern for production ETL, always check `stl_load_errors` after loads, and automate the whole thing with Lambda or Step Functions. Your data pipeline will thank you.
