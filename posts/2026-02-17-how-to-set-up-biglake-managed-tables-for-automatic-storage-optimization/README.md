# How to Set Up BigLake Managed Tables for Automatic Storage Optimization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigLake, BigQuery, Storage Optimization, Data Lake

Description: Learn how to set up BigLake managed tables on GCP that automatically optimize storage layout, file compaction, and clustering for better query performance.

---

BigLake managed tables take the operational burden out of managing data lake storage. Instead of manually compacting files, optimizing layouts, and tuning partition sizes, the managed table does all of this automatically behind the scenes. You write data, and BigLake handles the rest - file compaction, storage format optimization, and clustering for faster reads.

I switched a few workloads from standard external tables to BigLake managed tables and the difference in query performance was noticeable, especially for tables that receive frequent small writes from streaming pipelines. Here is the full setup process.

## What Makes Managed Tables Different

Regular external tables in BigQuery point to files in Cloud Storage that you manage yourself. If your streaming pipeline writes thousands of small Parquet files per hour, you are responsible for compacting them. If your data is not sorted optimally for your query patterns, that is your problem too.

BigLake managed tables flip this around. You create the table, write data to it, and BigLake automatically handles file compaction, sorts data by the clustering columns you specify, and converts data to the optimal storage format. It is similar to how native BigQuery tables work, but the data stays in Cloud Storage in open formats.

## Prerequisites

You need a Cloud Resource connection and a Cloud Storage bucket for the managed table data.

```bash
# Enable required APIs
gcloud services enable biglake.googleapis.com
gcloud services enable bigqueryconnection.googleapis.com

# Create a Cloud Storage bucket for managed table data
gsutil mb -l US gs://my-managed-tables-bucket/

# Create or reuse a BigQuery connection
bq mk --connection \
  --connection_type=CLOUD_RESOURCE \
  --location=US \
  managed-tables-connection

# Get the service account from the connection
bq show --connection --location=US managed-tables-connection
```

Grant the connection service account full access to the bucket since managed tables need to read, write, and delete files:

```bash
# The service account needs storage admin access for managed tables
# because it performs compaction which involves creating and deleting files
gsutil iam ch \
  serviceAccount:bq-xyz@gcp-sa-bigquery-condel.iam.gserviceaccount.com:objectAdmin \
  gs://my-managed-tables-bucket/
```

## Creating a BigLake Managed Table

Create the managed table by specifying the table type as BIGLAKE_MANAGED:

```sql
-- Create a dataset for managed tables
CREATE SCHEMA IF NOT EXISTS `my-project.managed_data`
OPTIONS (location = 'US');

-- Create a BigLake managed table with clustering
-- The CLUSTER BY clause tells BigLake how to sort data
-- for optimal query performance
CREATE TABLE `my-project.managed_data.user_activity` (
  user_id STRING NOT NULL,
  activity_type STRING NOT NULL,
  page_url STRING,
  duration_seconds INT64,
  device_category STRING,
  country STRING,
  event_timestamp TIMESTAMP NOT NULL,
  session_id STRING,
  properties JSON
)
CLUSTER BY user_id, activity_type, event_timestamp
WITH CONNECTION `my-project.US.managed-tables-connection`
OPTIONS (
  table_type = 'BIGLAKE_MANAGED',
  storage_uri = 'gs://my-managed-tables-bucket/user_activity/',
  file_format = 'PARQUET',
  table_format = 'ICEBERG'
);
```

The `table_format = 'ICEBERG'` option means the table uses Apache Iceberg format under the hood, which gives you features like time travel and ACID transactions. The clustering on `user_id`, `activity_type`, and `event_timestamp` means queries filtering on those columns will read far fewer files.

## Loading Data into Managed Tables

You can insert data using standard DML, streaming inserts, or load jobs. Here are several approaches.

Loading from an existing BigQuery table or query result:

```sql
-- Insert data from an existing table or query
-- BigLake handles writing the optimized Parquet files
INSERT INTO `my-project.managed_data.user_activity`
SELECT
  user_id,
  activity_type,
  page_url,
  duration_seconds,
  device_category,
  country,
  event_timestamp,
  session_id,
  TO_JSON_STRING(STRUCT(referrer, campaign)) AS properties
FROM `my-project.raw_data.web_events`
WHERE event_timestamp >= TIMESTAMP('2026-02-01');
```

Streaming data from an application using the Storage Write API:

```python
from google.cloud import bigquery_storage_v1
from google.cloud.bigquery_storage_v1 import types
from google.protobuf import descriptor_pb2
import json

# Initialize the BigQuery Storage Write API client
client = bigquery_storage_v1.BigQueryWriteClient()

# The managed table supports the Storage Write API just
# like native BigQuery tables
parent = client.table_path(
    "my-project", "managed_data", "user_activity"
)

# Create a write stream for committed mode
# Committed mode makes rows immediately visible after append
write_stream = types.WriteStream(type_=types.WriteStream.Type.COMMITTED)
write_stream = client.create_write_stream(
    parent=parent, write_stream=write_stream
)

print(f"Created write stream: {write_stream.name}")
# Continue with serializing and appending rows...
```

