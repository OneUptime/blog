# How to Handle Multiple Time Granularities in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Time Granularity, Time-Series, Aggregation, Analytics

Description: Learn how to handle multiple time granularities in ClickHouse by routing queries to pre-aggregated tables at different resolutions based on the requested time range.

---

## The Challenge of Multiple Granularities

Dashboards need different time resolutions depending on the time range. A 1-hour view needs per-minute data. A 1-year view needs per-day data. Querying raw data for all resolutions is wasteful. ClickHouse handles this elegantly with a tiered table architecture and automatic query routing.

## Tiered Table Design

Create tables at second, minute, hour, and day granularities:

```sql
CREATE TABLE metrics_raw (
    service LowCardinality(String),
    ts DateTime,
    value Float64
) ENGINE = MergeTree() ORDER BY (service, ts)
TTL ts + INTERVAL 2 HOUR;

CREATE TABLE metrics_1m (
    service LowCardinality(String),
    ts_bucket DateTime,
    avg_val Float64, min_val Float64, max_val Float64, cnt UInt64
) ENGINE = MergeTree() ORDER BY (service, ts_bucket)
TTL ts_bucket + INTERVAL 3 DAY;

CREATE TABLE metrics_1h (
    service LowCardinality(String),
    ts_bucket DateTime,
    avg_val Float64, min_val Float64, max_val Float64, cnt UInt64
) ENGINE = MergeTree() ORDER BY (service, ts_bucket)
TTL ts_bucket + INTERVAL 90 DAY;

CREATE TABLE metrics_1d (
    service LowCardinality(String),
    ts_bucket Date,
    avg_val Float64, min_val Float64, max_val Float64, cnt UInt64
) ENGINE = MergeTree() ORDER BY (service, ts_bucket);
```

## Materialized Views for Automatic Rollup

Feed each tier automatically from inserts to the raw table:

```sql
CREATE MATERIALIZED VIEW mv_to_1m TO metrics_1m AS
SELECT service, toStartOfMinute(ts) AS ts_bucket,
    avg(value) AS avg_val, min(value) AS min_val,
    max(value) AS max_val, count() AS cnt
FROM metrics_raw GROUP BY service, ts_bucket;

CREATE MATERIALIZED VIEW mv_to_1h TO metrics_1h AS
SELECT service, toStartOfHour(ts_bucket) AS ts_bucket,
    sum(avg_val * cnt) / sum(cnt) AS avg_val, min(min_val) AS min_val,
    max(max_val) AS max_val, sum(cnt) AS cnt
FROM metrics_1m GROUP BY service, ts_bucket;
```

## Application-Side Query Routing

Select the appropriate table based on range duration:

```python
def query_metrics(service, start, end):
    duration_hours = (end - start).total_seconds() / 3600

    if duration_hours <= 2:
        table, ts_col, val_col = "metrics_raw", "ts", "value"
    elif duration_hours <= 72:
        table, ts_col, val_col = "metrics_1m", "ts_bucket", "avg_val"
    elif duration_hours <= 2160:  # 90 days
        table, ts_col, val_col = "metrics_1h", "ts_bucket", "avg_val"
    else:
        table, ts_col, val_col = "metrics_1d", "ts_bucket", "avg_val"

    return f"SELECT {ts_col}, {val_col} FROM {table} WHERE service = '{service}' AND {ts_col} BETWEEN '{start}' AND '{end}'"
```

## Merge Granularities at Query Time

Combine multiple tiers in a single `UNION ALL` for edge cases spanning retention boundaries:

```sql
SELECT ts_bucket AS bucket, avg_val FROM metrics_1h
WHERE service = 'api' AND ts_bucket BETWEEN '2026-01-01' AND '2026-03-01'
UNION ALL
SELECT ts_bucket AS bucket, avg_val FROM metrics_1d
WHERE service = 'api' AND ts_bucket BETWEEN '2025-01-01' AND '2025-12-31'
ORDER BY bucket;
```

## Summary

Handling multiple time granularities in ClickHouse requires a tiered table architecture with materialized views for automatic rollup and TTL policies for retention. Application-side query routing selects the appropriate table based on the requested time range, keeping queries fast regardless of the time span.
