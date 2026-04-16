# How to Migrate from CrateDB to ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, CrateDB, Migration, Analytics, Distributed, SQL

Description: Migrate from CrateDB to ClickHouse for better compression, faster aggregation queries, and a more mature ecosystem of analytics integrations.

---

CrateDB is a distributed SQL database built on top of Elasticsearch's Lucene engine. ClickHouse offers faster analytical query performance, better compression ratios, and a richer SQL dialect for analytical workloads.

## Key Differences

| Aspect | CrateDB | ClickHouse |
|--------|---------|------------|
| Storage engine | Lucene (column-oriented) | Custom MergeTree (columnar) |
| Full-text search | Yes (via Lucene) | Limited (LIKE, regexp) |
| Aggregation performance | Good | Excellent |
| Compression | LZ4 (default) | LZ4/ZSTD (configurable) |
| SQL compliance | ANSI SQL subset | ANSI SQL + extensions |

## Step 1 - Export from CrateDB

Use the CrateDB HTTP endpoint or `crash` CLI to export:

```bash
crash --hosts localhost:4200 \
  --command "COPY analytics.page_views TO DIRECTORY '/tmp/page_views/' WITH (format='json_object')"
```

Or use the COPY TO statement directly:

```sql
COPY analytics.page_views
TO DIRECTORY '/tmp/exports/'
WITH (format = 'json_object', compression = 'gzip');
```

## Step 2 - Create the ClickHouse Table

Map CrateDB column types:

```sql
-- CrateDB DDL
-- CREATE TABLE analytics.page_views (
--     event_id    TEXT PRIMARY KEY,
--     user_id     TEXT,
--     page        TEXT INDEX USING FULLTEXT,
--     duration    INTEGER DEFAULT 0,
--     created_at  TIMESTAMP WITH TIME ZONE
-- )
-- CLUSTERED INTO 4 SHARDS
-- WITH (number_of_replicas = '1');

-- ClickHouse equivalent
CREATE TABLE analytics.page_views
(
    event_id    String,
    user_id     String,
    page        LowCardinality(String),
    duration    UInt32 DEFAULT 0,
    created_at  DateTime
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (created_at, user_id, event_id);
```

## Step 3 - Load the Exported JSON

```bash
# Decompress and load
gunzip -c /tmp/exports/page_views_*.json.gz | \
  clickhouse-client \
    --query "INSERT INTO analytics.page_views FORMAT JSONEachRow"
```

## Step 4 - Translate CrateDB SQL

CrateDB's SQL is largely ANSI-compliant with some Elasticsearch-inspired extensions:

```sql
-- CrateDB: date binning
SELECT date_trunc('hour', created_at) AS hour, count(*) AS events
FROM analytics.page_views
GROUP BY hour ORDER BY hour

-- ClickHouse
SELECT toStartOfHour(created_at) AS hour, count() AS events
FROM analytics.page_views
GROUP BY hour ORDER BY hour
```

```sql
-- CrateDB: full-text search
SELECT * FROM page_views WHERE match(page, 'checkout')

-- ClickHouse: LIKE or regexp
SELECT * FROM analytics.page_views WHERE page LIKE '%checkout%'
```

```sql
-- CrateDB: geo queries
SELECT * FROM page_views
WHERE within(location, 'POLYGON((...))')

-- ClickHouse: use pointInPolygon
SELECT * FROM analytics.page_views
WHERE pointInPolygon((lon, lat), [(x1,y1),(x2,y2),(x3,y3)])
```

## Step 5 - Validate Row Counts

```sql
-- CrateDB
SELECT count(*) FROM analytics.page_views;

-- ClickHouse
SELECT count() FROM analytics.page_views;
```

## Summary

CrateDB to ClickHouse migration is primarily a SQL syntax translation task. The main differences are function names for date truncation and the lack of full-text search in ClickHouse. In return, you get faster aggregation queries and better compression for analytical workloads that don't require Lucene-style text search.
