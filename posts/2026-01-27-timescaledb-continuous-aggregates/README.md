# How to Use TimescaleDB Continuous Aggregates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TimescaleDB, Continuous Aggregates, Time Series, PostgreSQL, Analytics

Description: Learn how to use TimescaleDB continuous aggregates for real-time materialized views that automatically refresh as new data arrives.

---

> Continuous aggregates let you precompute expensive queries and keep them updated automatically. Instead of running costly GROUP BY queries on millions of rows every time, you query a materialized view that refreshes itself in the background.

## What Are Continuous Aggregates

Continuous aggregates are TimescaleDB's answer to the age-old problem of expensive analytical queries on time-series data. They are essentially **materialized views that automatically refresh** as new data flows into your hypertables.

Traditional materialized views require manual refresh. Continuous aggregates do not - they track what data has changed and update only the affected time buckets. This makes them ideal for dashboards, monitoring systems, and real-time analytics where you need fast reads without sacrificing data freshness.

Key benefits:

- **Automatic incremental refresh** - only new/changed data gets processed
- **Real-time query support** - combine materialized data with recent raw data
- **Dramatic query speedup** - precomputed aggregates return in milliseconds
- **Storage efficiency** - store summaries instead of raw data points

## Creating Continuous Aggregates

Before creating a continuous aggregate, you need a hypertable with time-series data. Here is a complete example:

```sql
-- Create a hypertable for metrics data
CREATE TABLE metrics (
    time        TIMESTAMPTZ NOT NULL,
    device_id   TEXT NOT NULL,
    cpu_usage   DOUBLE PRECISION,
    memory_mb   DOUBLE PRECISION,
    disk_io     DOUBLE PRECISION
);

SELECT create_hypertable('metrics', 'time');

-- Create a continuous aggregate for hourly device stats
CREATE MATERIALIZED VIEW metrics_hourly
WITH (timescaledb.continuous) AS
SELECT
    -- time_bucket groups data into 1-hour intervals
    time_bucket('1 hour', time) AS bucket,
    device_id,
    -- Aggregate functions compute summaries
    AVG(cpu_usage) AS avg_cpu,
    MAX(cpu_usage) AS max_cpu,
    AVG(memory_mb) AS avg_memory,
    SUM(disk_io) AS total_disk_io,
    COUNT(*) AS sample_count
FROM metrics
GROUP BY bucket, device_id
-- Do not backfill historical data on creation
WITH NO DATA;
```

The `WITH NO DATA` clause creates the view structure without immediately materializing historical data. This is useful for large datasets where you want to control when the initial backfill happens.

To backfill historical data:

```sql
-- Refresh data from 30 days ago to now
CALL refresh_continuous_aggregate(
    'metrics_hourly',
    NOW() - INTERVAL '30 days',
    NOW()
);
```

## Real-Time Aggregation vs Materialized

TimescaleDB continuous aggregates support two modes:

**Materialized-only mode** returns only data that has been materialized. Fast but potentially stale:

```sql
-- Query only materialized data (default for older versions)
SELECT * FROM metrics_hourly
WHERE bucket >= NOW() - INTERVAL '24 hours'
ORDER BY bucket DESC;
```

**Real-time aggregation** combines materialized data with fresh raw data that has not been materialized yet:

```sql
-- Enable real-time aggregation (default in TimescaleDB 2.0+)
ALTER MATERIALIZED VIEW metrics_hourly
SET (timescaledb.materialized_only = false);

-- Now queries automatically include recent unmaterialized data
-- The view seamlessly unions materialized + raw data
SELECT * FROM metrics_hourly
WHERE bucket >= NOW() - INTERVAL '1 hour';
```

Real-time mode is powerful but has a cost: queries must compute aggregates on-the-fly for the unmaterialized time range. For most dashboards, this trade-off is worth it - you get up-to-the-second accuracy without waiting for refresh cycles.

## Refresh Policies

Manual refreshes work but do not scale. Refresh policies automate the process:

```sql
-- Automatically refresh the last 3 hours of data every 30 minutes
SELECT add_continuous_aggregate_policy(
    'metrics_hourly',
    start_offset => INTERVAL '3 hours',   -- How far back to refresh
    end_offset => INTERVAL '1 hour',      -- Do not refresh very recent data
    schedule_interval => INTERVAL '30 minutes'  -- How often to run
);
```