## Automatic Storage Optimization in Action

Once data is written to the managed table, BigLake automatically optimizes the storage. You do not need to trigger this manually. However, you can observe the optimization through table metadata.

```sql
-- Check the current storage statistics of the managed table
-- This shows how many files exist and their sizes
SELECT
  table_name,
  total_rows,
  total_logical_bytes,
  total_physical_bytes,
  SAFE_DIVIDE(total_physical_bytes, total_logical_bytes) AS compression_ratio
FROM `my-project.managed_data.INFORMATION_SCHEMA.TABLE_STORAGE`
WHERE table_name = 'user_activity';
```

The automatic optimizations include:

1. File compaction - small files from streaming writes are merged into larger files (targeting 256MB to 1GB per file)
2. Clustering - data is sorted by the clustering columns so queries can skip irrelevant files
3. Orphan file cleanup - temporary and abandoned files are cleaned up automatically

## Querying Managed Tables

Queries against managed tables work exactly like queries against native BigQuery tables. The clustering optimization kicks in automatically.

```sql
-- This query benefits from clustering on user_id and event_timestamp
-- BigLake only reads the files that contain matching data
SELECT
  activity_type,
  COUNT(*) AS activity_count,
  AVG(duration_seconds) AS avg_duration,
  COUNT(DISTINCT session_id) AS unique_sessions
FROM `my-project.managed_data.user_activity`
WHERE user_id = 'user_12345'
  AND event_timestamp BETWEEN TIMESTAMP('2026-02-01') AND TIMESTAMP('2026-02-17')
GROUP BY activity_type
ORDER BY activity_count DESC;
```

Compare the bytes scanned between a managed table with clustering and a regular external table without it. The difference can be dramatic for selective queries.

```sql
-- Check query performance metrics after running a query
-- Look at totalBytesProcessed versus totalBytesBilled
SELECT
  job_id,
  query,
  total_bytes_processed,
  total_bytes_billed,
  total_slot_ms,
  creation_time
FROM `my-project.region-us.INFORMATION_SCHEMA.JOBS`
WHERE creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
  AND statement_type = 'SELECT'
ORDER BY creation_time DESC
LIMIT 10;
```

## Using Time Travel on Managed Tables

Since managed tables use Iceberg format, you get time travel capabilities:

```sql
-- Query the table as it was 2 hours ago
SELECT COUNT(*) AS row_count
FROM `my-project.managed_data.user_activity`
FOR SYSTEM_TIME AS OF TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 2 HOUR);

-- Compare current state with a historical snapshot
SELECT
  'current' AS snapshot,
  COUNT(*) AS total_rows,
  COUNT(DISTINCT user_id) AS unique_users
FROM `my-project.managed_data.user_activity`
UNION ALL
SELECT
  'two_hours_ago' AS snapshot,
  COUNT(*) AS total_rows,
  COUNT(DISTINCT user_id) AS unique_users
FROM `my-project.managed_data.user_activity`
FOR SYSTEM_TIME AS OF TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 2 HOUR);
```

## Updating and Deleting Data

Managed tables support full DML operations including updates and deletes, which is a big advantage over regular external tables:

```sql
-- Update records in the managed table
-- BigLake handles the Iceberg copy-on-write or merge-on-read
UPDATE `my-project.managed_data.user_activity`
SET country = 'US'
WHERE country = 'USA';

-- Delete old records
DELETE FROM `my-project.managed_data.user_activity`
WHERE event_timestamp < TIMESTAMP('2025-01-01');
```

## Monitoring Storage Optimization

Keep an eye on how well the automatic optimization is working:

```sql
-- Monitor file sizes and compaction effectiveness
-- Healthy tables should have few small files after compaction
SELECT
  total_rows,
  total_physical_bytes,
  -- Estimate average file size (total bytes / estimated file count)
  SAFE_DIVIDE(
    total_physical_bytes,
    GREATEST(SAFE_DIVIDE(total_rows, 1000000), 1)
  ) AS estimated_avg_file_bytes
FROM `my-project.managed_data.INFORMATION_SCHEMA.TABLE_STORAGE`
WHERE table_name = 'user_activity';
```

## Summary

BigLake managed tables give you the best of both worlds - data stored in open formats in Cloud Storage with the automatic optimization you expect from a managed data warehouse. The setup requires a Cloud Resource connection with write access to your storage bucket, and then you create tables with the `BIGLAKE_MANAGED` table type. From there, compaction, clustering, and file cleanup happen automatically. You get full DML support, time travel, and performance that improves over time as the optimizer reorganizes your data. For workloads that involve frequent writes to data lake tables, managed tables remove a significant amount of operational overhead.
