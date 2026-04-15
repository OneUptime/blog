# How to Migrate from Redshift to ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Redshift, Migration, Database, Analytics, AWS

Description: Migrate from Amazon Redshift to ClickHouse by unloading data to S3, mapping column-store types, loading with ClickHouse S3 functions, and rewriting Redshift SQL.

---

Amazon Redshift is a cloud-based columnar data warehouse with reserved-instance and serverless pricing. ClickHouse delivers comparable analytical query speeds while running on commodity hardware, Kubernetes, or any cloud infrastructure. This guide covers a practical migration path from Redshift to ClickHouse with data type mapping, export/import procedures, and SQL rewrites.

## Why Migrate from Redshift

Teams migrate from Redshift to ClickHouse for several reasons:

- Redshift costs scale with data volume and compute independently, leading to surprise bills
- Redshift requires manual vacuuming and analyzing for performance maintenance
- ClickHouse query speeds often exceed Redshift's for high-concurrency read workloads
- ClickHouse supports real-time inserts without ETL staging tables
- ClickHouse runs on your own infrastructure or any cloud provider without vendor lock-in

## Data Type Mapping

| Redshift | ClickHouse |
|---------|------------|
| SMALLINT | Int16 |
| INTEGER | Int32 |
| BIGINT | Int64 |
| DECIMAL(p, s) | Decimal(p, s) |
| REAL | Float32 |
| DOUBLE PRECISION | Float64 |
| BOOLEAN | Bool |
| CHAR(n) | FixedString(n) |
| VARCHAR(n) | String |
| TEXT | String |
| DATE | Date |
| TIMESTAMP | DateTime |
| TIMESTAMPTZ | DateTime (normalize to UTC before loading) |
| SUPER | String (JSON) |
| VARBYTE | String |

## Step 1: Inspect Your Redshift Schema

Connect with psql and export the DDL:

```bash
psql -h myredshift.cluster.redshift.amazonaws.com \
     -U admin -d analytics -p 5439
```

```sql
-- List all tables in the schema
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Get column details for a table
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'events'
ORDER BY ordinal_position;
```

## Step 2: Unload Redshift Data to S3

Redshift's `UNLOAD` command is the fastest export method:

```sql
UNLOAD (
    'SELECT
        event_id,
        user_id,
        session_id,
        event_type,
        page,
        amount,
        CONVERT_TIMEZONE(''UTC'', created_at) AS created_at
     FROM events
     WHERE created_at >= ''2024-01-01'''
)
TO 's3://my-migration-bucket/events/events_'
IAM_ROLE 'arn:aws:iam::123456789:role/RedshiftS3Role'
FORMAT AS PARQUET
ALLOWOVERWRITE;
```

For CSV format:

```sql
UNLOAD ('SELECT * FROM events')
TO 's3://my-migration-bucket/events/part_'
IAM_ROLE 'arn:aws:iam::123456789:role/RedshiftS3Role'
FORMAT AS CSV
HEADER
DELIMITER ','
GZIP
ALLOWOVERWRITE;
```

Unload with date partitioning for large tables:

```bash
#!/bin/bash
# unload_by_month.sh
for YEAR in 2023 2024; do
  for MONTH in 01 02 03 04 05 06 07 08 09 10 11 12; do
    psql -h myredshift.cluster... -U admin -d analytics -p 5439 << EOF
    UNLOAD (
        'SELECT * FROM events
         WHERE created_at >= ''${YEAR}-${MONTH}-01''
           AND created_at < dateadd(month, 1, ''${YEAR}-${MONTH}-01'')'
    )
    TO 's3://my-migration-bucket/events/${YEAR}/${MONTH}/part_'
    IAM_ROLE 'arn:aws:iam::123456789:role/RedshiftS3Role'
    FORMAT AS PARQUET ALLOWOVERWRITE;
EOF
  done
done
```

## Step 3: Create ClickHouse Schema

Given a Redshift table:

```sql
-- Redshift schema
CREATE TABLE events (
    event_id    VARCHAR(36)     NOT NULL,
    user_id     BIGINT          NOT NULL,
    session_id  VARCHAR(64)     NOT NULL DEFAULT '',
    event_type  VARCHAR(64)     NOT NULL,
    page        VARCHAR(512),
    amount      DECIMAL(10, 2)  DEFAULT 0.00,
    created_at  TIMESTAMP       NOT NULL
)
DISTSTYLE KEY
DISTKEY (user_id)
SORTKEY (created_at, event_type);
```

ClickHouse equivalent:

```sql
CREATE TABLE events
(
    event_id   String,
    user_id    Int64,
    session_id String,
    event_type LowCardinality(String),
    page       String,
    amount     Decimal(10, 2)  DEFAULT 0,
    created_at DateTime
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (event_type, user_id, created_at);
```

Notes on the translation:
- Redshift `DISTKEY` and `SORTKEY` map to ClickHouse `ORDER BY`
- Redshift `DISTSTYLE` has no equivalent - ClickHouse shards data via `Distributed` tables in a cluster
- No separate `ANALYZE` or `VACUUM` required in ClickHouse

