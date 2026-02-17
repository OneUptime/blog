# How to Create BigLake Tables Over Cloud Storage Data for Unified Governance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigLake, Cloud Storage, Data Governance, BigQuery

Description: A practical guide to creating BigLake tables over Cloud Storage data to unify governance, access control, and querying across your data lake and data warehouse.

---

If you have been managing separate access controls for your data lake files in Cloud Storage and your BigQuery tables, BigLake can simplify your life significantly. BigLake lets you create tables that sit on top of Cloud Storage data but are governed through BigQuery's access control mechanisms. This means one set of policies, one set of permissions, and the ability to query data in Cloud Storage using standard SQL without moving it anywhere.

I started using BigLake after dealing with the headache of maintaining IAM policies on individual Cloud Storage buckets while also managing BigQuery dataset permissions. The unified approach is much cleaner. Here is how to set it all up.

## What BigLake Actually Does

BigLake acts as an abstraction layer between your query engines and the underlying storage. When you create a BigLake table, you are essentially telling BigQuery: "This data lives in Cloud Storage, but I want you to manage access to it." The query engine never accesses the files directly - it goes through a BigLake connection that handles authentication and authorization.

This matters because it means you can apply row-level security, column-level security, and data masking to data stored in open formats like Parquet and ORC in Cloud Storage. Before BigLake, those features were only available for native BigQuery tables.

## Prerequisites

Before creating BigLake tables, you need a few things in place. Make sure you have a Cloud Storage bucket with data in a supported format and the BigQuery Connection API enabled.

```bash
# Enable the required APIs
gcloud services enable bigqueryconnection.googleapis.com
gcloud services enable bigquery.googleapis.com

# Verify your data exists in Cloud Storage
gsutil ls gs://my-data-lake/sales/
```

## Creating a Cloud Resource Connection

BigLake tables require a Cloud Resource connection. This connection creates a service account that BigQuery uses to access your Cloud Storage data on behalf of users.

```bash
# Create a BigQuery connection in your desired region
bq mk --connection \
  --connection_type=CLOUD_RESOURCE \
  --location=US \
  my-biglake-connection

# Get the service account associated with the connection
# You will need this to grant storage access
bq show --connection --location=US my-biglake-connection
```

The output will include a service account email like `bq-xyz@gcp-sa-bigquery-condel.iam.gserviceaccount.com`. This service account needs read access to your Cloud Storage bucket.

```bash
# Grant the connection service account read access to your bucket
gsutil iam ch \
  serviceAccount:bq-xyz@gcp-sa-bigquery-condel.iam.gserviceaccount.com:objectViewer \
  gs://my-data-lake/
```

## Creating a BigLake Table Over Parquet Data

Now you can create a BigLake table that points to your Cloud Storage data. Here is an example with Parquet files:

```sql
-- Create a dataset for BigLake tables if you do not have one
CREATE SCHEMA IF NOT EXISTS `my-project.data_lake`
OPTIONS (location = 'US');

-- Create a BigLake table over Parquet files in Cloud Storage
-- The connection parameter is what makes this a BigLake table
-- rather than a regular external table
CREATE OR REPLACE EXTERNAL TABLE `my-project.data_lake.sales_data`
WITH CONNECTION `my-project.US.my-biglake-connection`
OPTIONS (
  format = 'PARQUET',
  uris = ['gs://my-data-lake/sales/*.parquet'],
  max_staleness = INTERVAL 30 MINUTE,
  metadata_cache_mode = 'AUTOMATIC'
);
```

The `WITH CONNECTION` clause is what distinguishes a BigLake table from a regular external table. Without it, users need direct access to the Cloud Storage bucket. With it, access is managed entirely through BigQuery permissions.

## Creating a BigLake Table Over CSV Data

BigLake supports various formats. Here is how to create one over CSV files with explicit schema definition:

```sql
-- Create a BigLake table over CSV files
-- Specify the schema explicitly since CSV does not have embedded schema
CREATE OR REPLACE EXTERNAL TABLE `my-project.data_lake.customer_logs` (
  customer_id STRING,
  action STRING,
  timestamp TIMESTAMP,
  ip_address STRING,
  user_agent STRING,
  response_code INT64
)
WITH CONNECTION `my-project.US.my-biglake-connection`
OPTIONS (
  format = 'CSV',
  uris = ['gs://my-data-lake/logs/customers/*.csv'],
  skip_leading_rows = 1,
  field_delimiter = ',',
  max_staleness = INTERVAL 1 HOUR,
  metadata_cache_mode = 'AUTOMATIC'
);
```

