# How to Deploy TimescaleDB via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, TimescaleDB, PostgreSQL, Time Series, Metric, IoT

Description: Deploy TimescaleDB as a PostgreSQL-compatible time-series database with automatic data retention and continuous aggregations via Portainer.

## Introduction

TimescaleDB extends PostgreSQL with time-series capabilities - automatic partitioning (hypertables), continuous aggregations, and data retention policies. Because it's built on PostgreSQL, you can use all existing PostgreSQL tools and ORMs. This guide covers deploying TimescaleDB via Portainer.

## Step 1: Deploy TimescaleDB Stack

```yaml
# docker-compose.yml - TimescaleDB

networks:
  timescale_net:
    driver: bridge

volumes:
  timescaledb_data:
  grafana_data:

services:
  # TimescaleDB (PostgreSQL + TimescaleDB extension)
  timescaledb:
    image: timescale/timescaledb:latest-pg15
    container_name: timescaledb
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=metrics
      - POSTGRES_USER=tsadmin
      - POSTGRES_PASSWORD=timescale_secure_password
    volumes:
      - timescaledb_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - timescale_net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U tsadmin -d metrics"]
      interval: 10s
      timeout: 5s
      retries: 5
    command:
      # Performance tuning
      - postgres
      - -c
      - "max_connections=200"
      - -c
      - "shared_buffers=256MB"
      - -c
      - "work_mem=16MB"
      - -c
      - "timescaledb.max_background_workers=8"

  # pgAdmin for management
  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: timescale_pgadmin
    restart: unless-stopped
    ports:
      - "5050:80"
    environment:
      - PGADMIN_DEFAULT_EMAIL=admin@yourdomain.com
      - PGADMIN_DEFAULT_PASSWORD=pgadmin_password
    networks:
      - timescale_net

  # Grafana for visualization
  grafana:
    image: grafana/grafana:latest
    container_name: timescale_grafana
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=grafana_password
      - GF_PLUGINS_PREINSTALL=grafana-clock-panel
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
    networks:
      - timescale_net
    depends_on:
      timescaledb:
        condition: service_healthy
```

## Step 2: Initialize TimescaleDB Schema

```sql
-- init.sql - TimescaleDB initialization

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create application user
CREATE USER appuser WITH PASSWORD 'app_secure_password';
GRANT ALL PRIVILEGES ON DATABASE metrics TO appuser;

-- Create a regular table
CREATE TABLE IF NOT EXISTS sensor_readings (
    time        TIMESTAMPTZ NOT NULL,
    sensor_id   TEXT NOT NULL,
    location    TEXT,
    temperature DOUBLE PRECISION,
    humidity    DOUBLE PRECISION,
    pressure    DOUBLE PRECISION
);

-- Convert to hypertable (time-series optimized)
SELECT create_hypertable('sensor_readings',
    by_range('time', INTERVAL '1 day'),
    if_not_exists => TRUE
);

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_sensor_readings_sensor_id
    ON sensor_readings (sensor_id, time DESC);

-- Add data retention policy (delete data older than 90 days)
SELECT add_retention_policy('sensor_readings',
    INTERVAL '90 days',
    if_not_exists => TRUE
);

-- Create continuous aggregate (pre-computed 1-hour averages)
CREATE MATERIALIZED VIEW IF NOT EXISTS sensor_readings_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    sensor_id,
    location,
    AVG(temperature) AS avg_temp,
    MAX(temperature) AS max_temp,
    MIN(temperature) AS min_temp,
    AVG(humidity) AS avg_humidity,
    COUNT(*) AS readings_count
FROM sensor_readings
GROUP BY bucket, sensor_id, location;

-- Refresh policy for continuous aggregate
SELECT add_continuous_aggregate_policy('sensor_readings_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists => TRUE
);

-- Add retention on the continuous aggregate too
SELECT add_retention_policy('sensor_readings_hourly',
    INTERVAL '1 year',
    if_not_exists => TRUE
);

-- Application metrics table
CREATE TABLE IF NOT EXISTS app_metrics (
    time        TIMESTAMPTZ NOT NULL,
    service     TEXT NOT NULL,
    endpoint    TEXT,
    duration_ms DOUBLE PRECISION,
    status_code INTEGER,
    error       BOOLEAN DEFAULT FALSE
);

SELECT create_hypertable('app_metrics',
    by_range('time', INTERVAL '1 hour'),
    if_not_exists => TRUE
);

-- Index for service queries
CREATE INDEX IF NOT EXISTS idx_app_metrics_service
    ON app_metrics (service, time DESC);

-- Continuous aggregate: 5-minute SLO metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS slo_metrics_5min
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('5 minutes', time) AS bucket,
    service,
    endpoint,
    COUNT(*) AS total_requests,
    COUNT(*) FILTER (WHERE status_code < 500) AS successful_requests,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY duration_ms) AS p50_latency,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95_latency,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms) AS p99_latency
FROM app_metrics
GROUP BY bucket, service, endpoint;

SELECT add_continuous_aggregate_policy('slo_metrics_5min',
    start_offset => INTERVAL '30 minutes',
    end_offset => INTERVAL '5 minutes',
    schedule_interval => INTERVAL '5 minutes'
);

-- Grant table access after schema objects are created
GRANT USAGE ON SCHEMA public TO appuser;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO appuser;
```

