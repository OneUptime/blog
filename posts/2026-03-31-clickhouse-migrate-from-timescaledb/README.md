# How to Migrate from TimescaleDB to ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, TimescaleDB, Migration, Database, Time-Series, PostgreSQL

Description: Migrate time-series data from TimescaleDB to ClickHouse by exporting hypertables with COPY, mapping compression settings, and rewriting TimescaleDB-specific SQL functions.

---

TimescaleDB is a PostgreSQL extension that adds hypertables, automatic partitioning, and time-series compression. It shares PostgreSQL's query engine, which limits analytical throughput compared to ClickHouse's columnar vectorized execution. This guide covers migrating hypertable data from TimescaleDB to ClickHouse.

## When TimescaleDB Becomes Limiting

Signs that TimescaleDB workloads would benefit from ClickHouse:

- Aggregation queries over large hypertables take more than a few seconds
- PostgreSQL connections are saturated during peak reporting periods
- Compression ratios are insufficient - TimescaleDB typically achieves 10-15x while ClickHouse achieves 20-40x on time-series data
- Query planner cannot effectively use hypertable chunk exclusion for complex filters

## Architectural Comparison

| Feature | TimescaleDB | ClickHouse |
|---------|-------------|------------|
| Base | PostgreSQL extension | Standalone DBMS |
| Partitioning | Hypertable chunks (time-based) | MergeTree parts + PARTITION BY |
| Compression | Native column compression | LZ4/ZSTD per column codecs |
| Continuous aggregates | Materialized views (refreshed) | Materialized views (real-time) |
| Retention | Data retention policies | TTL clause |
| SQL dialect | Full PostgreSQL SQL | ClickHouse SQL |
| Joins | Full PostgreSQL joins | Hash/merge joins (column-oriented) |

## Data Type Mapping

| TimescaleDB / PostgreSQL | ClickHouse |
|--------------------------|------------|
| SMALLINT | Int16 |
| INTEGER | Int32 |
| BIGINT | Int64 |
| REAL | Float32 |
| DOUBLE PRECISION | Float64 |
| NUMERIC(p, s) | Decimal(p, s) |
| TEXT / VARCHAR | String |
| BOOLEAN | Bool |
| DATE | Date |
| TIMESTAMP | DateTime |
| TIMESTAMPTZ | DateTime (store UTC) |
| UUID | UUID |
| JSONB | String (use JSONExtract) |
| ARRAY | Array(T) |

## Step 1: Inspect the TimescaleDB Hypertable

Connect and review the schema:

```sql
-- List all hypertables
SELECT hypertable_name, num_chunks, compression_enabled
FROM timescaledb_information.hypertables;

-- View chunk intervals
SELECT * FROM timescaledb_information.chunks
WHERE hypertable_name = 'metrics'
ORDER BY range_start DESC
LIMIT 10;

-- View column details
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'metrics'
ORDER BY ordinal_position;
```

## Step 2: Example TimescaleDB Schema

```sql
-- TimescaleDB
CREATE TABLE metrics (
    ts          TIMESTAMPTZ   NOT NULL,
    host        TEXT          NOT NULL,
    region      TEXT          NOT NULL,
    cpu_usage   DOUBLE PRECISION,
    mem_usage   DOUBLE PRECISION,
    disk_read   BIGINT        DEFAULT 0,
    disk_write  BIGINT        DEFAULT 0,
    net_rx      BIGINT        DEFAULT 0,
    net_tx      BIGINT        DEFAULT 0
);

SELECT create_hypertable('metrics', 'ts', chunk_time_interval => INTERVAL '1 day');

ALTER TABLE metrics SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'host,region',
    timescaledb.compress_orderby   = 'ts DESC'
);

SELECT add_compression_policy('metrics', INTERVAL '7 days');
SELECT add_retention_policy('metrics', INTERVAL '90 days');
```

## Step 3: Equivalent ClickHouse Schema

