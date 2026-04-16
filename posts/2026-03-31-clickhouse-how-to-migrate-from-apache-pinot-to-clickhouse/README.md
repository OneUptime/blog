# How to Migrate from Apache Pinot to ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Apache Pinot, Migration, Real-Time Analytics, OLAP, Data Warehouse

Description: Migrate from Apache Pinot to ClickHouse to reduce operational complexity while maintaining real-time analytical query performance at scale.

---

Apache Pinot is designed for sub-second OLAP queries on large datasets, but it requires a complex cluster of Controller, Broker, Server, and Minion components. ClickHouse provides similar query performance with a simpler architecture.

## Key Differences

| Aspect | Pinot | ClickHouse |
|--------|-------|------------|
| Components | Controller, Broker, Server, Minion | Single binary |
| Schema format | JSON schema files | SQL DDL |
| Segment storage | Deep storage (HDFS/S3) | Local + S3 backup |
| Star-tree index | Built-in | AggregatingMergeTree |
| Upserts | Supported | ReplacingMergeTree |

## Step 1 - Export Data from Pinot

Use Pinot's query API to export data segment by segment:

```bash
curl -X POST https://pinot-broker:8099/query/sql \
  -H 'Content-Type: application/json' \
  -d '{"sql": "SELECT tsMillis, page, userId, views FROM pageViews LIMIT 1000000 OPTION(timeoutMs=60000)"}' \
  | jq -c '.resultTable.rows[] | {tsMillis: .[0], page: .[1], userId: .[2], views: .[3]}' > pinot_export.jsonl
```

For large tables, export in time-based chunks:

```bash
for MONTH in 2024-01 2024-02 2024-03; do
  curl -X POST https://pinot-broker:8099/query/sql \
    -H 'Content-Type: application/json' \
    -d "{\"sql\": \"SELECT * FROM pageViews WHERE ToDateTime(tsMillis, 'yyyy-MM') = '${MONTH}'\"}" \
    >> pinot_export_${MONTH}.jsonl
done
```

## Step 2 - Create the ClickHouse Table

Translate the Pinot schema to ClickHouse DDL.

Pinot schema (JSON):
```text
{
  "dimensionFieldSpecs": [
    {"name": "page", "dataType": "STRING"},
    {"name": "userId", "dataType": "STRING"}
  ],
  "metricFieldSpecs": [
    {"name": "views", "dataType": "INT"}
  ],
  "dateTimeFieldSpecs": [
    {"name": "tsMillis", "dataType": "LONG", "format": "1:MILLISECONDS:EPOCH"}
  ]
}
```

ClickHouse DDL:

```sql
CREATE TABLE analytics.page_views
(
    ts           DateTime,
    page         LowCardinality(String),
    user_id      String,
    views        UInt32
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (ts, page, user_id);
```

## Step 3 - Load Exported Data

```sql
INSERT INTO analytics.page_views
SELECT
    fromUnixTimestamp64Milli(tsMillis) AS ts,
    page,
    userId AS user_id,
    views
FROM file('/tmp/pinot_export.jsonl', 'JSONEachRow');
```

## Step 4 - Translate Pinot SQL

Pinot uses `datetrunc` for time bucketing:

```sql
-- Pinot
SELECT datetrunc('hour', tsMillis, 'MILLISECONDS') AS hour, SUM(views)
FROM pageViews GROUP BY hour

-- ClickHouse
SELECT toStartOfHour(ts) AS hour, sum(views)
FROM analytics.page_views GROUP BY hour
```

## Step 5 - Replace Pinot's Star-Tree Index

Pinot's star-tree index pre-aggregates metrics. In ClickHouse, use `AggregatingMergeTree`:

```sql
CREATE TABLE analytics.page_views_agg
(
    ts       DateTime,
    page     LowCardinality(String),
    views    AggregateFunction(sum, UInt32),
    users    AggregateFunction(uniq, String)
)
ENGINE = AggregatingMergeTree()
ORDER BY (ts, page);

CREATE MATERIALIZED VIEW analytics.page_views_agg_mv
TO analytics.page_views_agg AS
SELECT
    toStartOfHour(ts) AS ts,
    page,
    sumState(views) AS views,
    uniqState(user_id) AS users
FROM analytics.page_views
GROUP BY ts, page;
```

## Summary

Migrating from Pinot to ClickHouse removes significant cluster management overhead. The Pinot schema maps directly to ClickHouse DDL, and ClickHouse's AggregatingMergeTree replaces the star-tree index for pre-aggregated queries. Most Pinot SQL functions have direct equivalents in ClickHouse.
