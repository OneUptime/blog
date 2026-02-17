# How to Migrate Azure Synapse Analytics to Google BigQuery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Azure Migration, Data Warehouse, Analytics, SQL

Description: A detailed guide on migrating your data warehouse from Azure Synapse Analytics to Google BigQuery including schema, data, and query migration.

---

Azure Synapse Analytics and Google BigQuery are both cloud-native data warehouses built for analytical workloads, but their architectures are quite different. Synapse uses a traditional MPP (Massively Parallel Processing) architecture with provisioned compute resources. BigQuery uses a serverless architecture where you pay for queries and storage separately. This guide walks through the migration process from planning to execution.

## Architecture Differences That Matter

Understanding the architectural differences helps you avoid pitfalls during migration:

**Compute model**: Synapse requires you to provision DWUs (Data Warehouse Units) or use serverless SQL pools. BigQuery is fully serverless - you submit queries and Google handles the compute. No clusters to manage, no scaling decisions.

**Storage**: Synapse uses columnar storage in a proprietary format on Azure Storage. BigQuery stores data in Capacitor, Google's columnar format, distributed across Colossus.

**Table distribution**: Synapse lets you choose hash-distributed, round-robin, or replicated tables. BigQuery has no equivalent concept - it handles data distribution automatically. You can influence performance through partitioning and clustering.

**Indexing**: Synapse supports clustered columnstore indexes and heap tables. BigQuery has no indexes but uses partitioning and clustering to optimize query performance.

## Step 1: Schema Migration

Start with converting your Synapse table definitions to BigQuery. The SQL dialects are different, so you cannot just copy DDL statements.

Here is a comparison of common data type mappings:

| Synapse | BigQuery |
|---------|----------|
| INT, BIGINT | INT64 |
| FLOAT, REAL | FLOAT64 |
| DECIMAL(p,s), NUMERIC(p,s) | NUMERIC or BIGNUMERIC |
| VARCHAR(n), NVARCHAR(n) | STRING |
| DATE | DATE |
| DATETIME, DATETIME2 | DATETIME or TIMESTAMP |
| BIT | BOOL |
| VARBINARY | BYTES |
| UNIQUEIDENTIFIER | STRING |

Here is an example schema conversion. The Synapse table:

```sql
-- Original Synapse table definition
CREATE TABLE dbo.sales_fact (
    sale_id BIGINT NOT NULL,
    customer_id INT NOT NULL,
    product_id INT NOT NULL,
    sale_date DATE NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    region NVARCHAR(50),
    created_at DATETIME2 DEFAULT GETDATE()
)
WITH (
    DISTRIBUTION = HASH(customer_id),
    CLUSTERED COLUMNSTORE INDEX,
    PARTITION (sale_date RANGE RIGHT FOR VALUES
        ('2024-01-01', '2025-01-01', '2026-01-01'))
);
```

Becomes this BigQuery table:

```sql
-- Equivalent BigQuery table definition
-- Using partitioning on sale_date and clustering on customer_id for performance
CREATE TABLE my_dataset.sales_fact (
    sale_id INT64 NOT NULL,
    customer_id INT64 NOT NULL,
    product_id INT64 NOT NULL,
    sale_date DATE NOT NULL,
    quantity INT64 NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    region STRING,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY sale_date
CLUSTER BY customer_id, region
OPTIONS (
    description = 'Sales fact table migrated from Synapse',
    require_partition_filter = true
);
```

Notice that Synapse's hash distribution on `customer_id` is replaced by clustering, and the explicit partition ranges become automatic date partitioning.

## Step 2: Data Migration

There are several approaches for moving the actual data.

### Option A: Export to Cloud Storage, Load into BigQuery

This is the most common approach for large datasets. Export from Synapse to Parquet files, transfer them to Cloud Storage, then load into BigQuery.

```bash
# In Synapse, use CETAS (CREATE EXTERNAL TABLE AS SELECT) to export to Parquet
# Run this in Synapse SQL:
# CREATE EXTERNAL TABLE export_sales
# WITH (
#     LOCATION = 'export/sales/',
#     DATA_SOURCE = AzureBlobStorage,
#     FILE_FORMAT = ParquetFormat
# )
# AS SELECT * FROM dbo.sales_fact;

# Transfer the Parquet files from Azure Blob to GCS using gsutil
gsutil -m cp -r \
    "https://mystorageaccount.blob.core.windows.net/export/sales/*" \
    gs://my-migration-bucket/sales/

# Load the Parquet files into BigQuery
bq load \
    --source_format=PARQUET \
    --autodetect \
    my_dataset.sales_fact \
    "gs://my-migration-bucket/sales/*.parquet"
```

For very large datasets, use the BigQuery Data Transfer Service or the Storage Transfer Service:

```bash
# Create a transfer job from Azure Blob Storage to GCS
gcloud transfer jobs create \
    --source-agent-pool="" \
    --source-creds-file=azure-creds.json \
    azure://mystorageaccount/export/sales/ \
    gs://my-migration-bucket/sales/
```

### Option B: Use BigQuery Data Transfer Service

BigQuery has a built-in transfer service that can pull data from various sources:

```bash
# Create a scheduled transfer from Cloud Storage to BigQuery
bq mk --transfer_config \
    --project_id=my-project \
    --data_source=google_cloud_storage \
    --display_name="Synapse Migration - Sales" \
    --target_dataset=my_dataset \
    --params='{
        "destination_table_name_template": "sales_fact",
        "data_path_template": "gs://my-migration-bucket/sales/*.parquet",
        "file_format": "PARQUET",
        "write_disposition": "WRITE_TRUNCATE"
    }'
```

## Step 3: Query Migration