The `end_offset` is important. Setting it to 1 hour means you do not refresh data from the last hour. This prevents the policy from repeatedly processing data that is still arriving. Combined with real-time aggregation, you get complete coverage:

- 0-1 hour ago: computed on-the-fly (real-time)
- 1+ hours ago: served from materialized data

View existing policies:

```sql
-- List all continuous aggregate policies
SELECT * FROM timescaledb_information.jobs
WHERE proc_name = 'policy_refresh_continuous_aggregate';

-- Remove a policy
SELECT remove_continuous_aggregate_policy('metrics_hourly');
```

## Hierarchical Continuous Aggregates

You can build continuous aggregates on top of other continuous aggregates. This is useful for multi-resolution analytics:

```sql
-- Daily aggregates built from hourly aggregates
CREATE MATERIALIZED VIEW metrics_daily
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', bucket) AS bucket,
    device_id,
    AVG(avg_cpu) AS avg_cpu,
    MAX(max_cpu) AS max_cpu,
    AVG(avg_memory) AS avg_memory,
    SUM(total_disk_io) AS total_disk_io,
    SUM(sample_count) AS sample_count
FROM metrics_hourly
GROUP BY 1, device_id;

-- Add refresh policy for daily view
SELECT add_continuous_aggregate_policy(
    'metrics_daily',
    start_offset => INTERVAL '3 days',
    end_offset => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 day'
);
```

Hierarchical aggregates reduce computation costs significantly. Instead of aggregating millions of raw rows into daily summaries, you aggregate thousands of hourly summaries.

## Querying Continuous Aggregates

Query continuous aggregates exactly like regular tables or views:

```sql
-- Get average CPU by device for the last 7 days
SELECT
    device_id,
    AVG(avg_cpu) AS weekly_avg_cpu,
    MAX(max_cpu) AS weekly_peak_cpu
FROM metrics_hourly
WHERE bucket >= NOW() - INTERVAL '7 days'
GROUP BY device_id
ORDER BY weekly_avg_cpu DESC;

-- Find devices with high CPU in the last 24 hours
SELECT
    bucket,
    device_id,
    avg_cpu,
    max_cpu
FROM metrics_hourly
WHERE bucket >= NOW() - INTERVAL '24 hours'
  AND max_cpu > 90
ORDER BY max_cpu DESC;

-- Time-series for a specific device
SELECT
    bucket,
    avg_cpu,
    avg_memory
FROM metrics_hourly
WHERE device_id = 'server-01'
  AND bucket >= NOW() - INTERVAL '7 days'
ORDER BY bucket;
```

For dashboard queries that need the latest data point:

```sql
-- Most recent stats per device
SELECT DISTINCT ON (device_id)
    device_id,
    bucket,
    avg_cpu,
    avg_memory
FROM metrics_hourly
ORDER BY device_id, bucket DESC;
```

## Compression with Continuous Aggregates

TimescaleDB compression works with continuous aggregates to reduce storage costs dramatically:

```sql
-- Enable compression on the continuous aggregate
ALTER MATERIALIZED VIEW metrics_hourly
SET (timescaledb.compress = true);

-- Add a compression policy - compress data older than 7 days
SELECT add_compression_policy(
    'metrics_hourly',
    compress_after => INTERVAL '7 days'
);

-- Check compression stats
SELECT
    hypertable_name,
    chunk_name,
    before_compression_total_bytes,
    after_compression_total_bytes,
    compression_ratio
FROM chunk_compression_stats('metrics_hourly');
```

Compression ratios of 10-20x are common for time-series aggregates. Combined with continuous aggregates, you can keep years of summarized data in minimal storage.

## Altering and Dropping Aggregates

Modify existing continuous aggregates:

```sql
-- Change real-time aggregation setting
ALTER MATERIALIZED VIEW metrics_hourly
SET (timescaledb.materialized_only = true);

-- Rename the view
ALTER MATERIALIZED VIEW metrics_hourly
RENAME TO device_metrics_hourly;

-- Drop a continuous aggregate (also removes associated policy)
DROP MATERIALIZED VIEW metrics_hourly CASCADE;
```