## Working with Hive-Partitioned Data

If your data in Cloud Storage follows a Hive partitioning scheme (like `year=2026/month=02/day=17/`), BigLake can detect and use those partitions for query pruning.

```sql
-- Create a BigLake table with Hive partition detection
-- The source_uri_prefix tells BigLake where partitioning starts
CREATE OR REPLACE EXTERNAL TABLE `my-project.data_lake.web_events`
WITH CONNECTION `my-project.US.my-biglake-connection`
OPTIONS (
  format = 'PARQUET',
  uris = ['gs://my-data-lake/web_events/*'],
  hive_partition_uri_prefix = 'gs://my-data-lake/web_events/',
  require_hive_partition_filter = true,
  max_staleness = INTERVAL 15 MINUTE,
  metadata_cache_mode = 'AUTOMATIC'
);
```

With `require_hive_partition_filter` set to true, queries must include a partition filter, which prevents accidental full table scans across your entire data lake.

```sql
-- This query uses partition pruning to only read February 2026 data
SELECT *
FROM `my-project.data_lake.web_events`
WHERE year = 2026 AND month = 2
LIMIT 100;
```

## Setting Up Unified Governance

The real value of BigLake comes from unified governance. You can now manage access to Cloud Storage data using BigQuery's permission model.

```bash
# Grant a user read access to the BigLake table
# They do NOT need Cloud Storage permissions
bq update \
  --grant_access \
  --user:analyst@example.com:READER \
  my-project:data_lake

# Alternatively, use IAM roles at the dataset level
gcloud projects add-iam-policy-binding my-project \
  --member="user:analyst@example.com" \
  --role="roles/bigquery.dataViewer" \
  --condition="expression=resource.name.startsWith('projects/my-project/datasets/data_lake'),title=data-lake-access"
```

Users with BigQuery access to the table can now query the data without ever having direct access to the underlying Cloud Storage bucket. The BigLake connection service account handles all the storage access behind the scenes.

## Querying BigLake Tables

Once set up, querying BigLake tables is identical to querying native BigQuery tables. There is no special syntax required.

```sql
-- Run standard SQL queries against your Cloud Storage data
-- BigQuery handles the connection to Cloud Storage transparently
SELECT
  DATE(timestamp) AS event_date,
  action,
  COUNT(*) AS event_count,
  COUNT(DISTINCT customer_id) AS unique_customers
FROM `my-project.data_lake.customer_logs`
WHERE timestamp >= TIMESTAMP('2026-02-01')
GROUP BY event_date, action
ORDER BY event_date DESC, event_count DESC;
```

You can even join BigLake tables with native BigQuery tables seamlessly:

```sql
-- Join data lake events with a native BigQuery dimension table
SELECT
  s.customer_id,
  c.customer_name,
  c.segment,
  SUM(s.amount) AS total_sales
FROM `my-project.data_lake.sales_data` s
JOIN `my-project.warehouse.customers` c
  ON s.customer_id = c.customer_id
GROUP BY s.customer_id, c.customer_name, c.segment
ORDER BY total_sales DESC
LIMIT 50;
```

## Monitoring and Troubleshooting

Check the performance and status of your BigLake tables using INFORMATION_SCHEMA:

```sql
-- View metadata about your external tables
SELECT
  table_name,
  creation_time,
  option_name,
  option_value
FROM `my-project.data_lake.INFORMATION_SCHEMA.TABLE_OPTIONS`
WHERE table_name = 'sales_data';
```

If queries are slow, check that metadata caching is working and that your files are not too small (many tiny files hurt performance). Aim for file sizes between 256 MB and 1 GB for Parquet data.

## Summary

BigLake tables bridge the gap between your data lake and data warehouse by providing unified governance over Cloud Storage data. The setup involves creating a connection, granting the connection service account access to your storage, and creating tables with the `WITH CONNECTION` clause. From there, all access control happens through BigQuery permissions, and your analysts can query data lake files using standard SQL without needing any Cloud Storage IAM bindings. The metadata caching and Hive partition support keep queries performant even over large datasets.