Synapse uses T-SQL while BigQuery uses GoogleSQL (formerly Standard SQL). Most basic queries work with minor changes, but there are differences in functions and syntax.

### Common Function Replacements

```sql
-- Date functions
-- Synapse: GETDATE()
-- BigQuery: CURRENT_TIMESTAMP()

-- Synapse: DATEADD(day, 7, sale_date)
-- BigQuery: DATE_ADD(sale_date, INTERVAL 7 DAY)

-- Synapse: DATEDIFF(day, start_date, end_date)
-- BigQuery: DATE_DIFF(end_date, start_date, DAY)

-- String functions
-- Synapse: ISNULL(column, 'default')
-- BigQuery: IFNULL(column, 'default') or COALESCE(column, 'default')

-- Synapse: LEN(column)
-- BigQuery: LENGTH(column)

-- Synapse: CHARINDEX('sub', column)
-- BigQuery: STRPOS(column, 'sub')

-- Type casting
-- Synapse: CAST(column AS VARCHAR(50))
-- BigQuery: CAST(column AS STRING)

-- Synapse: CONVERT(DATE, column, 112)
-- BigQuery: PARSE_DATE('%Y%m%d', column)
```

### Window Functions

Most window functions work the same way, but some syntax differs:

```sql
-- Synapse query with window functions
SELECT
    customer_id,
    sale_date,
    total_amount,
    SUM(total_amount) OVER (
        PARTITION BY customer_id
        ORDER BY sale_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) as running_total,
    ROW_NUMBER() OVER (
        PARTITION BY customer_id
        ORDER BY total_amount DESC
    ) as rank_by_amount
FROM dbo.sales_fact;

-- BigQuery equivalent - almost identical, just table reference changes
SELECT
    customer_id,
    sale_date,
    total_amount,
    SUM(total_amount) OVER (
        PARTITION BY customer_id
        ORDER BY sale_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) as running_total,
    ROW_NUMBER() OVER (
        PARTITION BY customer_id
        ORDER BY total_amount DESC
    ) as rank_by_amount
FROM my_dataset.sales_fact;
```

### Temporary Tables and CTEs

Synapse temp tables (#temp) do not exist in BigQuery. Use CTEs or temporary tables with expiration:

```sql
-- Synapse: temporary table
-- SELECT * INTO #temp_results FROM dbo.sales_fact WHERE sale_date > '2025-01-01';

-- BigQuery: use a CTE or a temporary table
-- Option 1: CTE (preferred for most cases)
WITH temp_results AS (
    SELECT * FROM my_dataset.sales_fact
    WHERE sale_date > '2025-01-01'
)
SELECT region, SUM(total_amount)
FROM temp_results
GROUP BY region;

-- Option 2: Create a temporary table (for complex multi-step logic)
CREATE TEMP TABLE temp_results AS
SELECT * FROM my_dataset.sales_fact
WHERE sale_date > '2025-01-01';
```

## Step 4: Migrate Stored Procedures

Synapse stored procedures need to be converted to BigQuery scripting or BigQuery routines:

```sql
-- Synapse stored procedure
-- CREATE PROCEDURE dbo.usp_DailySalesReport @report_date DATE
-- AS
-- BEGIN
--     SELECT region, SUM(total_amount) as daily_total
--     FROM dbo.sales_fact
--     WHERE sale_date = @report_date
--     GROUP BY region
--     ORDER BY daily_total DESC;
-- END;

-- BigQuery equivalent using a stored procedure
CREATE OR REPLACE PROCEDURE my_dataset.daily_sales_report(report_date DATE)
BEGIN
    -- Generate daily sales summary by region
    SELECT region, SUM(total_amount) as daily_total
    FROM my_dataset.sales_fact
    WHERE sale_date = report_date
    GROUP BY region
    ORDER BY daily_total DESC;
END;

-- Call it like this
CALL my_dataset.daily_sales_report('2026-02-01');
```

## Step 5: Migrate Scheduled Jobs

Synapse pipelines that run scheduled queries can be replaced with BigQuery scheduled queries:

```bash
# Create a scheduled query in BigQuery
bq query --use_legacy_sql=false \
    --schedule="every 24 hours" \
    --display_name="Daily sales aggregation" \
    --destination_table=my_dataset.daily_summary \
    --replace=true \
    'SELECT DATE(sale_date) as day, region, SUM(total_amount) as total
     FROM my_dataset.sales_fact
     WHERE sale_date = CURRENT_DATE() - 1
     GROUP BY day, region'
```

## Performance Tuning for BigQuery

After migration, optimize your BigQuery setup:

1. **Partitioning** - Partition large tables by date or integer range. This replaces Synapse's partition schemes.

2. **Clustering** - Cluster tables by frequently filtered columns. This replaces Synapse's hash distribution to some degree.

3. **Materialized views** - Create materialized views for common aggregations, similar to Synapse indexed views.

4. **BI Engine** - Enable BigQuery BI Engine for sub-second query response on dashboards.

```sql
-- Create a materialized view for common dashboard queries
CREATE MATERIALIZED VIEW my_dataset.sales_by_region_daily
AS
SELECT
    sale_date,
    region,
    COUNT(*) as transaction_count,
    SUM(total_amount) as total_revenue,
    AVG(total_amount) as avg_order_value
FROM my_dataset.sales_fact
GROUP BY sale_date, region;
```

## Conclusion

Migrating from Synapse to BigQuery is mainly a schema translation, data transfer, and query rewriting exercise. The biggest conceptual shift is moving from provisioned compute (DWUs) to serverless. You stop thinking about cluster sizing and scaling, and instead focus on writing efficient queries and organizing your data with partitioning and clustering. For most teams, the reduction in operational overhead makes the migration effort worthwhile.