## Step 3: Write Data to TimescaleDB

```python
# Python - Insert time-series data
import psycopg2
from datetime import datetime, timezone
import random

conn = psycopg2.connect(
    host="timescaledb",
    port=5432,
    database="metrics",
    user="appuser",
    password="app_secure_password"
)

cursor = conn.cursor()

# Insert sensor reading
cursor.execute("""
    INSERT INTO sensor_readings (time, sensor_id, location, temperature, humidity, pressure)
    VALUES (%s, %s, %s, %s, %s, %s)
""", (
    datetime.now(timezone.utc),
    "sensor-001",
    "server-room-1",
    22.5,
    45.2,
    1013.25
))

# Batch insert for high-throughput scenarios
data = [
    (datetime.now(timezone.utc), f"sensor-{i:03d}", "datacenter",
     20.0 + random.uniform(-2, 2),
     50.0 + random.uniform(-10, 10),
     1013.0 + random.uniform(-5, 5))
    for i in range(100)
]

cursor.executemany("""
    INSERT INTO sensor_readings (time, sensor_id, location, temperature, humidity, pressure)
    VALUES (%s, %s, %s, %s, %s, %s)
""", data)

conn.commit()
```

## Step 4: Query Time-Series Data

```sql
-- Last 1 hour average temperature per sensor
SELECT
    time_bucket('5 minutes', time) AS five_min,
    sensor_id,
    AVG(temperature) AS avg_temp
FROM sensor_readings
WHERE time > NOW() - INTERVAL '1 hour'
GROUP BY five_min, sensor_id
ORDER BY five_min DESC;

-- Query pre-computed aggregates (much faster)
SELECT bucket, sensor_id, avg_temp, max_temp
FROM sensor_readings_hourly
WHERE bucket > NOW() - INTERVAL '24 hours'
ORDER BY bucket DESC;

-- P99 latency over last 24 hours from continuous aggregate
SELECT
    bucket,
    service,
    p99_latency,
    (successful_requests::float / total_requests * 100) AS success_rate
FROM slo_metrics_5min
WHERE bucket > NOW() - INTERVAL '24 hours'
ORDER BY bucket DESC;

-- List chunks older than 7 days before moving them to the columnstore
SELECT show_chunks('sensor_readings', older_than => INTERVAL '7 days');
```

## Step 5: Enable Columnstore Compression

```sql
-- Add columnstore settings to the hypertable
ALTER TABLE sensor_readings SET (
    timescaledb.enable_columnstore,
    timescaledb.segmentby = 'sensor_id',
    timescaledb.orderby = 'time DESC'
);

-- Automatic columnstore policy (move chunks older than 7 days to the columnstore)
CALL add_columnstore_policy('sensor_readings',
    after => INTERVAL '7 days',
    if_not_exists => TRUE
);

-- Check columnstore stats
SELECT * FROM chunk_columnstore_stats('sensor_readings');
```

## Conclusion

TimescaleDB brings time-series capabilities to PostgreSQL without requiring a new database system. Your existing PostgreSQL knowledge, tools, and ORMs work unchanged. Hypertables provide automatic time-based partitioning for query performance, continuous aggregates pre-compute common queries, and columnstore compression dramatically reduces storage for historical data. Portainer manages the entire stack, making it easy to monitor resource usage and update TimescaleDB when new versions are released.
