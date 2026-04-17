# How to Use ClickHouse as a Cache Layer for Slow Databases

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Caching, Database, Performance, OLAP

Description: Use ClickHouse as an analytical cache in front of slow transactional databases to serve dashboard queries in milliseconds without burdening your primary DB.

---

## Why Databases Struggle with Analytical Queries

Transactional databases like PostgreSQL or MySQL are optimized for row lookups and short writes, not for scanning millions of rows for aggregations. Running complex reports directly against your production database is slow and risks impacting transactional performance.

ClickHouse serves as a dedicated read layer for analytical queries, keeping your primary database free for transactions.

## Sync Strategy: CDC vs Periodic ETL

Two common patterns to populate ClickHouse from your source database:

1. **Change Data Capture (CDC)** - captures every row change in near real-time using Debezium or similar
2. **Periodic ETL** - exports data on a schedule (hourly or daily)

For dashboards that need data within minutes, use CDC. For nightly reports, periodic ETL is simpler.

## Setting Up a Periodic Sync with PostgreSQL

Export changed rows from PostgreSQL and load into ClickHouse hourly:

```bash
#!/bin/bash
# Export rows modified in the last hour
psql -h pg.internal -U etl analytics \
  -c "\copy (SELECT * FROM orders WHERE updated_at >= NOW() - INTERVAL '70 minutes') TO STDOUT CSV HEADER" \
  > /tmp/orders_delta.csv

# Load into ClickHouse
clickhouse-client --query \
  "INSERT INTO orders_cache FORMAT CSVWithNames" \
  < /tmp/orders_delta.csv
```

## ClickHouse Cache Table Design

Match the source schema but optimize for analytical queries:

```sql
CREATE TABLE orders_cache (
    order_id      UInt64,
    user_id       UInt64,
    status        LowCardinality(String),
    total_cents   UInt64,
    created_at    DateTime,
    updated_at    DateTime
) ENGINE = ReplacingMergeTree(updated_at)
PARTITION BY toYYYYMM(created_at)
ORDER BY (user_id, created_at);
```

`ReplacingMergeTree` with `updated_at` as the version key handles upserts from the CDC stream.

## Routing Queries to ClickHouse

In your application, route read-only analytical queries to ClickHouse:

```text
if query.is_analytical:
    return clickhouse_client.execute(analytical_sql)
else:
    return postgres_client.execute(transactional_sql)
```

A query is analytical if it includes GROUP BY, aggregation functions, or scans large date ranges.

## Handling Staleness

Document the lag for each cached table. Show a freshness indicator in dashboards:

```sql
SELECT
    max(updated_at) AS last_synced,
    dateDiff('minute', max(updated_at), now()) AS lag_minutes
FROM orders_cache;
```

If lag exceeds your SLA, alert via OneUptime and fall back to querying the source database directly.

## Measuring the Speedup

Compare query times before and after introducing the cache:

```text
Aggregation over 50M orders:
  PostgreSQL: 45 seconds
  ClickHouse: 380 milliseconds
  Speedup: ~118x
```

## Summary

Using ClickHouse as a cache layer in front of slow transactional databases offloads analytical query workloads, delivers sub-second dashboard response times, and protects production databases from expensive aggregate queries.