## Step 4: Load from S3 into ClickHouse

Load Parquet files from S3:

```sql
INSERT INTO events
SELECT *
FROM s3(
    'https://my-migration-bucket.s3.amazonaws.com/events/**/*.parquet',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'Parquet'
);
```

Load CSV files from S3:

```sql
INSERT INTO events
SELECT
    event_id,
    user_id,
    session_id,
    event_type,
    page,
    amount,
    created_at
FROM s3(
    'https://my-migration-bucket.s3.amazonaws.com/events/part_*.csv.gz',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'CSVWithNames',
    'event_id String, user_id Int64, session_id String, event_type String,
     page String, amount Decimal(10,2), created_at DateTime'
);
```

Use IAM roles instead of static keys when running ClickHouse on EC2:

```sql
-- On EC2 with an IAM role attached, credentials are auto-fetched
SELECT count() FROM s3(
    'https://my-migration-bucket.s3.amazonaws.com/events/**/*.parquet',
    'Parquet'
);
```

## Step 5: Rewrite Redshift SQL

Redshift is PostgreSQL-based, so most standard SQL works in ClickHouse. Key differences:

```sql
-- Redshift: NVL (alias for COALESCE)
SELECT NVL(page, '/') FROM events;

-- ClickHouse: coalesce or ifNull
SELECT coalesce(page, '/') FROM events;
SELECT ifNull(page, '/') FROM events;
```

```sql
-- Redshift: DATEADD
SELECT DATEADD(day, 7, created_at) FROM events;

-- ClickHouse: addDays
SELECT addDays(created_at, 7) FROM events;
```

```sql
-- Redshift: DATEDIFF
SELECT DATEDIFF(day, start_date, end_date) FROM campaigns;

-- ClickHouse: dateDiff
SELECT dateDiff('day', start_date, end_date) FROM campaigns;
```

```sql
-- Redshift: APPROXIMATE COUNT DISTINCT (HyperLogLog)
SELECT APPROXIMATE COUNT(DISTINCT user_id) FROM events;

-- ClickHouse: uniq (also HyperLogLog-based)
SELECT uniq(user_id) FROM events;
```

```sql
-- Redshift: LISTAGG
SELECT LISTAGG(event_type, ',') WITHIN GROUP (ORDER BY created_at)
FROM events GROUP BY user_id;

-- ClickHouse: arrayStringConcat with groupArray (ordered)
SELECT arrayStringConcat(groupArray(event_type ORDER BY created_at), ',')
FROM events GROUP BY user_id;
```

```sql
-- Redshift: MEDIAN
SELECT MEDIAN(amount) FROM orders;

-- ClickHouse: median or quantile
SELECT median(amount) FROM orders;
SELECT quantile(0.5)(amount) FROM orders;
```

```sql
-- Redshift: window function with ROWS BETWEEN
SELECT
    user_id,
    created_at,
    SUM(amount) OVER (
        PARTITION BY user_id
        ORDER BY created_at
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_total
FROM orders;

-- ClickHouse: same syntax
SELECT
    user_id,
    created_at,
    sum(amount) OVER (
        PARTITION BY user_id
        ORDER BY created_at
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_total
FROM orders;
```

## Step 6: Ongoing Sync with S3

Set up a scheduled job to sync incremental data from Redshift to ClickHouse daily:

```bash
#!/bin/bash
# daily_sync.sh
YESTERDAY=$(date -d "yesterday" +%Y-%m-%d)

# Unload yesterday's events from Redshift
psql -h myredshift.cluster... -U admin -d analytics -p 5439 << EOF
UNLOAD (
    'SELECT * FROM events
     WHERE created_at::date = ''${YESTERDAY}'''
)
TO 's3://my-migration-bucket/incremental/${YESTERDAY}/part_'
IAM_ROLE 'arn:aws:iam::123456789:role/RedshiftS3Role'
FORMAT AS PARQUET ALLOWOVERWRITE;
EOF

# Load into ClickHouse
clickhouse-client --database analytics --query "
INSERT INTO events
SELECT *
FROM s3(
    'https://my-migration-bucket.s3.amazonaws.com/incremental/${YESTERDAY}/*.parquet',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'Parquet'
)"

echo "Sync complete for ${YESTERDAY}"
```

## Step 7: Validate Migration

```sql
-- Redshift
SELECT count(*), sum(amount), min(created_at), max(created_at) FROM events;

-- ClickHouse
SELECT count(), sum(amount), min(created_at), max(created_at) FROM events;
```

Spot check individual rows:

```sql
-- Redshift
SELECT * FROM events WHERE event_id = 'abc-123';

-- ClickHouse
SELECT * FROM events WHERE event_id = 'abc-123';
```

## Summary

Migrating from Redshift to ClickHouse involves unloading data to S3 using Redshift's `UNLOAD` command, creating a ClickHouse schema with an `ORDER BY` sort key that mirrors Redshift's `SORTKEY`, loading data via the ClickHouse `s3()` table function, and rewriting Redshift-specific functions. The migration eliminates per-query billing and delivers faster query performance for high-frequency analytical workloads on self-managed infrastructure.
