# How to Install and Configure ClickHouse on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, ClickHouse, Database, Analytics, OLAP

Description: Learn how to install ClickHouse on Ubuntu for high-performance analytical queries, covering installation, configuration, table creation, and data ingestion.

---

ClickHouse is a column-oriented database management system built for OLAP (Online Analytical Processing) workloads. It can process billions of rows per second with sub-second query times, making it the database of choice for analytics, logging, monitoring, and data warehousing scenarios. ClickHouse is used by Cloudflare, Uber, GitLab, and thousands of other organizations to power their analytics backends.

This guide covers installing ClickHouse on Ubuntu, configuring it securely, creating tables with appropriate engines, and loading data.

## Why ClickHouse for Analytics

Traditional OLTP databases like PostgreSQL or MySQL store data row by row, which is efficient for transactional workloads but slow for analytical queries that need to scan millions of rows. ClickHouse stores data column by column, which means:

- Queries that touch only a few columns read far less data
- Column data compresses extremely well (similar values close together)
- Vectorized execution processes data in batches using SIMD instructions
- Each core processes data independently, scaling linearly with CPU count

## Prerequisites

- Ubuntu 22.04 or 24.04
- At least 4 GB RAM (8 GB or more for production)
- Fast storage, ideally NVMe SSD for low latency

## Installing ClickHouse

```bash
# Install prerequisites
sudo apt update && sudo apt install -y apt-transport-https ca-certificates dirmngr curl

# Add ClickHouse repository key
curl -fsSL 'https://packages.clickhouse.com/rpm/lts/repodata/repomd.xml.key' | \
  sudo gpg --dearmor -o /usr/share/keyrings/clickhouse-keyring.gpg

# For .deb systems (Ubuntu/Debian)
ARCH=$(dpkg --print-architecture)
echo "deb [signed-by=/usr/share/keyrings/clickhouse-keyring.gpg arch=${ARCH}] \
  https://packages.clickhouse.com/deb stable main" | \
  sudo tee /etc/apt/sources.list.d/clickhouse.list

sudo apt update

# Install ClickHouse server and client
sudo apt install -y clickhouse-server clickhouse-client
```

During installation, you'll be prompted to set a password for the default user. Set a strong password.

Start and enable ClickHouse:

```bash
sudo systemctl enable clickhouse-server
sudo systemctl start clickhouse-server
sudo systemctl status clickhouse-server
```

## Verifying the Installation

```bash
# Connect to the local server (enter your password when prompted)
clickhouse-client --password

# Test a query
SELECT version(), now();

# Test performance with a simple benchmark
SELECT count() FROM numbers(1000000000);
```

The `numbers()` function is a table function that generates numbers. Counting a billion of them should complete in under 1 second on modern hardware.

## Configuration

ClickHouse's configuration is split between `/etc/clickhouse-server/config.xml` (server settings) and `/etc/clickhouse-server/users.xml` (user settings). Instead of editing these directly, place overrides in the `config.d/` and `users.d/` directories:

```bash
# Create configuration override directory
sudo mkdir -p /etc/clickhouse-server/config.d/

sudo nano /etc/clickhouse-server/config.d/custom.xml
```

```xml
<!-- /etc/clickhouse-server/config.d/custom.xml -->
<clickhouse>
    <!-- Listen on all interfaces -->
    <listen_host>0.0.0.0</listen_host>

    <!-- Data storage path -->
    <path>/var/lib/clickhouse/</path>

    <!-- Temporary files path (for large queries) -->
    <tmp_path>/var/lib/clickhouse/tmp/</tmp_path>

    <!-- Log settings -->
    <logger>
        <level>warning</level>
        <log>/var/log/clickhouse-server/clickhouse-server.log</log>
        <errorlog>/var/log/clickhouse-server/clickhouse-server.err.log</errorlog>
        <size>1000M</size>
        <count>10</count>
    </logger>

    <!-- Maximum concurrent queries -->
    <max_concurrent_queries>100</max_concurrent_queries>

    <!-- Maximum memory usage per query -->
    <max_memory_usage>10000000000</max_memory_usage>

    <!-- Maximum memory usage for all queries combined -->
    <max_memory_usage_for_all_queries>50000000000</max_memory_usage_for_all_queries>

    <!-- Compression for network data -->
    <compression>
        <case>
            <min_part_size>10000000000</min_part_size>
            <min_part_size_ratio>0.01</min_part_size_ratio>
            <method>lz4</method>
        </case>
    </compression>
</clickhouse>
```

Configure user quotas and access:

```bash
sudo nano /etc/clickhouse-server/users.d/custom.xml
```

