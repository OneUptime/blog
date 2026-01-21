# How to Migrate from BigQuery to ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, BigQuery, Migration, Data Warehouse, Google Cloud, Cost Savings

Description: A comprehensive guide to migrating from Google BigQuery to ClickHouse, covering schema conversion, data export strategies, query translation, and cost optimization benefits.

---

Migrating from BigQuery to ClickHouse can provide significant cost savings and improved query performance for many analytical workloads. This guide covers the complete migration process, from planning to execution.

## Why Migrate from BigQuery to ClickHouse?

### Cost Comparison

| Cost Factor | BigQuery | ClickHouse (Self-Hosted) |
|-------------|----------|--------------------------|
| Storage (1 TB/mo) | $20 | $5-10 |
| Query (1 TB scanned) | $5 | $0 (compute only) |
| Streaming inserts | $0.01/200 MB | $0 |
| Monthly estimate (10 TB, heavy queries) | $2,000-5,000 | $500-1,000 |

### Performance Benefits

- Faster aggregation queries
- Better compression (10-40x vs 2-5x)
- No query slot limits
- Predictable performance

## Pre-Migration Planning

### Assess Your Workload

```sql
-- BigQuery: Analyze your query patterns
SELECT
  user_email,
  query,
  total_bytes_processed,
  total_slot_ms,
  creation_time
FROM `region-us`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
WHERE creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
  AND job_type = 'QUERY'
ORDER BY total_bytes_processed DESC
LIMIT 100;

-- Identify most accessed tables
SELECT
  referenced_tables.project_id,
  referenced_tables.dataset_id,
  referenced_tables.table_id,
  COUNT(*) as query_count,
  SUM(total_bytes_processed) as total_bytes
FROM `region-us`.INFORMATION_SCHEMA.JOBS_BY_PROJECT,
  UNNEST(referenced_tables) as referenced_tables
WHERE creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY 1, 2, 3
ORDER BY total_bytes DESC
LIMIT 50;
```

### Schema Mapping

| BigQuery Type | ClickHouse Type |
|---------------|-----------------|
| STRING | String |
| INT64 | Int64 |
| FLOAT64 | Float64 |
| NUMERIC | Decimal128(38, 9) |
| BOOL | UInt8 |
| BYTES | String |
| DATE | Date |
| DATETIME | DateTime |
| TIMESTAMP | DateTime64(6) |
| TIME | String (or custom) |
| ARRAY<T> | Array(T) |
| STRUCT | Tuple or Nested |
| JSON | String or Map |
| GEOGRAPHY | Tuple(Float64, Float64) |

## Schema Conversion

### BigQuery Schema

```sql
-- BigQuery table
CREATE TABLE `project.dataset.events` (
  event_id STRING,
  event_timestamp TIMESTAMP,
  user_id INT64,
  event_name STRING,
  properties STRUCT<
    page_url STRING,
    referrer STRING,
    device_type STRING
  >,
  geo STRUCT<
    country STRING,
    region STRING,
    city STRING
  >,
  items ARRAY<STRUCT<
    item_id STRING,
    quantity INT64,
    price FLOAT64
  >>
)
PARTITION BY DATE(event_timestamp)
CLUSTER BY user_id, event_name;
```

### ClickHouse Equivalent

```sql
-- ClickHouse table
CREATE TABLE events (
    event_id String,
    event_timestamp DateTime64(6),
    event_date Date MATERIALIZED toDate(event_timestamp),
    user_id Int64,
    event_name LowCardinality(String),
    -- Flatten STRUCT or use Tuple
    page_url String,
    referrer String,
    device_type LowCardinality(String),
    -- Geo as separate columns
    country LowCardinality(String),
    region String,
    city String,
    -- Array of Tuples for items
    items Array(Tuple(
        item_id String,
        quantity Int64,
        price Float64
    ))
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_timestamp)
ORDER BY (user_id, event_name, event_timestamp)
SETTINGS index_granularity = 8192;
```

### Converting STRUCT to Flattened Columns

```sql
-- BigQuery nested STRUCT query
SELECT
  user_id,
  properties.page_url,
  geo.country
FROM `project.dataset.events`
WHERE geo.country = 'US';

-- ClickHouse flattened equivalent
SELECT
  user_id,
  page_url,
  country
FROM events
WHERE country = 'US';
```

## Data Export from BigQuery

### Export to GCS (Google Cloud Storage)

```sql
-- Export table to GCS as Parquet
EXPORT DATA OPTIONS(
  uri='gs://bucket/exports/events/*.parquet',
  format='PARQUET',
  overwrite=true,
  compression='SNAPPY'
) AS
SELECT * FROM `project.dataset.events`
WHERE DATE(event_timestamp) >= '2024-01-01';

-- For large tables, export in date partitions
EXPORT DATA OPTIONS(
  uri='gs://bucket/exports/events/dt=2024-01-15/*.parquet',
  format='PARQUET'
) AS
SELECT * FROM `project.dataset.events`
WHERE DATE(event_timestamp) = '2024-01-15';
```

### Export with bq CLI

