# How to Write dbt Models That Leverage BigQuery Partitioning and Clustering

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, dbt, Partitioning, Clustering, Query Optimization

Description: Learn how to configure dbt models to create partitioned and clustered BigQuery tables for dramatically better query performance and lower costs.

---

If you are running dbt against BigQuery and not using partitioning and clustering, you are probably scanning more data than you need to and paying for it. BigQuery charges by the amount of data scanned, and partitioning plus clustering are the primary mechanisms for reducing that scan size. The good news is that dbt makes it easy to configure both through model-level settings.

## Why Partitioning and Clustering Matter

A quick refresher on what these do.

Partitioning divides a table into segments based on a column value, typically a date or timestamp. When you query with a WHERE clause on the partition column, BigQuery only scans the relevant partitions instead of the entire table. A table with 3 years of daily data has roughly 1,095 partitions - querying a single day scans 1/1,095th of the data.

Clustering sorts data within each partition by up to four columns. When you filter or aggregate on clustered columns, BigQuery can skip blocks of data that do not match your filter. This reduces the amount of data scanned even further within a partition.

Together, they can reduce query costs by 90% or more on large tables.

## Configuring Partitioning in dbt

dbt's BigQuery adapter supports partition configuration through the `config` block in your model file or in `dbt_project.yml`.

### Date/Timestamp Partitioning

The most common partition type. Here is a model partitioned by order date:

```sql
-- models/marts/fct_orders.sql
-- Fact table partitioned by order_date for efficient date-range queries
-- Queries filtering on order_date only scan relevant partitions

{{
  config(
    materialized='table',
    partition_by={
      "field": "order_date",
      "data_type": "date",
      "granularity": "day"
    }
  )
}}

SELECT
    order_id,
    customer_id,
    order_date,
    status,
    total_amount,
    shipping_cost,
    tax_amount,
    created_at
FROM {{ ref('stg_orders') }}
WHERE status != 'cancelled'
```

The `granularity` option controls the partition size. Your options are `day`, `month`, and `year`:

```sql
-- Monthly partitioning for tables where daily granularity creates too many partitions
{{
  config(
    materialized='table',
    partition_by={
      "field": "event_timestamp",
      "data_type": "timestamp",
      "granularity": "month"
    }
  )
}}

SELECT
    event_id,
    event_type,
    user_id,
    event_timestamp,
    event_properties
FROM {{ ref('stg_events') }}
```

### Integer Range Partitioning

For tables where the natural partition key is numeric rather than a date:

```sql
-- Integer range partitioning for a table partitioned by customer_tier
{{
  config(
    materialized='table',
    partition_by={
      "field": "customer_tier",
      "data_type": "int64",
      "range": {
        "start": 0,
        "end": 100,
        "interval": 10
      }
    }
  )
}}

SELECT
    customer_id,
    customer_tier,
    lifetime_value,
    segment
FROM {{ ref('stg_customer_segments') }}
```

## Configuring Clustering in dbt

Add clustering on top of partitioning by specifying `cluster_by`:

```sql
-- Partitioned by date and clustered by region and category
-- Queries that filter on order_date, region, or category are very efficient
{{
  config(
    materialized='table',
    partition_by={
      "field": "order_date",
      "data_type": "date",
      "granularity": "day"
    },
    cluster_by=["region", "product_category"]
  )
}}

SELECT
    order_id,
    customer_id,
    order_date,
    region,
    product_category,
    total_amount,
    quantity
FROM {{ ref('int_orders_enriched') }}
```

You can specify up to four clustering columns. The order matters - put the most commonly filtered column first:

```sql
-- Cluster by up to 4 columns, ordered by query frequency
-- Most filtered column first, least filtered column last
{{
  config(
    materialized='table',
    partition_by={
      "field": "created_date",
      "data_type": "date"
    },
    cluster_by=["tenant_id", "event_type", "user_id", "status"]
  )
}}

SELECT
    event_id,
    tenant_id,
    event_type,
    user_id,
    status,
    CAST(created_at AS DATE) AS created_date,
    payload
FROM {{ ref('stg_platform_events') }}
```

## Clustering Without Partitioning

You can cluster a table even without partitioning. This still helps with query performance:

```sql
-- Clustered table without partitioning
-- Useful when there is no good partition column but queries filter on specific columns
{{
  config(
    materialized='table',
    cluster_by=["customer_id", "product_id"]
  )
}}

SELECT
    review_id,
    customer_id,
    product_id,
    rating,
    review_text,
    created_at
FROM {{ ref('stg_reviews') }}
```

## Partition Expiration

BigQuery lets you set a partition expiration, which automatically deletes partitions older than a specified number of days. This is useful for tables where old data is not needed:

```sql
-- Auto-delete partitions older than 90 days
-- Keeps the table size manageable without manual cleanup
{{
  config(
    materialized='table',
    partition_by={
      "field": "event_date",
      "data_type": "date"
    },
    partition_expiration_days=90,
    cluster_by=["event_type"]
  )
}}

SELECT
    event_id,
    event_type,
    CAST(event_timestamp AS DATE) AS event_date,
    user_id,
    properties
FROM {{ ref('stg_raw_events') }}
```

## Require Partition Filter

For large tables, you can enforce that all queries must include a partition filter. This prevents accidental full-table scans:

```sql
-- Require a partition filter on all queries against this table
-- Queries without a WHERE clause on event_date will fail
{{
  config(
    materialized='table',
    partition_by={
      "field": "event_date",
      "data_type": "date"
    },
    require_partition_filter=true,
    cluster_by=["user_id", "event_type"]
  )
}}

SELECT
    event_id,
    user_id,
    event_type,
    event_date,
    event_data
FROM {{ ref('stg_analytics_events') }}
```

## Configuring Defaults in dbt_project.yml

Instead of adding config blocks to every model, you can set defaults at the directory level:

```yaml
# dbt_project.yml
# Set default partitioning and clustering for all models in specific directories
models:
  my_analytics:
    staging:
      +materialized: view

    marts:
      +materialized: table
      facts:
        # All fact tables are date-partitioned by default
        +partition_by:
          field: event_date
          data_type: date
          granularity: day
        +cluster_by: ["tenant_id"]
        +require_partition_filter: true

      dimensions:
        # Dimension tables are smaller, just clustered
        +materialized: table
        +cluster_by: ["dimension_key"]
```

Individual models can still override these defaults with their own config blocks.

## Choosing the Right Partition Column

The best partition column has these characteristics: it appears in most query WHERE clauses, it has reasonable cardinality (not too many unique values for date, not too few), and it represents a time dimension that naturally maps to how data is queried.

Common choices:

- Transaction date for order/sales data
- Event timestamp for analytics events
- Ingestion date for data lake tables
- Created/updated date for entity tables

Avoid partitioning on columns with very low cardinality (like a boolean) or very high cardinality (like a UUID).

## Choosing Clustering Columns

Order your clustering columns by how frequently they appear in WHERE clauses and GROUP BY clauses. BigQuery uses the clustering order to organize data blocks, so the first column gets the most benefit.

A good rule of thumb: if a column frequently appears in WHERE, GROUP BY, or JOIN conditions, it is a good clustering candidate. If a column is only ever in SELECT, it will not benefit from clustering.

## Measuring the Impact

After deploying partitioned and clustered models, check how much data your queries scan:

```sql
-- Check the bytes scanned for a query using BigQuery's INFORMATION_SCHEMA
SELECT
  query,
  total_bytes_processed,
  total_bytes_billed,
  cache_hit
FROM `my-gcp-project.region-us`.INFORMATION_SCHEMA.JOBS
WHERE creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 DAY)
  AND statement_type = 'SELECT'
ORDER BY total_bytes_processed DESC
LIMIT 20;
```

Compare the bytes scanned before and after adding partitioning. The reduction is usually dramatic for date-filtered queries.

## Wrapping Up

Partitioning and clustering are not optional optimizations for BigQuery - they are fundamental to cost-effective querying. dbt makes it straightforward to configure both through model config blocks or project-level defaults. Partition by the column most frequently used in date range filters, cluster by the columns most frequently used in WHERE and GROUP BY clauses, and enforce partition filters on large tables to prevent accidental full scans. The effort to add these configurations is minimal, but the impact on query performance and cost is significant.