```xml
<!-- /etc/clickhouse-server/users.d/custom.xml -->
<clickhouse>
    <users>
        <!-- Create a read-only user for analytics -->
        <analytics_ro>
            <password>AnalyticsPassword123!</password>
            <networks>
                <ip>192.168.0.0/16</ip>
                <ip>127.0.0.1</ip>
            </networks>
            <!-- Read-only profile -->
            <profile>readonly</profile>
            <quota>default</quota>
        </analytics_ro>

        <!-- Create an application user with write access -->
        <app_writer>
            <password>WriterPassword123!</password>
            <networks>
                <ip>192.168.1.100</ip>  <!-- Only from your app server -->
            </networks>
            <profile>default</profile>
            <quota>default</quota>
            <!-- Grant access only to specific databases -->
            <allow_databases>
                <database>analytics</database>
                <database>logs</database>
            </allow_databases>
        </app_writer>
    </users>
</clickhouse>
```

Restart ClickHouse after configuration changes:

```bash
sudo systemctl restart clickhouse-server
```

## Creating Tables

ClickHouse has many table engines for different use cases. `MergeTree` and its variants are the most commonly used:

```sql
-- Connect to ClickHouse
clickhouse-client --password

-- Create a database
CREATE DATABASE analytics;

-- Switch to it
USE analytics;

-- Create a web events table using MergeTree
-- MergeTree is the primary engine for analytical data
CREATE TABLE web_events (
    -- Timestamp is typically the partition key
    event_date      Date,
    event_time      DateTime,
    -- User and session identifiers
    user_id         UInt64,
    session_id      String,
    -- Event data
    event_type      LowCardinality(String),  -- LowCardinality is efficient for repeated values
    page_url        String,
    referrer        String,
    -- Device info
    browser         LowCardinality(String),
    os              LowCardinality(String),
    country         LowCardinality(FixedString(2)),
    -- Performance metrics
    load_time_ms    UInt32,
    -- Nullable fields
    user_agent      Nullable(String)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)  -- Partition by month
ORDER BY (event_date, user_id, event_time)  -- Primary key / sort order
TTL event_date + INTERVAL 1 YEAR   -- Automatically delete data older than 1 year
SETTINGS index_granularity = 8192; -- Default granularity
```

For log data with automatic data expiry, use `ReplacingMergeTree` or `TTL`:

```sql
-- Log table with automatic old-data deletion
CREATE TABLE application_logs (
    log_time    DateTime,
    log_date    Date DEFAULT toDate(log_time),
    level       LowCardinality(String),
    service     LowCardinality(String),
    message     String,
    trace_id    String
)
ENGINE = MergeTree()
PARTITION BY log_date
ORDER BY (log_date, service, log_time)
TTL log_date + INTERVAL 30 DAY
SETTINGS index_granularity = 8192;
```

## Inserting Data

```sql
-- Insert individual rows
INSERT INTO analytics.web_events (event_date, event_time, user_id, session_id, event_type, page_url, browser, os, country, load_time_ms)
VALUES (today(), now(), 12345, 'sess_abc123', 'pageview', '/home', 'Chrome', 'Linux', 'US', 250);

-- Insert from a CSV file via the CLI
-- clickhouse-client --password --query="INSERT INTO analytics.web_events FORMAT CSV" < events.csv

-- Insert using HTTP API
curl -X POST 'http://localhost:8123/?query=INSERT+INTO+analytics.web_events+FORMAT+JSONEachRow' \
  --data '{"event_date":"2024-03-02","event_time":"2024-03-02 10:00:00","user_id":12345,"session_id":"sess_xyz","event_type":"click","page_url":"/product","browser":"Firefox","os":"Windows","country":"UK","load_time_ms":180}'
```

## Running Analytical Queries

```sql
-- Page views per day for the last 30 days
SELECT
    event_date,
    count() AS page_views,
    uniq(user_id) AS unique_users
FROM analytics.web_events
WHERE event_date >= today() - 30
  AND event_type = 'pageview'
GROUP BY event_date
ORDER BY event_date;

-- Top 10 pages by views
SELECT
    page_url,
    count() AS views,
    avg(load_time_ms) AS avg_load_ms
FROM analytics.web_events
WHERE event_date = today()
GROUP BY page_url
ORDER BY views DESC
LIMIT 10;

-- Funnel analysis: users who viewed homepage then product page
SELECT
    step,
    uniq(user_id) AS users
FROM (
    SELECT user_id, 1 AS step FROM analytics.web_events WHERE page_url = '/home'
    UNION ALL
    SELECT user_id, 2 AS step FROM analytics.web_events WHERE page_url = '/product'
)
GROUP BY step
ORDER BY step;
```

## Firewall Configuration

```bash
# Allow ClickHouse HTTP port (for HTTP API and GUI tools)
sudo ufw allow from 192.168.1.0/24 to any port 8123 comment "ClickHouse HTTP"

# Allow ClickHouse native port (for clickhouse-client and drivers)
sudo ufw allow from 192.168.1.0/24 to any port 9000 comment "ClickHouse Native"

sudo ufw reload
```

Monitor your ClickHouse cluster's query latency and availability with [OneUptime](https://oneuptime.com) to ensure your analytics infrastructure remains responsive.
