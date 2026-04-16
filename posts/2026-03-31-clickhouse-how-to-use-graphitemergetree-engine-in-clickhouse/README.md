# How to Use GraphiteMergeTree Engine in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, GraphiteMergeTree, Time Series, Metric, Table Engine

Description: Learn how to use GraphiteMergeTree in ClickHouse to store and automatically downsample Graphite-compatible metrics with configurable rollup rules.

---

## Overview

`GraphiteMergeTree` is a specialized ClickHouse engine for storing Graphite-format metrics. It automatically downsamples (rolls up) time series data according to configurable retention rules - keeping high-resolution data for recent periods and lower-resolution aggregates for older data. This mirrors how Graphite's Carbon/Whisper storage works.

## Table Schema

A GraphiteMergeTree table must have specific columns:

```sql
CREATE TABLE graphite_data
(
    Path        String,
    Value       Float64,
    Time        UInt32,
    Date        Date,
    Timestamp   UInt32
)
ENGINE = GraphiteMergeTree('graphite_rollup')
PARTITION BY toYYYYMM(Date)
ORDER BY (Path, Time);
```

Required columns:
- `Path` - the metric name (e.g., `servers.web01.cpu.user`)
- `Value` - the metric value
- `Time` - Unix timestamp (UInt32)
- `Date` - partition date
- The engine references a `graphite_rollup` config section

## Configuring Rollup Rules

Define rollup rules in `config.xml` or a separate `.xml` file in `config.d/`:

```xml
<graphite_rollup>
    <path_column_name>Path</path_column_name>
    <time_column_name>Time</time_column_name>
    <value_column_name>Value</value_column_name>
    <version_column_name>Timestamp</version_column_name>

    <pattern>
        <regexp>^servers\..+\.cpu\.</regexp>
        <function>max</function>
        <retention>
            <age>0</age>
            <precision>10</precision>    <!-- 10-second resolution for CPU metrics -->
        </retention>
        <retention>
            <age>3600</age>
            <precision>60</precision>    <!-- 1-minute resolution after 1 hour -->
        </retention>
    </pattern>

    <default>
        <function>avg</function>
        <retention>
            <age>0</age>
            <precision>60</precision>   <!-- 60-second resolution for recent data -->
        </retention>
        <retention>
            <age>86400</age>
            <precision>3600</precision>  <!-- 1-hour resolution after 1 day -->
        </retention>
        <retention>
            <age>2592000</age>
            <precision>86400</precision> <!-- 1-day resolution after 30 days -->
        </retention>
    </default>
</graphite_rollup>
```

## Inserting Metrics

```sql
INSERT INTO graphite_data (Path, Value, Time, Date, Timestamp) VALUES
('servers.web01.cpu.user', 23.5, toUnixTimestamp(now()), today(), toUnixTimestamp(now())),
('servers.web01.memory.used', 4096.0, toUnixTimestamp(now()), today(), toUnixTimestamp(now())),
('servers.web02.cpu.user', 41.2, toUnixTimestamp(now()), today(), toUnixTimestamp(now()));
```

## Querying Metrics

Query a specific metric over a time window:

```sql
SELECT
    Path,
    toDateTime(Time) AS metric_time,
    Value
FROM graphite_data
WHERE Path = 'servers.web01.cpu.user'
  AND Time >= toUnixTimestamp(now() - INTERVAL 1 HOUR)
ORDER BY metric_time
```

## Querying with Path Patterns

Use LIKE for path-based filtering:

```sql
SELECT
    Path,
    avg(Value)      AS avg_value,
    max(Value)      AS peak_value
FROM graphite_data
WHERE Path LIKE 'servers.web%.cpu.user'
  AND Date >= today() - 1
GROUP BY Path
ORDER BY Path
```

## How Rollup Works

During background merges, ClickHouse applies the rollup rules:
- Rows for the same `Path` and same time bucket (per `precision`) are aggregated using the configured function (`avg`, `max`, `min`, `any`)
- Older data is stored at coarser time resolutions
- This reduces storage while preserving trend data

You can trigger rollup manually:

```bash
clickhouse-client --query "OPTIMIZE TABLE graphite_data FINAL"
```

## Checking Rollup Configuration

```sql
SELECT * FROM system.graphite_retentions
ORDER BY config_name, regexp, age
```

## Using with Graphite Carbon

GraphiteMergeTree integrates with Graphite's Carbon ecosystem via the `carbon-clickhouse` relay (which receives Graphite line/pickle/protobuf metrics and writes them to ClickHouse). For the read path, `graphite-clickhouse` serves as a graphite-web compatible backend that queries the GraphiteMergeTree table.

## Summary

`GraphiteMergeTree` stores Graphite metrics with automatic time-based downsampling controlled by rollup configuration rules. It maps metric names to paths, applies aggregation functions (avg, max, min, any) during background merges, and progressively reduces resolution for older data. It is the canonical ClickHouse engine for replacing Graphite/Whisper storage at analytical scale.