```sql
CREATE TABLE metrics
(
    ts         DateTime64(6)                   CODEC(DoubleDelta, ZSTD),
    host       LowCardinality(String)           CODEC(ZSTD),
    region     LowCardinality(String)           CODEC(ZSTD),
    cpu_usage  Float64                          CODEC(Gorilla, ZSTD),
    mem_usage  Float64                          CODEC(Gorilla, ZSTD),
    disk_read  Int64                            CODEC(Delta, ZSTD),
    disk_write Int64                            CODEC(Delta, ZSTD),
    net_rx     Int64                            CODEC(Delta, ZSTD),
    net_tx     Int64                            CODEC(Delta, ZSTD)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(ts)
ORDER BY (host, region, ts)
TTL toDateTime(ts) + INTERVAL 90 DAY;
```

Column codec choices:
- `DoubleDelta` for the timestamp (monotonically increasing)
- `Gorilla` for floating-point gauge metrics (CPU, memory percentages)
- `Delta` for monotonically increasing counters (disk, network bytes)
- `ZSTD` as the final compression layer for all columns

## Step 4: Export with PostgreSQL COPY

Decompress TimescaleDB chunks before exporting:

```sql
-- Decompress all chunks first (required for COPY)
SELECT decompress_chunk(c) FROM show_chunks('metrics') c;
```

Export with COPY:

```bash
psql -h timescale.host -U tsdb -d monitoring \
  -c "\COPY (
      SELECT
          ts AT TIME ZONE 'UTC',
          host, region,
          cpu_usage, mem_usage,
          disk_read, disk_write,
          net_rx, net_tx
      FROM metrics
      WHERE ts >= '2024-01-01'
      ORDER BY ts
  ) TO '/tmp/metrics.csv' WITH (FORMAT CSV, HEADER true);"
```

For large tables, export month by month:

```bash
#!/bin/bash
for YEAR in 2023 2024; do
  for MONTH in $(seq -w 1 12); do
    START="${YEAR}-${MONTH}-01"
    END=$(date -d "$START + 1 month" +%Y-%m-%d)
    echo "Exporting ${START} to ${END}..."

    psql -h timescale.host -U tsdb -d monitoring \
      -c "\COPY (
          SELECT
              ts AT TIME ZONE 'UTC', host, region,
              cpu_usage, mem_usage, disk_read, disk_write, net_rx, net_tx
          FROM metrics
          WHERE ts >= '${START}' AND ts < '${END}'
          ORDER BY ts
      ) TO '/tmp/metrics_${YEAR}_${MONTH}.csv' WITH (FORMAT CSV, HEADER true);"
  done
done
```

## Step 5: Load into ClickHouse

```bash
for file in /tmp/metrics_*.csv; do
  echo "Loading $file..."
  clickhouse-client \
    --database monitoring \
    --query "INSERT INTO metrics FORMAT CSVWithNames" \
    < "$file"
done
```

## Step 6: Rewrite TimescaleDB SQL

TimescaleDB provides time_bucket, time_bucket_gapfill, and other time-series helpers. Here are the ClickHouse equivalents:

```sql
-- TimescaleDB: time_bucket
SELECT
    time_bucket('5 minutes', ts) AS bucket,
    host,
    AVG(cpu_usage)               AS avg_cpu
FROM metrics
WHERE ts > NOW() - INTERVAL '1 hour'
GROUP BY bucket, host
ORDER BY bucket;

-- ClickHouse
SELECT
    toStartOfFiveMinutes(ts) AS bucket,
    host,
    avg(cpu_usage)           AS avg_cpu
FROM metrics
WHERE ts > now() - INTERVAL 1 HOUR
GROUP BY bucket, host
ORDER BY bucket;
```

```sql
-- TimescaleDB: time_bucket_gapfill with locf (last observation carried forward)
SELECT
    time_bucket_gapfill('1 hour', ts) AS hour,
    host,
    locf(AVG(cpu_usage))              AS cpu_filled
FROM metrics
WHERE ts > NOW() - INTERVAL '24 hours'
GROUP BY hour, host;

-- ClickHouse: WITH FILL for gap filling
SELECT
    toStartOfHour(ts) AS hour,
    host,
    avg(cpu_usage)    AS avg_cpu
FROM metrics
WHERE ts > now() - INTERVAL 24 HOUR
GROUP BY hour, host
ORDER BY hour WITH FILL STEP toIntervalHour(1), host;
```