```bash
# Export to GCS
bq extract \
  --destination_format PARQUET \
  --compression SNAPPY \
  'project:dataset.events' \
  'gs://bucket/exports/events/*.parquet'

# For sharded export (large tables)
bq extract \
  --destination_format PARQUET \
  'project:dataset.events' \
  'gs://bucket/exports/events/part-*.parquet'
```

## Data Import to ClickHouse

### From S3/GCS

```sql
-- Import from GCS (using S3 compatibility)
INSERT INTO events
SELECT
    event_id,
    event_timestamp,
    user_id,
    event_name,
    properties.page_url AS page_url,
    properties.referrer AS referrer,
    properties.device_type AS device_type,
    geo.country AS country,
    geo.region AS region,
    geo.city AS city,
    items
FROM s3(
    'https://storage.googleapis.com/bucket/exports/events/*.parquet',
    'HMAC_KEY', 'HMAC_SECRET',
    'Parquet'
);

-- With parallel import for large datasets
INSERT INTO events
SELECT * FROM s3Cluster(
    'default',
    'https://storage.googleapis.com/bucket/exports/events/*.parquet',
    'HMAC_KEY', 'HMAC_SECRET',
    'Parquet'
)
SETTINGS parallel_distributed_insert_select = 1;
```

### Using clickhouse-local for Transformation

```bash
# Transform and load locally
clickhouse-local --query "
    SELECT
        event_id,
        event_timestamp,
        user_id,
        event_name,
        tupleElement(properties, 'page_url') AS page_url,
        tupleElement(geo, 'country') AS country
    FROM file('events.parquet', Parquet)
" --format Native | \
clickhouse-client --query "INSERT INTO events FORMAT Native"
```

## Query Translation

### Aggregations

```sql
-- BigQuery
SELECT
  DATE(event_timestamp) as date,
  event_name,
  COUNT(*) as events,
  COUNT(DISTINCT user_id) as unique_users,
  APPROX_QUANTILES(value, 100)[OFFSET(95)] as p95_value
FROM `project.dataset.events`
WHERE event_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY date, event_name
ORDER BY date DESC;

-- ClickHouse
SELECT
  toDate(event_timestamp) as date,
  event_name,
  count() as events,
  uniqExact(user_id) as unique_users,
  quantile(0.95)(value) as p95_value
FROM events
WHERE event_timestamp >= now() - INTERVAL 7 DAY
GROUP BY date, event_name
ORDER BY date DESC;
```

### Window Functions

```sql
-- BigQuery
SELECT
  user_id,
  event_timestamp,
  event_name,
  ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY event_timestamp) as event_num,
  LAG(event_timestamp) OVER (PARTITION BY user_id ORDER BY event_timestamp) as prev_event
FROM `project.dataset.events`;

-- ClickHouse
SELECT
  user_id,
  event_timestamp,
  event_name,
  row_number() OVER (PARTITION BY user_id ORDER BY event_timestamp) as event_num,
  lagInFrame(event_timestamp, 1) OVER (PARTITION BY user_id ORDER BY event_timestamp) as prev_event
FROM events;
```

### Array Functions

```sql
-- BigQuery: UNNEST arrays
SELECT
  event_id,
  item.item_id,
  item.quantity,
  item.price
FROM `project.dataset.events`,
  UNNEST(items) as item
WHERE item.quantity > 1;

-- ClickHouse: ARRAY JOIN
SELECT
  event_id,
  item.1 as item_id,
  item.2 as quantity,
  item.3 as price
FROM events
ARRAY JOIN items as item
WHERE item.2 > 1;

-- Or with arrayJoin function
SELECT
  event_id,
  arrayJoin(items) as item
FROM events;
```

### JSON Functions

```sql
-- BigQuery: JSON extraction
SELECT
  JSON_VALUE(json_column, '$.user.name') as user_name,
  JSON_QUERY(json_column, '$.items') as items
FROM `project.dataset.raw_events`;

-- ClickHouse: JSON extraction
SELECT
  JSONExtractString(json_column, 'user', 'name') as user_name,
  JSONExtract(json_column, 'items', 'Array(String)') as items
FROM raw_events;

-- Or with JSONPath
SELECT
  JSON_VALUE(json_column, '$.user.name') as user_name  -- ClickHouse also supports this
FROM raw_events;
```

### Date/Time Functions

| BigQuery | ClickHouse |
|----------|------------|
| CURRENT_TIMESTAMP() | now() |
| DATE(timestamp) | toDate(timestamp) |
| TIMESTAMP_TRUNC(ts, HOUR) | toStartOfHour(ts) |
| DATE_ADD(date, INTERVAL 1 DAY) | date + INTERVAL 1 DAY |
| TIMESTAMP_DIFF(ts1, ts2, SECOND) | dateDiff('second', ts2, ts1) |
| FORMAT_TIMESTAMP('%Y-%m-%d', ts) | formatDateTime(ts, '%Y-%m-%d') |
| PARSE_TIMESTAMP('%Y-%m-%d', str) | parseDateTimeBestEffort(str) |

## Handling BigQuery-Specific Features

### Partitioning

