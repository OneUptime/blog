# How to Run TimescaleDB in Docker with Hypertables

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, TimescaleDB, Databases, Time-Series, DevOps, PostgreSQL

Description: A practical guide to running TimescaleDB in Docker containers with hypertable configuration for time-series data workloads

---

TimescaleDB extends PostgreSQL with automatic partitioning and time-series optimizations. Running it inside Docker lets you spin up a production-grade time-series database in minutes, without installing PostgreSQL extensions manually or fighting dependency issues on your host machine.

This guide walks through the full setup, from pulling the image to creating hypertables and running queries against time-series data.

## Why TimescaleDB?

Traditional relational databases struggle with high-ingest time-series workloads. TimescaleDB solves this by automatically partitioning data into "chunks" based on time intervals. You still get full SQL support, JOINs, and everything PostgreSQL offers, but writes and time-range queries become dramatically faster.

For monitoring, IoT, financial data, or any workload where rows arrive with timestamps, TimescaleDB is a strong choice.

## Quick Start with Docker

Pull the official TimescaleDB image, which ships as a PostgreSQL extension already enabled.

```bash
# Pull the latest TimescaleDB image (based on PostgreSQL 16)
docker pull timescale/timescaledb:latest-pg16
```

Run a single TimescaleDB container with persistent storage.

```bash
# Start TimescaleDB with a named volume for data persistence
docker run -d \
  --name timescaledb \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=mysecretpassword \
  -e POSTGRES_DB=tsdb \
  -v timescaledb_data:/var/lib/postgresql/data \
  timescale/timescaledb:latest-pg16
```

Verify the container is running.

```bash
# Check container status
docker ps --filter name=timescaledb
```

## Docker Compose Setup

For a more reproducible setup, use Docker Compose. This configuration includes health checks and resource limits.

```yaml
# docker-compose.yml
version: "3.8"

services:
  timescaledb:
    image: timescale/timescaledb:latest-pg16
    container_name: timescaledb
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: tsdb
      POSTGRES_USER: tsadmin
      POSTGRES_PASSWORD: strongpassword123
      # Preload the TimescaleDB extension on startup
      TIMESCALEDB_TELEMETRY: "off"
    volumes:
      - timescaledb_data:/var/lib/postgresql/data
      # Mount a custom init script to run on first boot
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U tsadmin -d tsdb"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: "2.0"

volumes:
  timescaledb_data:
    driver: local
```

Start the stack with a single command.

```bash
# Launch TimescaleDB in the background
docker compose up -d
```

## Creating Your First Hypertable

Connect to the running database.

```bash
# Open a psql session inside the container
docker exec -it timescaledb psql -U tsadmin -d tsdb
```

First, enable the TimescaleDB extension if it is not already loaded.

```sql
-- Enable the extension (idempotent, safe to run multiple times)
CREATE EXTENSION IF NOT EXISTS timescaledb;
```

Create a regular table, then convert it into a hypertable. TimescaleDB will handle the partitioning automatically.

```sql
-- Create a standard table for sensor readings
CREATE TABLE sensor_data (
    time        TIMESTAMPTZ NOT NULL,
    sensor_id   INTEGER NOT NULL,
    temperature DOUBLE PRECISION,
    humidity    DOUBLE PRECISION,
    location    TEXT
);

-- Convert to a hypertable, partitioned on the 'time' column
-- chunk_time_interval sets how wide each partition is (7 days here)
SELECT create_hypertable('sensor_data', 'time',
    chunk_time_interval => INTERVAL '7 days'
);
```

The `chunk_time_interval` parameter controls partition size. For high-ingest workloads, smaller chunks (1 day) work well. For lower-volume data, weekly or monthly chunks reduce overhead.

## Inserting Time-Series Data

Insert some sample data to test the setup.

```sql
-- Insert sample sensor readings
INSERT INTO sensor_data (time, sensor_id, temperature, humidity, location)
VALUES
    (NOW() - INTERVAL '2 hours', 1, 22.5, 45.0, 'warehouse-a'),
    (NOW() - INTERVAL '1 hour', 1, 23.1, 44.2, 'warehouse-a'),
    (NOW(), 1, 23.8, 43.5, 'warehouse-a'),
    (NOW() - INTERVAL '2 hours', 2, 19.0, 60.1, 'warehouse-b'),
    (NOW() - INTERVAL '1 hour', 2, 19.5, 59.8, 'warehouse-b'),
    (NOW(), 2, 20.1, 58.5, 'warehouse-b');
```

## Querying with Time-Series Functions

