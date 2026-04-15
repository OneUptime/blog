# How to Migrate from BigQuery to ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, BigQuery, Migration, Database, Analytics, Cloud

Description: Migrate from BigQuery to ClickHouse by exporting datasets to GCS, mapping data types, loading with clickhouse-client, and rewriting BigQuery SQL for ClickHouse syntax.

---

BigQuery is a fully managed serverless data warehouse with per-query billing. As query volumes grow, costs scale quickly. ClickHouse on your own infrastructure delivers comparable analytical performance at a fraction of the cost with predictable pricing. This guide walks through a complete migration from BigQuery to ClickHouse.

## Cost and Performance Comparison

BigQuery charges $5 per TB of data scanned. A single dashboard that runs 50 queries per day over a 1 TB table can cost thousands of dollars per month. ClickHouse on a dedicated server or Kubernetes cluster has a fixed infrastructure cost and scans data 5-20x faster than BigQuery for many workload types.

Use cases that migrate well to ClickHouse:
- Event analytics and user behavior analysis
- Log aggregation and analysis
- Time-series metrics storage
- Internal dashboards and reporting

Use cases where BigQuery retains advantages:
- Ad hoc queries by non-technical users who need serverless elasticity
- Infrequent queries over petabyte-scale data with no upfront infrastructure

## Data Type Mapping

| BigQuery | ClickHouse |
|---------|------------|
| INT64 | Int64 |
| FLOAT64 | Float64 |
| NUMERIC | Decimal(38, 9) |
| BIGNUMERIC | Decimal(76, 38) |
| BOOL | Bool |
| STRING | String |
| BYTES | String |
| DATE | Date |
| DATETIME | DateTime |
| TIMESTAMP | DateTime64(6) |
| TIME | String (store as HH:MM:SS) |
| ARRAY | Array(T) |
| STRUCT / RECORD | Tuple or flattened columns |
| JSON | String (use JSONExtract) |
| GEOGRAPHY | String |

## Step 1: Export BigQuery Dataset to Google Cloud Storage

Export to GCS using the BigQuery console or `bq` CLI:

```bash
bq extract \
  --destination_format CSV \
  --field_delimiter ',' \
  --print_header=true \
  myproject:analytics.events \
  gs://my-export-bucket/events/events_*.csv
```

For large tables, export as Parquet for better compression:

```bash
bq extract \
  --destination_format PARQUET \
  --compression SNAPPY \
  myproject:analytics.events \
  gs://my-export-bucket/events/events_*.parquet
```

## Step 2: Download Files from GCS

```bash
gsutil -m cp "gs://my-export-bucket/events/events_*.csv" /tmp/bq_export/
```

## Step 3: Design the ClickHouse Schema

Given this BigQuery table:

```sql
-- BigQuery DDL
CREATE TABLE analytics.events (
    event_id    STRING,
    user_id     INT64,
    session_id  STRING,
    event_type  STRING,
    page        STRING,
    amount      NUMERIC,
    properties  JSON,
    created_at  TIMESTAMP
);
```

Create the ClickHouse equivalent:

```sql
CREATE TABLE events
(
    event_id    String,
    user_id     Int64,
    session_id  String,
    event_type  LowCardinality(String),
    page        String,
    amount      Decimal(38, 9)           DEFAULT 0,
    properties  String                   DEFAULT '{}',
    created_at  DateTime64(6)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (event_type, user_id, created_at);
```

## Step 4: Load CSV Files into ClickHouse

```bash
for file in /tmp/bq_export/events_*.csv; do
  echo "Loading $file..."
  clickhouse-client \
    --database analytics \
    --query "INSERT INTO events FORMAT CSVWithNames" \
    < "$file"
done
```

Load Parquet files (ClickHouse supports Parquet natively):

```bash
for file in /tmp/bq_export/events_*.parquet; do
  clickhouse-client \
    --database analytics \
    --query "INSERT INTO events SELECT * FROM file('$file', 'Parquet')"
done
```

## Step 5: Load Directly from GCS

ClickHouse can read from GCS using the `gcs()` table function:

```sql
INSERT INTO events
SELECT
    event_id,
    user_id,
    session_id,
    event_type,
    page,
    amount,
    properties,
    created_at
FROM gcs(
    'https://storage.googleapis.com/my-export-bucket/events/events_*.csv',
    'YOUR_HMAC_KEY',
    'YOUR_HMAC_SECRET',
    'CSVWithNames'
);
```

Or from GCS Parquet files:

```sql
INSERT INTO events
SELECT *
FROM gcs(
    'https://storage.googleapis.com/my-export-bucket/events/events_*.parquet',
    'YOUR_HMAC_KEY',
    'YOUR_HMAC_SECRET',
    'Parquet'
);
```

## Step 6: Rewrite BigQuery SQL for ClickHouse

Most standard SQL works in both BigQuery and ClickHouse. Here are the key differences:

```sql
-- BigQuery: COUNTIF
SELECT COUNTIF(event_type = 'purchase') FROM events;

-- ClickHouse: countIf
SELECT countIf(event_type = 'purchase') FROM events;
```

```sql
-- BigQuery: DATE_TRUNC
SELECT DATE_TRUNC(created_at, HOUR) AS hour, COUNT(*) FROM events GROUP BY 1;

-- ClickHouse: toStartOfHour
SELECT toStartOfHour(created_at) AS hour, count() FROM events GROUP BY hour;
```

```sql
-- BigQuery: APPROX_COUNT_DISTINCT
SELECT APPROX_COUNT_DISTINCT(user_id) FROM events;

-- ClickHouse: uniq (HyperLogLog based, similar accuracy)
SELECT uniq(user_id) FROM events;
```

```sql
-- BigQuery: STRING_AGG
SELECT STRING_AGG(event_type, ',' ORDER BY created_at) FROM events GROUP BY user_id;

-- ClickHouse: groupArray with ORDER BY (v22.8+)
SELECT arrayStringConcat(groupArray(event_type ORDER BY created_at), ',')
FROM events
GROUP BY user_id;
```

```sql
-- BigQuery: STRUCT access
SELECT properties.device FROM events;

-- ClickHouse: JSONExtractString
SELECT JSONExtractString(properties, 'device') FROM events;
```

```sql
-- BigQuery: ARRAY_AGG
SELECT ARRAY_AGG(DISTINCT event_type) FROM events GROUP BY user_id;

-- ClickHouse: groupUniqArray
SELECT groupUniqArray(event_type) FROM events GROUP BY user_id;
```

```sql
-- BigQuery: TIMESTAMP_DIFF
SELECT TIMESTAMP_DIFF(end_time, start_time, SECOND) FROM sessions;

-- ClickHouse: dateDiff
SELECT dateDiff('second', start_time, end_time) FROM sessions;
```

## Step 7: Validate Migration

Run matching aggregate queries in both systems:

```sql
-- BigQuery
SELECT
  COUNT(*) AS total,
  COUNT(DISTINCT user_id) AS unique_users,
  SUM(amount) AS revenue,
  MIN(created_at) AS earliest,
  MAX(created_at) AS latest
FROM analytics.events;
```

```sql
-- ClickHouse
SELECT
  count()           AS total,
  uniqExact(user_id) AS unique_users,
  sum(amount)        AS revenue,
  min(created_at)    AS earliest,
  max(created_at)    AS latest
FROM events;
```

Note: `uniq()` is an approximation. Use `uniqExact()` for exact match validation, then switch to `uniq()` in production queries for performance.

## Step 8: Set Up Ongoing Sync

To avoid billing for BigQuery while transitioning, set up a Pub/Sub-based pipeline that writes new events to ClickHouse in real time. Alternatively, schedule nightly exports from BigQuery to GCS and load them into ClickHouse with a cron job:

```bash
#!/bin/bash
# sync_bq_to_clickhouse.sh
DATE=$(date -d "yesterday" +%Y-%m-%d)

bq extract \
  --destination_format CSV \
  --print_header=true \
  "myproject:analytics.events\$${DATE//-/}" \
  "gs://my-export-bucket/events/events_${DATE}.csv"

gsutil cp "gs://my-export-bucket/events/events_${DATE}.csv" /tmp/

clickhouse-client \
  --database analytics \
  --query "INSERT INTO events FORMAT CSVWithNames" \
  < "/tmp/events_${DATE}.csv"

rm "/tmp/events_${DATE}.csv"
echo "Sync complete for ${DATE}"
```

## Summary

Migrating from BigQuery to ClickHouse reduces costs by replacing per-query billing with fixed infrastructure costs and delivers faster query performance for high-frequency analytical workloads. Export data to GCS as CSV or Parquet, load into ClickHouse with the `gcs()` table function or `clickhouse-client`, rewrite BigQuery-specific functions to their ClickHouse equivalents, and validate with matching aggregate queries across both systems before switching traffic.
