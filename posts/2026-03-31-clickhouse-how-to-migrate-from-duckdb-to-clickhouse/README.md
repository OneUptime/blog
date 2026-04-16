# How to Migrate from DuckDB to ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, DuckDB, Migration, Analytics, OLAP, Database

Description: Migrate from DuckDB to ClickHouse when your analytical workload requires a server-based deployment, concurrent users, or horizontal scaling beyond a single machine.

---

DuckDB is an excellent embedded analytical database, but it runs in-process and is limited to a single machine. ClickHouse is a server-based system designed for concurrent users, horizontal scaling, and high-throughput data ingestion - making it the natural next step as your data grows.

## When to Move from DuckDB to ClickHouse

- Your dataset exceeds available RAM on a single machine
- Multiple users need to query simultaneously
- You need real-time data ingestion (Kafka, HTTP)
- You require a persistent server rather than embedded queries

## Step 1 - Export Data from DuckDB

DuckDB's SQL makes export to Parquet trivial:

```sql
COPY (SELECT * FROM page_views) TO '/tmp/page_views.parquet' (FORMAT PARQUET);
```

For multiple tables, export each:

```bash
duckdb mydata.db <<'EOF'
COPY page_views TO '/tmp/page_views.parquet' (FORMAT PARQUET);
COPY events TO '/tmp/events.parquet' (FORMAT PARQUET);
COPY users TO '/tmp/users.parquet' (FORMAT PARQUET);
EOF
```

## Step 2 - Create Tables in ClickHouse

Map DuckDB types to ClickHouse:

```sql
-- DuckDB DDL
-- CREATE TABLE page_views (
--     event_id    UUID,
--     user_id     VARCHAR,
--     page        VARCHAR,
--     duration_ms INTEGER DEFAULT 0,
--     created_at  TIMESTAMPTZ
-- );

-- ClickHouse equivalent
CREATE TABLE analytics.page_views
(
    event_id    UUID,
    user_id     String,
    page        LowCardinality(String),
    duration_ms UInt32 DEFAULT 0,
    created_at  DateTime
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (created_at, user_id, event_id);
```

## Step 3 - Load Parquet Files

```sql
INSERT INTO analytics.page_views
SELECT *
FROM file('/tmp/page_views.parquet', 'Parquet');
```

Or via S3 if files are there:

```sql
INSERT INTO analytics.page_views
SELECT *
FROM s3('s3://bucket/duckdb-export/*.parquet', 'KEY', 'SECRET', 'Parquet');
```

## Step 4 - Translate DuckDB SQL

DuckDB's SQL is very close to standard ANSI SQL. Most queries need minor changes:

```sql
-- DuckDB: date_trunc
SELECT date_trunc('hour', created_at) AS hour, count(*) FROM page_views GROUP BY hour

-- ClickHouse
SELECT toStartOfHour(created_at) AS hour, count() FROM analytics.page_views GROUP BY hour
```

```sql
-- DuckDB: list_aggregate
SELECT list_aggregate(page_list, 'count') FROM sessions

-- ClickHouse: arrayReduce
SELECT arrayReduce('count', page_list) FROM analytics.sessions
```

```sql
-- DuckDB: approx_count_distinct
SELECT approx_count_distinct(user_id) FROM page_views

-- ClickHouse
SELECT uniq(user_id) FROM analytics.page_views
```

## Step 5 - Set Up Real-Time Ingestion

ClickHouse supports real-time ingestion patterns that DuckDB cannot:

```sql
-- Kafka Engine for streaming ingestion
CREATE TABLE analytics.page_views_kafka
(
    event_id    UUID,
    user_id     String,
    page        String,
    duration_ms UInt32,
    created_at  DateTime
)
ENGINE = Kafka
SETTINGS
    kafka_broker_list = 'kafka:9092',
    kafka_topic_list = 'page-views',
    kafka_group_name = 'clickhouse-consumer',
    kafka_format = 'JSONEachRow';
```

## Summary

DuckDB to ClickHouse migration is straightforward because both use columnar storage and standard SQL. Parquet export and import handles the data transfer with no transformation needed. ClickHouse unlocks concurrent access, real-time ingestion, and horizontal scaling that DuckDB's embedded model cannot provide.
