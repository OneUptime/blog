# How to Migrate from InfluxDB to ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, InfluxDB, Migration, Database, Time-Series, Metric

Description: Migrate time-series metrics from InfluxDB to ClickHouse by exporting line protocol data, mapping measurements and tags to columns, and rewriting Flux and InfluxQL queries in SQL.

---

InfluxDB was purpose-built for time-series data and works well for small-to-medium monitoring setups. As data volumes grow, InfluxDB's query performance and storage costs become limiting factors. ClickHouse handles time-series workloads with standard SQL, better compression, and faster aggregation queries at scale. This guide covers the full migration from InfluxDB to ClickHouse.

## InfluxDB vs ClickHouse for Time-Series

| Feature | InfluxDB | ClickHouse |
|---------|----------|------------|
| Query language | Flux / InfluxQL | SQL |
| Data model | Measurement + Tags + Fields | Tables with typed columns |
| Retention policies | Per-database | TTL on table |
| Continuous queries | Continuous queries / tasks | Materialized views |
| Downsampling | Tasks with aggregateWindow | Materialized views + TTL |
| Cardinality limit | Practical limit ~10M series | No inherent limit |
| Storage | Custom TSM format | Columnar MergeTree |

## InfluxDB Data Model

InfluxDB organizes data as:
- **Measurement**: equivalent to a table name
- **Tags**: indexed string dimensions (stored as separate series)
- **Fields**: numeric or string values
- **Timestamp**: nanosecond precision

This maps naturally to ClickHouse columns, with tags becoming `LowCardinality(String)` columns and fields becoming typed numeric columns.

## Step 1: Design the ClickHouse Schema

InfluxDB measurement example:

```text
cpu,host=server01,region=us-east usage_idle=98.5,usage_user=1.2 1705312800000000000
cpu,host=server02,region=eu-west usage_idle=95.1,usage_user=4.5 1705312800000000000
```

Equivalent ClickHouse table:

```sql
CREATE TABLE cpu_metrics
(
    ts           DateTime64(9),
    host         LowCardinality(String),
    region       LowCardinality(String),
    usage_idle   Float64,
    usage_user   Float64,
    usage_system Float64  DEFAULT 0,
    usage_iowait Float64  DEFAULT 0
)
ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(ts)
ORDER BY (host, region, ts)
TTL toDateTime(ts) + INTERVAL 30 DAY;
```

For a general-purpose metrics table that can accept any measurement:

```sql
CREATE TABLE metrics
(
    ts          DateTime64(9),
    measurement LowCardinality(String),
    tags        Map(String, String),
    fields      Map(String, Float64)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(ts)
ORDER BY (measurement, ts)
TTL toDateTime(ts) + INTERVAL 90 DAY;
```

## Step 2: Export from InfluxDB

### InfluxDB 1.x - Export with CLI

```bash
influx_inspect export \
  -datadir /var/lib/influxdb/data \
  -waldir  /var/lib/influxdb/wal \
  -out     /tmp/influx_export.gz \
  -database telegraf \
  -compress
```

Gunzip and inspect:

```bash
gunzip -c /tmp/influx_export.gz | head -20
```

### InfluxDB 2.x - Export with CLI

```bash
# Export a bucket to CSV
influx query \
  --org my-org \
  --token my-token \
  'from(bucket:"metrics")
   |> range(start: 2024-01-01T00:00:00Z, stop: 2025-01-01T00:00:00Z)
   |> filter(fn: (r) => r._measurement == "cpu")' \
  --raw > /tmp/cpu_flux.csv
```

Or use the InfluxDB HTTP API:

```bash
curl --request POST "http://localhost:8086/api/v2/query?org=my-org" \
  --header "Authorization: Token my-token" \
  --header "Accept: application/csv" \
  --header "Content-Type: application/vnd.flux" \
  --data 'from(bucket:"metrics") |> range(start: -30d) |> filter(fn: (r) => r._measurement == "cpu")' \
  > /tmp/cpu_export.csv
```

### InfluxDB 1.x HTTP API Export

