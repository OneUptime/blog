# How to Set Up BigQuery External Tables over Cloud Storage Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, External Tables, Cloud Storage, Data Lake, ETL

Description: Learn how to create BigQuery external tables that query data directly from Cloud Storage files in CSV, JSON, Parquet, and other formats without loading data into BigQuery.

---

Not all data needs to live inside BigQuery to be queryable. External tables let you run SQL queries against files sitting in Cloud Storage - CSV, JSON, Avro, Parquet, ORC - without importing them. The data stays where it is, and BigQuery reads it on the fly when you run a query.

This is useful for several scenarios: querying data lakes, running ad-hoc analysis on log files, accessing data that changes frequently and does not warrant a full load, or keeping costs down by not duplicating data storage. The tradeoff is performance - external tables are slower than native BigQuery tables because data is read from Cloud Storage at query time.

## How External Tables Work

When you query an external table, BigQuery reads the source files from Cloud Storage, applies your query, and returns results. There is no data stored in BigQuery itself.

```mermaid
flowchart LR
    User[SQL Query] --> BQ[BigQuery Engine]
    BQ --> GCS[Cloud Storage]
    GCS -->|Read CSV/JSON/Parquet| BQ
    BQ --> User
```

## Creating an External Table over CSV Files

Let us say you have CSV files in a Cloud Storage bucket.

```bash
# View the structure of your CSV files
gsutil cat gs://my-data-bucket/sales/2026-01/sales_data.csv | head -5
```

Create the external table definition:

```bash
# Create an external table over CSV files
bq mk --external_table_definition=@CSV=gs://my-data-bucket/sales/*.csv \
    my-project-id:analytics.external_sales
```

For more control over the schema and options, use a JSON definition file.

```json
{
    "sourceFormat": "CSV",
    "sourceUris": ["gs://my-data-bucket/sales/*.csv"],
    "csvOptions": {
        "skipLeadingRows": 1,
        "fieldDelimiter": ",",
        "quote": "\"",
        "allowQuotedNewlines": true
    },
    "autodetect": true
}
```

```bash
# Create the external table with the definition file
bq mk --external_table_definition=definition.json \
    my-project-id:analytics.external_sales
```

## Creating an External Table over JSON Files

For newline-delimited JSON files (one JSON object per line):

```bash
# Create an external table over JSON files
bq mk --external_table_definition=@NEWLINE_DELIMITED_JSON=gs://my-data-bucket/events/*.json \
    my-project-id:analytics.external_events
```

With explicit schema:

```bash
# Create with explicit schema for JSON files
bq mk --external_table_definition=@NEWLINE_DELIMITED_JSON=gs://my-data-bucket/events/*.json \
    --schema="event_id:STRING,event_type:STRING,user_id:STRING,timestamp:TIMESTAMP,properties:STRING" \
    my-project-id:analytics.external_events
```

## Creating an External Table over Parquet Files

Parquet files are the recommended format for external tables because they are columnar, compressed, and include schema information.

```bash
# Create an external table over Parquet files
bq mk --external_table_definition=@PARQUET=gs://my-data-bucket/warehouse/*.parquet \
    my-project-id:analytics.external_warehouse
```

BigQuery automatically detects the schema from Parquet files, so you rarely need to specify it manually.

## Using SQL to Create External Tables

You can also create external tables using DDL statements.

```sql
-- Create an external table over Parquet files using SQL
CREATE EXTERNAL TABLE `my-project-id.analytics.external_orders`
OPTIONS (
    format = 'PARQUET',
    uris = ['gs://my-data-bucket/orders/year=*/month=*/*.parquet']
);
```

For CSV with custom options:

```sql
-- Create an external table over CSV files with custom settings
CREATE EXTERNAL TABLE `my-project-id.analytics.external_logs` (
    timestamp TIMESTAMP,
    level STRING,
    service STRING,
    message STRING,
    trace_id STRING
)
OPTIONS (
    format = 'CSV',
    uris = ['gs://my-logs-bucket/app-logs/2026-02-*.csv'],
    skip_leading_rows = 1,
    field_delimiter = ',',
    quote = '"'
);
```

## Hive-Partitioned External Tables

If your files in Cloud Storage follow a Hive-style partition layout (like `year=2026/month=02/day=17/`), BigQuery can detect and use this partitioning for query optimization.

```sql
-- Create an external table with Hive partitioning
CREATE EXTERNAL TABLE `my-project-id.analytics.partitioned_events`
WITH PARTITION COLUMNS (
    year INT64,
    month INT64,
    day INT64
)
OPTIONS (
    format = 'PARQUET',
    uris = ['gs://my-data-bucket/events/*'],
    hive_partition_uri_prefix = 'gs://my-data-bucket/events/',
    require_hive_partition_filter = true
);
```

The `require_hive_partition_filter` option forces queries to include a partition filter, preventing full scans.

```sql
-- This works because it includes partition filters
SELECT * FROM `my-project-id.analytics.partitioned_events`
WHERE year = 2026 AND month = 2 AND day = 17;

-- This fails because no partition filter is specified
SELECT COUNT(*) FROM `my-project-id.analytics.partitioned_events`;
-- Error: Cannot query over table without filter on partition columns
```

