# How to Install and Configure TimescaleDB on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, TimescaleDB, PostgreSQL, Time Series, Database

Description: Install and configure TimescaleDB on Ubuntu, a PostgreSQL extension for time-series data that adds automatic partitioning, compression, and continuous aggregates.

---

TimescaleDB is a PostgreSQL extension that transforms Postgres into a high-performance time-series database. Unlike standalone time-series databases, TimescaleDB gives you the best of both worlds: the full SQL capabilities, transactions, and ecosystem of PostgreSQL plus time-series specific features like automatic partitioning (hypertables), native compression, and continuous aggregates.

If your team already knows SQL and uses PostgreSQL, TimescaleDB is often the lowest-friction path to handling time-series data at scale.

## What TimescaleDB Adds to PostgreSQL

- **Hypertables**: Tables that automatically partition data by time into "chunks". Queries only touch relevant partitions.
- **Native compression**: Compress old data with columnar storage (typically 90%+ compression ratio).
- **Continuous aggregates**: Materialized views that automatically update as new data arrives.
- **Data retention policies**: Automatically drop old data chunks.
- **Hyperfunctions**: SQL functions designed for time-series analysis (time_bucket, first, last, etc.).

## Prerequisites

- Ubuntu 22.04 or 24.04
- PostgreSQL 15 or 16 (TimescaleDB works as an extension)

## Installing PostgreSQL

```bash
# Add PostgreSQL repository for the latest version
sudo apt install -y gnupg2 curl

curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | \
  sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg

echo "deb [signed-by=/etc/apt/trusted.gpg.d/postgresql.gpg] \
  https://apt.postgresql.org/pub/repos/apt \
  $(lsb_release -cs)-pgdg main" | \
  sudo tee /etc/apt/sources.list.d/pgdg.list

sudo apt update
sudo apt install -y postgresql-16 postgresql-client-16
```

## Installing TimescaleDB

```bash
# Add TimescaleDB repository
echo "deb https://packagecloud.io/timescale/timescaledb/ubuntu/ \
  $(lsb_release -cs) main" | \
  sudo tee /etc/apt/sources.list.d/timescaledb.list

curl -fsSL https://packagecloud.io/timescale/timescaledb/gpgkey | \
  sudo gpg --dearmor -o /usr/share/keyrings/timescaledb-archive-keyring.gpg

# Update the list entry to use the keyring
echo "deb [signed-by=/usr/share/keyrings/timescaledb-archive-keyring.gpg] \
  https://packagecloud.io/timescale/timescaledb/ubuntu/ \
  $(lsb_release -cs) main" | \
  sudo tee /etc/apt/sources.list.d/timescaledb.list

sudo apt update

# Install TimescaleDB for PostgreSQL 16
sudo apt install -y timescaledb-2-postgresql-16
```

## Running the TimescaleDB Tune Script

TimescaleDB ships a tuning script that adjusts PostgreSQL settings for time-series workloads:

```bash
sudo timescaledb-tune --quiet --yes

# This modifies /etc/postgresql/16/main/postgresql.conf
# It optimizes settings like:
# - shared_buffers (typically 25% of RAM)
# - effective_cache_size
# - work_mem
# - max_worker_processes
# - timescaledb.max_background_workers
```

Restart PostgreSQL to apply changes:

```bash
sudo systemctl restart postgresql
```

## Enabling the Extension

```bash
# Connect as the postgres superuser
sudo -u postgres psql

# Create a database for your application
CREATE DATABASE metrics;
\c metrics

# Enable TimescaleDB
CREATE EXTENSION IF NOT EXISTS timescaledb;

# Verify the installation
\dx timescaledb
```

## Creating Hypertables

A hypertable is a regular PostgreSQL table that TimescaleDB automatically partitions by time:

```sql
-- Connect to your database
\c metrics

-- Create a table for server metrics (looks like a normal PostgreSQL table)
CREATE TABLE server_metrics (
    time        TIMESTAMPTZ NOT NULL,
    host        TEXT NOT NULL,
    region      TEXT,
    cpu_percent DOUBLE PRECISION,
    mem_used_gb DOUBLE PRECISION,
    disk_iops   BIGINT,
    net_rx_mb   DOUBLE PRECISION,
    net_tx_mb   DOUBLE PRECISION
);

-- Convert it to a hypertable, partitioned by time with 7-day chunks
SELECT create_hypertable('server_metrics', by_range('time', INTERVAL '7 days'));

-- Create indexes for common query patterns
CREATE INDEX idx_server_metrics_host ON server_metrics (host, time DESC);
CREATE INDEX idx_server_metrics_region ON server_metrics (region, time DESC);
```

## Inserting Time-Series Data