```bash
# Export via HTTP query API
curl -G "http://localhost:8086/query" \
  --data-urlencode "db=telegraf" \
  --data-urlencode "q=SELECT * FROM cpu WHERE time >= '2024-01-01'" \
  -H "Accept: application/csv" \
  > /tmp/cpu.csv
```

## Step 3: Transform Line Protocol to ClickHouse Format

Write a Python script to convert InfluxDB line protocol to ClickHouse TSV:

```python
# influx_to_clickhouse.py
import sys
import re
from datetime import datetime, timezone

def parse_line_protocol(line: str) -> dict | None:
    """Parse a single InfluxDB line protocol line."""
    line = line.strip()
    if not line or line.startswith("#"):
        return None

    # Split: measurement+tags fields timestamp
    # Format: measurement,tag1=v1,tag2=v2 field1=v1,field2=v2 timestamp
    match = re.match(
        r'^([^,\s]+)(?:,([^ ]+))? ([^ ]+)(?: (\d+))?$',
        line
    )
    if not match:
        return None

    measurement = match.group(1)
    tags_str    = match.group(2) or ""
    fields_str  = match.group(3)
    ts_ns       = int(match.group(4) or "0")

    tags = {}
    for kv in tags_str.split(","):
        if "=" in kv:
            k, v = kv.split("=", 1)
            tags[k] = v

    fields = {}
    for kv in fields_str.split(","):
        if "=" in kv:
            k, v = kv.split("=", 1)
            # Strip type suffix (i for integer, boolean)
            v = v.rstrip("i").strip('"')
            try:
                fields[k] = float(v)
            except ValueError:
                fields[k] = 0.0

    ts_sec = ts_ns / 1_000_000_000
    ts     = datetime.fromtimestamp(ts_sec, tz=timezone.utc)

    return {
        "measurement": measurement,
        "tags":        tags,
        "fields":      fields,
        "ts":          ts.strftime("%Y-%m-%d %H:%M:%S.%f"),
    }

# For cpu measurement specifically
with open("/tmp/influx_export.lp") as infile, \
     open("/tmp/cpu_clickhouse.tsv", "w") as outfile:

    outfile.write("ts\thost\tregion\tusage_idle\tusage_user\n")

    for line in infile:
        parsed = parse_line_protocol(line)
        if not parsed or parsed["measurement"] != "cpu":
            continue

        row = "\t".join([
            parsed["ts"],
            parsed["tags"].get("host",   ""),
            parsed["tags"].get("region", ""),
            str(parsed["fields"].get("usage_idle", 0.0)),
            str(parsed["fields"].get("usage_user", 0.0)),
        ])
        outfile.write(row + "\n")

print("Transform complete")
```

## Step 4: Load into ClickHouse

```bash
clickhouse-client \
  --database metrics \
  --query "INSERT INTO cpu_metrics (ts, host, region, usage_idle, usage_user) FORMAT TSVWithNames" \
  < /tmp/cpu_clickhouse.tsv
```

## Step 5: Rewrite InfluxQL Queries

```sql
-- InfluxQL: basic aggregation
SELECT MEAN(usage_idle), MAX(usage_user)
FROM cpu
WHERE time >= now() - 1h
GROUP BY time(5m), host

-- ClickHouse equivalent
SELECT
    toStartOfFiveMinutes(ts) AS bucket,
    host,
    avg(usage_idle)          AS mean_idle,
    max(usage_user)          AS max_user
FROM cpu_metrics
WHERE ts >= now() - INTERVAL 1 HOUR
GROUP BY bucket, host
ORDER BY bucket;
```

```sql
-- InfluxQL: SELECT with fill(0)
SELECT MEAN(usage_idle) FROM cpu
WHERE time >= now() - 24h
GROUP BY time(1h) fill(0)

-- ClickHouse: use WITH FILL
SELECT
    toStartOfHour(ts) AS hour,
    avg(usage_idle)   AS mean_idle
FROM cpu_metrics
WHERE ts >= now() - INTERVAL 24 HOUR
GROUP BY hour
ORDER BY hour
WITH FILL STEP toIntervalHour(1);
```

