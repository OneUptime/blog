# How to Migrate from Vertica to ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Vertica, Migration, Data Warehouse, Analytics, Columnar

Description: Replace Vertica with ClickHouse to eliminate expensive licensing costs while retaining fast columnar analytics on large datasets.

---

Vertica is a commercial columnar data warehouse with high licensing costs. ClickHouse delivers comparable analytical performance as open-source software, making it a compelling migration target for teams looking to reduce costs.

## Comparing Key Concepts

| Vertica | ClickHouse |
|---------|------------|
| Projection | Materialized View / AggregatingMergeTree |
| Sort key | ORDER BY |
| Segmentation clause | Sharding key |
| APPROXIMATE_COUNT_DISTINCT | uniq() |
| Date/time functions | similar but different names |

## Step 1 - Export Data from Vertica

Use `vsql` to write query results to a CSV file on the client:

```bash
vsql -h vertica-host -U dbadmin -w password analytics \
  -F ',' -At -o /tmp/page_views.csv \
  -c "SELECT * FROM page_views"
```

Or export directly to object storage with `EXPORT TO PARQUET`. The `OVER (PARTITION BY ...)` clause accepts column references but not expressions, so compute partition columns in the SELECT:

```sql
EXPORT TO PARQUET(directory='s3://bucket/exports/page_views/')
OVER (PARTITION BY year, month)
AS SELECT YEAR(created_at) AS year, MONTH(created_at) AS month, p.*
FROM analytics.page_views p;
```

## Step 2 - Map Vertica Types to ClickHouse

```sql
-- Vertica DDL
CREATE TABLE analytics.page_views (
    event_id    VARCHAR(36)     NOT NULL,
    user_id     VARCHAR(100),
    page        VARCHAR(500),
    duration    INTEGER         DEFAULT 0,
    created_at  TIMESTAMP       NOT NULL
)
ORDER BY created_at
SEGMENTED BY HASH(user_id) ALL NODES;
```

ClickHouse equivalent:

```sql
CREATE TABLE analytics.page_views
(
    event_id    String,
    user_id     String,
    page        LowCardinality(String),
    duration    UInt32          DEFAULT 0,
    created_at  DateTime
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (created_at, user_id);
```

## Step 3 - Load the Exported Data

```sql
INSERT INTO analytics.page_views
SELECT *
FROM s3(
    's3://bucket/exports/page_views/*.parquet',
    'KEY', 'SECRET', 'Parquet'
);
```

Or from CSV:

```bash
clickhouse-client --query "INSERT INTO analytics.page_views FORMAT CSVWithNames" < /tmp/page_views.csv
```

## Step 4 - Translate Vertica SQL

```sql
-- Vertica: date truncation
SELECT DATE_TRUNC('month', created_at) AS month, count(*) AS events
FROM page_views GROUP BY month

-- ClickHouse
SELECT toStartOfMonth(created_at) AS month, count() AS events
FROM analytics.page_views GROUP BY month
```

```sql
-- Vertica: approximate distinct
SELECT APPROXIMATE_COUNT_DISTINCT(user_id) FROM page_views

-- ClickHouse
SELECT uniq(user_id) FROM analytics.page_views
```

## Step 5 - Replace Vertica Projections

Vertica projections are pre-sorted copies of data for specific query patterns. In ClickHouse, use materialized views:

```sql
CREATE MATERIALIZED VIEW analytics.page_views_by_page
ENGINE = AggregatingMergeTree()
ORDER BY (page, toDate(created_at))
AS
SELECT
    page,
    toDate(created_at) AS day,
    countState() AS views,
    uniqState(user_id) AS unique_users
FROM analytics.page_views
GROUP BY page, day;
```

## Summary

Migrating from Vertica to ClickHouse eliminates licensing costs while maintaining fast columnar query performance. Vertica projections map to ClickHouse materialized views, and most SQL constructs translate cleanly with minor function name changes.