```sql
-- TimescaleDB: first() / last() (ordered by time)
SELECT
    host,
    first(cpu_usage, ts) AS cpu_at_start,
    last(cpu_usage, ts)  AS cpu_at_end
FROM metrics
WHERE ts > NOW() - INTERVAL '1 hour'
GROUP BY host;

-- ClickHouse: argMin / argMax
SELECT
    host,
    argMin(cpu_usage, ts) AS cpu_at_start,
    argMax(cpu_usage, ts) AS cpu_at_end
FROM metrics
WHERE ts > now() - INTERVAL 1 HOUR
GROUP BY host;
```

```sql
-- TimescaleDB: histogram
SELECT
    host,
    histogram(cpu_usage, 0, 100, 10) AS cpu_histogram
FROM metrics
WHERE ts > NOW() - INTERVAL '1 hour'
GROUP BY host;

-- ClickHouse: histogram function
SELECT
    host,
    histogram(10)(cpu_usage) AS cpu_histogram
FROM metrics
WHERE ts > now() - INTERVAL 1 HOUR
GROUP BY host;
```

## Step 7: Recreate Continuous Aggregates

TimescaleDB continuous aggregates become ClickHouse materialized views:

```sql
-- TimescaleDB continuous aggregate
CREATE MATERIALIZED VIEW metrics_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', ts) AS hour,
    host,
    AVG(cpu_usage)  AS avg_cpu,
    MAX(cpu_usage)  AS max_cpu,
    AVG(mem_usage)  AS avg_mem
FROM metrics
GROUP BY hour, host;
```

```sql
-- ClickHouse: destination table
CREATE TABLE metrics_hourly
(
    hour      DateTime,
    host      LowCardinality(String),
    avg_cpu   AggregateFunction(avg, Float64),
    max_cpu   AggregateFunction(max, Float64),
    avg_mem   AggregateFunction(avg, Float64),
    cnt       AggregateFunction(count)
)
ENGINE = AggregatingMergeTree()
ORDER BY (host, hour);

-- Materialized view
CREATE MATERIALIZED VIEW metrics_hourly_mv
TO metrics_hourly
AS
SELECT
    toStartOfHour(ts) AS hour,
    host,
    avgState(cpu_usage)    AS avg_cpu,
    maxState(cpu_usage)    AS max_cpu,
    avgState(mem_usage)    AS avg_mem,
    countState()           AS cnt
FROM metrics
GROUP BY hour, host;
```

## Step 8: Validate

```sql
-- TimescaleDB
SELECT count(*), min(ts), max(ts), avg(cpu_usage) FROM metrics;

-- ClickHouse
SELECT count(), min(ts), max(ts), avg(cpu_usage) FROM metrics;
```

Check compression ratio in ClickHouse:

```sql
SELECT
    formatReadableSize(sum(data_compressed_bytes))   AS compressed,
    formatReadableSize(sum(data_uncompressed_bytes)) AS uncompressed,
    round(sum(data_uncompressed_bytes) / sum(data_compressed_bytes), 1) AS ratio
FROM system.parts
WHERE table = 'metrics' AND database = 'monitoring' AND active = 1;
```

## Summary

TimescaleDB hypertables migrate to ClickHouse MergeTree tables with specialized column codecs (DoubleDelta for timestamps, Gorilla for float gauges, Delta for counters). Export data with PostgreSQL COPY after decompressing chunks, load with `clickhouse-client`, rewrite `time_bucket` as `toStartOfHour/Minute/FiveMinutes`, and replace `first()/last()` with `argMin()/argMax()`. Continuous aggregates become ClickHouse materialized views. The migration typically improves compression ratios and query speeds while simplifying the operational architecture.