## Querying External Tables

Once created, you query external tables just like native tables.

```sql
-- Query the external table
SELECT
    product_category,
    SUM(amount) AS total_sales,
    COUNT(*) AS transaction_count
FROM
    `my-project-id.analytics.external_sales`
WHERE
    sale_date >= '2026-01-01'
GROUP BY
    product_category
ORDER BY
    total_sales DESC;
```

## External Tables vs Native Tables: Performance Comparison

External tables are significantly slower than native BigQuery tables. Here is a rough comparison:

| Aspect | Native Table | External Table |
|--------|-------------|----------------|
| Query latency | Fast (seconds) | Slower (depends on file count/size) |
| Column pruning | Yes | Yes (Parquet/ORC only) |
| Partition pruning | Yes | Yes (Hive-partitioned) |
| Caching | Yes | Limited |
| Cost model | Per bytes scanned | Per bytes scanned + Cloud Storage reads |
| Streaming inserts | Yes | No |

For frequently queried data, consider loading it into native tables. For occasional analysis, external tables work fine.

## BigLake Tables: The Upgraded External Table

BigLake tables are the next evolution of external tables. They add features like fine-grained access control, row-level security, and better metadata caching.

```sql
-- Create a BigLake table
CREATE EXTERNAL TABLE `my-project-id.analytics.biglake_orders`
WITH CONNECTION `my-project-id.us.my-connection`
OPTIONS (
    format = 'PARQUET',
    uris = ['gs://my-data-bucket/orders/*.parquet']
);
```

BigLake requires a Cloud Resource connection:

```bash
# Create a Cloud Resource connection for BigLake
bq mk --connection \
    --connection_type=CLOUD_RESOURCE \
    --location=US \
    --project_id=my-project-id \
    my-connection
```

## Terraform Configuration

```hcl
# External table over Parquet files
resource "google_bigquery_table" "external_orders" {
  dataset_id = google_bigquery_dataset.analytics.dataset_id
  table_id   = "external_orders"

  external_data_configuration {
    autodetect    = true
    source_format = "PARQUET"

    source_uris = [
      "gs://my-data-bucket/orders/*.parquet",
    ]

    # Hive partitioning configuration
    hive_partitioning_options {
      mode                     = "AUTO"
      source_uri_prefix        = "gs://my-data-bucket/orders/"
      require_partition_filter  = true
    }
  }
}

# External table over CSV files with explicit schema
resource "google_bigquery_table" "external_logs" {
  dataset_id = google_bigquery_dataset.analytics.dataset_id
  table_id   = "external_logs"

  external_data_configuration {
    autodetect    = false
    source_format = "CSV"

    source_uris = [
      "gs://my-logs-bucket/app-logs/*.csv",
    ]

    csv_options {
      skip_leading_rows = 1
      quote             = "\""
      field_delimiter   = ","
    }
  }

  schema = jsonencode([
    { name = "timestamp", type = "TIMESTAMP" },
    { name = "level", type = "STRING" },
    { name = "service", type = "STRING" },
    { name = "message", type = "STRING" },
  ])
}
```

## Updating External Table Source URIs

If your source files change location or you need to add new files:

```sql
-- Update the source URIs of an external table
ALTER TABLE `my-project-id.analytics.external_orders`
SET OPTIONS (
    uris = ['gs://my-data-bucket/orders/2026-*.parquet']
);
```

## Permissions Required

To create and query external tables, you need:

- `bigquery.tables.create` on the dataset (to create the external table definition)
- `storage.objects.get` on the Cloud Storage bucket (to read the files)

If using a service account for BigQuery, make sure it has Cloud Storage read access:

```bash
# Grant BigQuery service account read access to the storage bucket
gsutil iam ch \
    serviceAccount:bq-PROJECT_NUMBER@bigquery-encryption.iam.gserviceaccount.com:objectViewer \
    gs://my-data-bucket
```

## Common Issues

**Schema detection failures with CSV**: CSV files do not carry schema information. Use explicit schemas or ensure the first row contains headers and use `skipLeadingRows`.

**"Not found: Table" after creating**: Make sure the Cloud Storage URIs are accessible and the files exist. Check bucket permissions.

**Slow query performance**: External tables are inherently slower. For better performance, use Parquet format, enable Hive partitioning, and minimize the number of files BigQuery needs to read.

**Wildcard URI matching too many files**: Each file BigQuery needs to open adds latency. If your URI matches thousands of small files, consider merging them into larger files or loading into a native table.

## Summary

External tables let you query Cloud Storage data with SQL without loading it into BigQuery. Use Parquet for the best performance, Hive partitioning for large datasets, and require partition filters to prevent runaway scans. They work well for data lake analytics, ad-hoc analysis, and cases where you do not want to duplicate data. For frequently queried data, native BigQuery tables are still faster and cheaper per query, but external tables give you flexibility to query data wherever it lives.