TimescaleDB ships with built-in functions for time-series analysis. The `time_bucket` function groups data into fixed intervals.

```sql
-- Get average temperature per sensor, bucketed into 1-hour windows
SELECT
    time_bucket('1 hour', time) AS bucket,
    sensor_id,
    AVG(temperature) AS avg_temp,
    AVG(humidity) AS avg_humidity
FROM sensor_data
WHERE time > NOW() - INTERVAL '24 hours'
GROUP BY bucket, sensor_id
ORDER BY bucket DESC;
```

For continuous aggregates (materialized views that update automatically), define them like this.

```sql
-- Create a continuous aggregate for hourly averages
CREATE MATERIALIZED VIEW sensor_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    sensor_id,
    AVG(temperature) AS avg_temp,
    MAX(temperature) AS max_temp,
    MIN(temperature) AS min_temp
FROM sensor_data
GROUP BY bucket, sensor_id;

-- Set up a refresh policy to keep the view updated
SELECT add_continuous_aggregate_policy('sensor_hourly',
    start_offset    => INTERVAL '3 hours',
    end_offset      => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour'
);
```

## Data Retention Policies

Time-series data often has a shelf life. TimescaleDB can automatically drop old chunks.

```sql
-- Automatically drop data older than 90 days
SELECT add_retention_policy('sensor_data', INTERVAL '90 days');

-- Verify the policy was created
SELECT * FROM timescaledb_information.jobs
WHERE proc_name = 'policy_retention';
```

## Compression

TimescaleDB supports native compression that can reduce storage by 90% or more.

```sql
-- Enable compression on the hypertable
ALTER TABLE sensor_data SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'sensor_id',
    timescaledb.compress_orderby = 'time DESC'
);

-- Add a policy to compress chunks older than 7 days
SELECT add_compression_policy('sensor_data', INTERVAL '7 days');
```

## Performance Tuning

Adjust PostgreSQL and TimescaleDB settings for better performance. Create a custom configuration file.

```ini
# custom-timescaledb.conf
# Memory settings - adjust based on available RAM
shared_buffers = 512MB
effective_cache_size = 1536MB
work_mem = 16MB
maintenance_work_mem = 256MB

# Write-ahead log settings for time-series ingest
wal_level = replica
max_wal_size = 2GB
min_wal_size = 512MB

# TimescaleDB-specific tuning
timescaledb.max_background_workers = 8
```

Mount this config in your Docker Compose file.

```yaml
# Add to the timescaledb service volumes
volumes:
  - timescaledb_data:/var/lib/postgresql/data
  - ./custom-timescaledb.conf:/etc/postgresql/conf.d/custom.conf
```

## Monitoring TimescaleDB in Docker

Check hypertable statistics to understand your data distribution.

```sql
-- View chunk information for your hypertable
SELECT * FROM timescaledb_information.chunks
WHERE hypertable_name = 'sensor_data'
ORDER BY range_start DESC;

-- Check overall hypertable size
SELECT hypertable_detailed_size('sensor_data');
```

Monitor container resource usage from the host.

```bash
# Watch real-time resource consumption
docker stats timescaledb --no-stream
```

## Backup and Restore

Use `pg_dump` for logical backups directly from the container.

```bash
# Create a full backup of the tsdb database
docker exec timescaledb pg_dump -U tsadmin -Fc tsdb > tsdb_backup.dump

# Restore to a new container
docker exec -i timescaledb_new pg_restore -U tsadmin -d tsdb < tsdb_backup.dump
```

## Connecting Applications

Most PostgreSQL client libraries work with TimescaleDB without changes. Here is a Python example.

```python
# pip install psycopg2-binary
import psycopg2
from datetime import datetime

conn = psycopg2.connect(
    host="localhost",
    port=5432,
    database="tsdb",
    user="tsadmin",
    password="strongpassword123"
)

cursor = conn.cursor()
cursor.execute("""
    INSERT INTO sensor_data (time, sensor_id, temperature, humidity, location)
    VALUES (%s, %s, %s, %s, %s)
""", (datetime.now(), 3, 21.5, 50.0, "warehouse-c"))

conn.commit()
cursor.close()
conn.close()
```

## Summary

TimescaleDB in Docker gives you a fully-featured time-series database with minimal setup. The key steps are: pull the image, create your tables, convert them to hypertables with `create_hypertable()`, and set up retention and compression policies. For production workloads, tune the PostgreSQL settings, enable persistent volumes, and monitor chunk sizes over time. The combination of Docker's portability and TimescaleDB's automatic partitioning makes this a practical choice for any time-series project.