```sql
-- InfluxQL: derivative (rate of change)
SELECT DERIVATIVE(MEAN(bytes_sent), 1s) AS bytes_per_sec
FROM net
WHERE time >= now() - 1h
GROUP BY time(10s), host

-- ClickHouse: using window functions
SELECT
    host,
    ts,
    bytes_sent,
    (bytes_sent - lagInFrame(bytes_sent) OVER (PARTITION BY host ORDER BY ts))
    / dateDiff('second', lagInFrame(ts) OVER (PARTITION BY host ORDER BY ts), ts)
    AS bytes_per_sec
FROM net_metrics
WHERE ts >= now() - INTERVAL 1 HOUR
ORDER BY host, ts;
```

## Step 6: Rewrite Flux Queries

```python
# Flux
from(bucket: "metrics")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "cpu" and r._field == "usage_idle")
  |> aggregateWindow(every: 5m, fn: mean)
  |> yield(name: "mean")
```

```sql
-- ClickHouse equivalent
SELECT
    toStartOfFiveMinutes(ts) AS bucket,
    avg(usage_idle)          AS mean
FROM cpu_metrics
WHERE ts >= now() - INTERVAL 1 HOUR
GROUP BY bucket
ORDER BY bucket;
```

```python
# Flux: join two measurements
usage = from(bucket: "metrics")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "cpu")

mem = from(bucket: "metrics")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "mem")

join(tables: {usage: usage, mem: mem}, on: ["host", "_time"])
```

```sql
-- ClickHouse: JOIN
SELECT
    c.ts,
    c.host,
    c.usage_idle,
    m.used_percent AS mem_used_percent
FROM cpu_metrics c
INNER JOIN mem_metrics m ON c.host = m.host AND c.ts = m.ts
WHERE c.ts >= now() - INTERVAL 1 HOUR
ORDER BY c.ts;
```

## Step 7: Recreate Continuous Queries as Materialized Views

InfluxDB continuous queries that downsample data become ClickHouse materialized views:

```sql
-- InfluxDB continuous query
CREATE CONTINUOUS QUERY "cpu_5m" ON "telegraf"
BEGIN
  SELECT MEAN(usage_idle) AS mean_idle, MAX(usage_user) AS max_user
  INTO "telegraf"."one_month"."cpu_5m"
  FROM cpu
  GROUP BY time(5m), host
END;
```

```sql
-- ClickHouse: destination table using AggregatingMergeTree
-- AggregateFunction columns store intermediate states that merge correctly
CREATE TABLE cpu_metrics_5m
(
    bucket    DateTime,
    host      LowCardinality(String),
    mean_idle AggregateFunction(avg, Float64),
    max_user  AggregateFunction(max, Float64),
    cnt       AggregateFunction(count)
)
ENGINE = AggregatingMergeTree()
ORDER BY (host, bucket);

-- ClickHouse: materialized view that feeds the downsampled table
-- Use -State combinators to produce intermediate aggregate states
CREATE MATERIALIZED VIEW cpu_metrics_5m_mv
TO cpu_metrics_5m
AS
SELECT
    toStartOfFiveMinutes(ts) AS bucket,
    host,
    avgState(usage_idle) AS mean_idle,
    maxState(usage_user) AS max_user,
    countState()         AS cnt
FROM cpu_metrics
GROUP BY bucket, host;

-- Query the downsampled table using -Merge combinators
SELECT
    bucket,
    host,
    avgMerge(mean_idle) AS mean_idle,
    maxMerge(max_user)  AS max_user,
    countMerge(cnt)     AS cnt
FROM cpu_metrics_5m
GROUP BY bucket, host
ORDER BY bucket;
```

## Summary

Migrating from InfluxDB to ClickHouse requires mapping InfluxDB's measurement + tags + fields model to typed columns, exporting data via the CLI or HTTP API, transforming line protocol to TSV, and loading with `clickhouse-client`. Rewrite `GROUP BY time()` as `toStartOfHour/Minute`, `DERIVATIVE` as window functions, and continuous queries as materialized views. ClickHouse handles high-cardinality tag combinations and large retention windows with less operational complexity than InfluxDB clusters.