```sql
-- BigQuery: Partition by DATE column
CREATE TABLE events
PARTITION BY DATE(event_timestamp)
AS SELECT ...;

-- ClickHouse: Partition by expression
CREATE TABLE events (...)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_timestamp)  -- Monthly partitions
ORDER BY (...);
```

### Clustering (Sorting)

```sql
-- BigQuery: Clustering
CREATE TABLE events
PARTITION BY DATE(event_timestamp)
CLUSTER BY user_id, event_name
AS SELECT ...;

-- ClickHouse: ORDER BY provides similar optimization
CREATE TABLE events (...)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_timestamp)
ORDER BY (user_id, event_name, event_timestamp);  -- Similar to clustering
```

### Materialized Views

```sql
-- BigQuery: Materialized view
CREATE MATERIALIZED VIEW `project.dataset.daily_stats`
AS SELECT
  DATE(event_timestamp) as date,
  event_name,
  COUNT(*) as event_count
FROM `project.dataset.events`
GROUP BY date, event_name;

-- ClickHouse: Materialized view
CREATE MATERIALIZED VIEW daily_stats_mv
ENGINE = SummingMergeTree()
ORDER BY (date, event_name)
AS SELECT
  toDate(event_timestamp) as date,
  event_name,
  count() as event_count
FROM events
GROUP BY date, event_name;
```

## Migration Script Example

```python
#!/usr/bin/env python3
"""BigQuery to ClickHouse Migration Script"""

from google.cloud import bigquery
from google.cloud import storage
import clickhouse_driver
import json

class BQToClickHouseMigrator:
    def __init__(self, bq_project, ch_host):
        self.bq_client = bigquery.Client(project=bq_project)
        self.gcs_client = storage.Client()
        self.ch_client = clickhouse_driver.Client(ch_host)

    def export_table_to_gcs(self, dataset, table, bucket, prefix):
        """Export BigQuery table to GCS as Parquet"""
        destination_uri = f"gs://{bucket}/{prefix}/*.parquet"

        job_config = bigquery.ExtractJobConfig(
            destination_format=bigquery.DestinationFormat.PARQUET,
            compression=bigquery.Compression.SNAPPY
        )

        table_ref = f"{self.bq_client.project}.{dataset}.{table}"
        extract_job = self.bq_client.extract_table(
            table_ref,
            destination_uri,
            job_config=job_config
        )
        extract_job.result()  # Wait for completion
        print(f"Exported {table_ref} to {destination_uri}")

    def import_to_clickhouse(self, bucket, prefix, ch_table):
        """Import from GCS to ClickHouse"""
        gcs_url = f"https://storage.googleapis.com/{bucket}/{prefix}/*.parquet"

        query = f"""
            INSERT INTO {ch_table}
            SELECT * FROM s3(
                '{gcs_url}',
                '{self.gcs_hmac_key}',
                '{self.gcs_hmac_secret}',
                'Parquet'
            )
        """
        self.ch_client.execute(query)
        print(f"Imported to {ch_table}")

    def migrate_table(self, bq_dataset, bq_table, ch_table, gcs_bucket):
        """Full migration workflow"""
        prefix = f"migration/{bq_dataset}/{bq_table}"

        # Export from BigQuery
        self.export_table_to_gcs(bq_dataset, bq_table, gcs_bucket, prefix)

        # Import to ClickHouse
        self.import_to_clickhouse(gcs_bucket, prefix, ch_table)

# Usage
migrator = BQToClickHouseMigrator('my-project', 'clickhouse-host')
migrator.migrate_table('analytics', 'events', 'events', 'migration-bucket')
```

## Validation and Testing

```sql
-- Compare row counts
-- BigQuery
SELECT COUNT(*) FROM `project.dataset.events`;

-- ClickHouse
SELECT count() FROM events;

-- Compare aggregates
-- BigQuery
SELECT
  DATE(event_timestamp) as date,
  COUNT(*) as cnt,
  SUM(value) as total
FROM `project.dataset.events`
GROUP BY date
ORDER BY date;

-- ClickHouse
SELECT
  toDate(event_timestamp) as date,
  count() as cnt,
  sum(value) as total
FROM events
GROUP BY date
ORDER BY date;
```

## Post-Migration Optimization

```sql
-- Optimize table after bulk load
OPTIMIZE TABLE events FINAL;

-- Add projections for common queries
ALTER TABLE events ADD PROJECTION daily_stats (
    SELECT
        toDate(event_timestamp) as date,
        event_name,
        count(),
        uniq(user_id)
    GROUP BY date, event_name
);

-- Materialize the projection
ALTER TABLE events MATERIALIZE PROJECTION daily_stats;
```

## Conclusion

Migrating from BigQuery to ClickHouse involves:

1. **Schema conversion** - Map BigQuery types to ClickHouse equivalents
2. **Data export** - Use Parquet format via GCS
3. **Data import** - Load via S3-compatible interface
4. **Query translation** - Adapt SQL syntax differences
5. **Validation** - Compare row counts and aggregates
6. **Optimization** - Add projections and optimize storage

The result is typically 50-80% cost reduction with equal or better query performance for analytical workloads.
