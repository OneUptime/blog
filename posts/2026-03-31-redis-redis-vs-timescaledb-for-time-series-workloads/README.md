# Redis vs TimescaleDB for Time-Series Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, TimescaleDB, Time-Series, Database, Performance

Description: Compare Redis and TimescaleDB for time-series workloads, covering ingestion speed, query power, retention, and when to choose each tool.

---

## Overview

Time-series data - metrics, sensor readings, financial ticks, and logs - has unique access patterns: high write throughput, time-based queries, and range aggregations. Both Redis and TimescaleDB handle time-series data, but they make very different trade-offs.

## Redis for Time-Series Data

Redis offers two main approaches for time-series: the native `RedisTimeSeries` module (part of Redis Stack) and using sorted sets with timestamps as scores.

### RedisTimeSeries Module

```bash
# Add a data point
TS.ADD temperature:sensor1 * 23.5

# Add with explicit timestamp (Unix milliseconds)
TS.ADD temperature:sensor1 1711900800000 23.5

# Query a range
TS.RANGE temperature:sensor1 1711900800000 1711987200000

# Downsampling with aggregation
TS.RANGE temperature:sensor1 - + AGGREGATION avg 3600000
```

### Sorted Sets as Time-Series

```bash
# Store reading: score=timestamp, member=value
ZADD sensor:readings 1711900800 "23.5"

# Query last 24 hours
ZRANGEBYSCORE sensor:readings 1711814400 1711900800
```

## TimescaleDB for Time-Series Data

TimescaleDB is a PostgreSQL extension that auto-partitions tables by time (hypertables) and adds time-series SQL functions.

```sql
-- Create a hypertable
CREATE TABLE sensor_data (
  time        TIMESTAMPTZ NOT NULL,
  sensor_id   TEXT,
  temperature DOUBLE PRECISION
);

SELECT create_hypertable('sensor_data', 'time');

-- Insert data
INSERT INTO sensor_data VALUES (NOW(), 'sensor1', 23.5);

-- Time-bucket aggregation
SELECT time_bucket('1 hour', time) AS bucket,
       avg(temperature) AS avg_temp
FROM sensor_data
WHERE sensor_id = 'sensor1'
  AND time > NOW() - INTERVAL '24 hours'
GROUP BY bucket
ORDER BY bucket;
```

## Performance Comparison

### Write Throughput

Redis (RedisTimeSeries) can handle hundreds of thousands of writes per second in memory with microsecond latency. TimescaleDB targets tens of thousands of rows per second with compression and disk persistence.

```bash
# Redis benchmark for TS.ADD (requires RedisTimeSeries module loaded)
redis-benchmark -n 100000 -P 16 TS.ADD testkey "*" 23.5
# Approximate: 200k+ ops/sec in-memory

# TimescaleDB typically achieves 50k-150k inserts/sec
# depending on hardware and chunk size
```

### Query Flexibility

TimescaleDB wins for complex analytics. It supports full SQL with JOINs, subqueries, window functions, and continuous aggregates.

```sql
-- Continuous aggregate (materialized in background)
CREATE MATERIALIZED VIEW hourly_avg
WITH (timescaledb.continuous) AS
SELECT time_bucket('1 hour', time) AS bucket,
       sensor_id,
       avg(temperature) AS avg_temp
FROM sensor_data
GROUP BY bucket, sensor_id;

-- Query the pre-computed view instantly
SELECT * FROM hourly_avg
WHERE sensor_id = 'sensor1'
ORDER BY bucket DESC LIMIT 24;
```

Redis time-series queries are simpler - range scans with basic aggregation, no JOINs.

## Data Retention and Compression

TimescaleDB has built-in compression and retention policies:

```sql
-- Enable compression
ALTER TABLE sensor_data SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'sensor_id'
);

-- Add retention policy (drop data older than 90 days)
SELECT add_retention_policy('sensor_data', INTERVAL '90 days');

-- Add compression policy (compress chunks older than 7 days)
SELECT add_compression_policy('sensor_data', INTERVAL '7 days');
```

Redis handles retention via TTL or `COMPACTION` rules in RedisTimeSeries:

```bash
# Create key with retention of 1 day (86400000 ms)
TS.CREATE temperature:sensor1 RETENTION 86400000

# Add compaction rule: average per hour, stored in separate key
TS.CREATERULE temperature:sensor1 temperature:sensor1:hourly \
  AGGREGATION avg 3600000
```

## When to Use Redis

- You need sub-millisecond ingestion latency
- Your dataset fits in memory (or you use Redis on Flash)
- You need real-time dashboards with simple range queries
- You are already using Redis and want to avoid another database
- You need short-term hot data with simple aggregation

## When to Use TimescaleDB

- You need long-term storage (months or years of data)
- You need complex SQL analytics, JOINs with relational data
- Your team knows PostgreSQL and wants familiar tooling
- You need continuous aggregates running in the background
- Data volume exceeds available RAM

## Hybrid Architecture

Many production systems use both: Redis for hot real-time data (last 24 hours) and TimescaleDB for historical storage and complex queries.

```python
import redis
import psycopg2
from datetime import datetime

r = redis.Redis()
pg = psycopg2.connect("dbname=metrics")

def write_metric(sensor_id, value):
    ts = int(datetime.now().timestamp() * 1000)
    # Write to Redis for real-time access
    r.execute_command('TS.ADD', f'sensor:{sensor_id}', ts, value)
    # Also persist to TimescaleDB for long-term storage
    with pg.cursor() as cur:
        cur.execute(
            "INSERT INTO sensor_data (time, sensor_id, temperature) VALUES (%s, %s, %s)",
            (datetime.now(), sensor_id, value)
        )
    pg.commit()
```

## Summary

Redis excels at high-speed ingestion and real-time queries against data that fits in memory, while TimescaleDB provides durable, compressed storage with full SQL analytics for long-term time-series data. For latency-sensitive real-time workloads, Redis wins; for complex historical analysis and cost-efficient long-term retention, TimescaleDB is the better choice. Many production systems use both together.