```sql
-- Insert individual rows (normal PostgreSQL syntax)
INSERT INTO server_metrics (time, host, region, cpu_percent, mem_used_gb, disk_iops, net_rx_mb, net_tx_mb)
VALUES
    (NOW(), 'web01', 'us-east', 45.2, 6.8, 1200, 12.5, 8.3),
    (NOW(), 'web02', 'us-east', 62.1, 7.2, 980, 15.1, 9.7),
    (NOW(), 'db01', 'us-east', 28.4, 14.6, 8500, 5.2, 4.1);

-- Insert historical data (TimescaleDB handles old data in the right partition)
INSERT INTO server_metrics
SELECT
    NOW() - (s * INTERVAL '1 minute'),  -- One record per minute going back
    'web01',
    'us-east',
    30 + random() * 40,  -- CPU between 30-70%
    5 + random() * 5,    -- Memory 5-10 GB
    500 + (random() * 2000)::BIGINT,
    10 + random() * 20,
    8 + random() * 15
FROM generate_series(1, 10080) s;  -- 7 days worth of minutes
```

## Querying with TimescaleDB Functions

```sql
-- Average CPU per hour over the last 24 hours
SELECT
    time_bucket('1 hour', time) AS bucket,
    host,
    AVG(cpu_percent) AS avg_cpu,
    MAX(cpu_percent) AS max_cpu,
    MIN(cpu_percent) AS min_cpu
FROM server_metrics
WHERE time > NOW() - INTERVAL '24 hours'
GROUP BY bucket, host
ORDER BY bucket DESC, host;

-- Hourly summary using time_bucket with gap filling
SELECT
    time_bucket_gapfill('1 hour', time, NOW() - INTERVAL '24 hours', NOW()) AS bucket,
    host,
    AVG(cpu_percent) AS avg_cpu
FROM server_metrics
WHERE time > NOW() - INTERVAL '24 hours'
  AND host = 'web01'
GROUP BY bucket, host
ORDER BY bucket;

-- Rate of change (derivative)
SELECT
    time,
    host,
    cpu_percent,
    cpu_percent - LAG(cpu_percent) OVER (PARTITION BY host ORDER BY time) AS cpu_delta
FROM server_metrics
WHERE time > NOW() - INTERVAL '1 hour'
  AND host = 'web01'
ORDER BY time;
```

## Setting Up Continuous Aggregates

Continuous aggregates are materialized views that automatically refresh as new data arrives - no need to run expensive aggregations on raw data at query time:

```sql
-- Create a continuous aggregate for hourly summaries
CREATE MATERIALIZED VIEW server_metrics_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    host,
    region,
    AVG(cpu_percent) AS avg_cpu,
    MAX(cpu_percent) AS max_cpu,
    AVG(mem_used_gb) AS avg_mem_gb,
    SUM(net_rx_mb + net_tx_mb) AS total_network_mb
FROM server_metrics
GROUP BY bucket, host, region
WITH NO DATA;  -- Don't populate immediately

-- Add a refresh policy to keep it up to date
SELECT add_continuous_aggregate_policy('server_metrics_hourly',
    start_offset => INTERVAL '3 hours',  -- Backfill up to 3 hours ago
    end_offset => INTERVAL '1 hour',     -- Leave the most recent hour for accumulation
    schedule_interval => INTERVAL '1 hour'  -- Refresh every hour
);

-- Query the aggregate (much faster than querying raw data)
SELECT * FROM server_metrics_hourly
WHERE bucket > NOW() - INTERVAL '7 days'
  AND host = 'web01'
ORDER BY bucket DESC
LIMIT 168;  -- 7 days of hourly data
```

## Data Retention Policies

```sql
-- Automatically drop data older than 90 days
SELECT add_retention_policy('server_metrics', INTERVAL '90 days');

-- Keep the hourly aggregate for 2 years
SELECT add_retention_policy('server_metrics_hourly', INTERVAL '730 days');

-- List existing policies
SELECT * FROM timescaledb_information.jobs WHERE proc_name = 'policy_retention';
```

## Native Compression

```sql
-- Enable compression on the hypertable (compress after 30 days)
ALTER TABLE server_metrics SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'host, region',  -- Compress separately per host/region
    timescaledb.compress_orderby = 'time DESC'
);

-- Add a policy to automatically compress chunks older than 30 days
SELECT add_compression_policy('server_metrics', INTERVAL '30 days');

-- Check compression ratio
SELECT
    hypertable_name,
    pg_size_pretty(before_compression_total_bytes) AS before,
    pg_size_pretty(after_compression_total_bytes) AS after,
    ROUND(100.0 * after_compression_total_bytes / before_compression_total_bytes, 1) AS ratio_pct
FROM chunk_compression_stats('server_metrics');
```

Monitor TimescaleDB query performance and database availability with [OneUptime](https://oneuptime.com) to ensure your time-series data platform stays healthy.