To modify the aggregate query itself (add columns, change buckets), you must drop and recreate the view. Plan schema carefully upfront.

Check aggregate metadata:

```sql
-- View continuous aggregate details
SELECT
    view_name,
    view_definition,
    materialized_only,
    compression_enabled
FROM timescaledb_information.continuous_aggregates;

-- Check materialization progress
SELECT
    hypertable_name,
    view_name,
    completed_threshold,
    invalidation_threshold
FROM timescaledb_information.continuous_aggregate_stats;
```

## Performance Benefits

The performance gains from continuous aggregates are substantial. Here is a real-world comparison:

```sql
-- Raw query on hypertable: scans millions of rows
-- Execution time: 2-5 seconds
EXPLAIN ANALYZE
SELECT
    time_bucket('1 hour', time) AS bucket,
    device_id,
    AVG(cpu_usage)
FROM metrics
WHERE time >= NOW() - INTERVAL '7 days'
GROUP BY bucket, device_id;

-- Same query on continuous aggregate: scans thousands of rows
-- Execution time: 10-50 milliseconds
EXPLAIN ANALYZE
SELECT bucket, device_id, avg_cpu
FROM metrics_hourly
WHERE bucket >= NOW() - INTERVAL '7 days';
```

Typical improvements:

| Scenario | Raw Query | Continuous Aggregate |
| --- | --- | --- |
| 7-day hourly dashboard | 2-5 seconds | 10-50 ms |
| 30-day trend analysis | 10-30 seconds | 50-200 ms |
| 90-day summary report | 30-60 seconds | 100-500 ms |

## Common Use Cases

**Metrics and Monitoring**

```sql
-- System metrics aggregated by host and minute
CREATE MATERIALIZED VIEW system_metrics_1m
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 minute', time) AS bucket,
    host,
    AVG(cpu_percent) AS avg_cpu,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY cpu_percent) AS p95_cpu,
    AVG(memory_percent) AS avg_memory,
    MAX(network_bytes_in) - MIN(network_bytes_in) AS network_in_delta
FROM system_metrics
GROUP BY bucket, host;
```

**IoT Sensor Data**

```sql
-- Sensor readings aggregated by location
CREATE MATERIALIZED VIEW sensor_readings_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    location_id,
    sensor_type,
    AVG(value) AS avg_value,
    MIN(value) AS min_value,
    MAX(value) AS max_value,
    STDDEV(value) AS stddev_value,
    COUNT(*) AS reading_count
FROM sensor_readings
GROUP BY bucket, location_id, sensor_type;
```

**Application Analytics**

```sql
-- API request analytics by endpoint
CREATE MATERIALIZED VIEW api_stats_5m
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('5 minutes', request_time) AS bucket,
    endpoint,
    method,
    COUNT(*) AS request_count,
    AVG(response_time_ms) AS avg_latency,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time_ms) AS p99_latency,
    SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END) AS error_count
FROM api_requests
GROUP BY bucket, endpoint, method;
```

## Best Practices Summary

1. **Choose bucket sizes based on query patterns** - if dashboards show hourly data, use 1-hour buckets. Do not over-granularize.

2. **Use real-time aggregation for fresh data** - let TimescaleDB combine materialized and raw data transparently.

3. **Set appropriate refresh policies** - balance freshness against compute cost. Most use cases work well with 15-30 minute refresh intervals.

4. **Build hierarchical aggregates** - create minute to hour to day cascades for multi-resolution dashboards.

5. **Enable compression on older data** - dramatically reduce storage for historical aggregates.

6. **Monitor refresh job performance** - watch for jobs that take too long or fail.

7. **Plan schema changes carefully** - altering aggregate definitions requires drop and recreate.

8. **Use PERCENTILE_CONT sparingly** - percentile calculations are expensive; consider approximations for high-volume data.

Continuous aggregates transform TimescaleDB from a capable time-series database into a real-time analytics engine. The combination of automatic refresh, real-time queries, hierarchical aggregation, and compression delivers sub-second query performance on datasets that would otherwise take minutes to analyze.

For monitoring your TimescaleDB infrastructure and continuous aggregate performance, check out [OneUptime](https://oneuptime.com) - an open-source observability platform that helps you track database health, query latency, and job execution alongside your application metrics.
