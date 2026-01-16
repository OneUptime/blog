# How to Install and Configure ClickHouse on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, ClickHouse, Analytics, Database, OLAP, Tutorial

Description: Complete guide to installing ClickHouse column-oriented database on Ubuntu for real-time analytics and big data.

---

ClickHouse is an open-source column-oriented database management system designed for online analytical processing (OLAP). It delivers exceptional query performance for analytical workloads, processing billions of rows per second. This guide covers installation and configuration on Ubuntu.

## Features

- Column-oriented storage
- Real-time query processing
- Linear scalability
- SQL support with extensions
- Data compression
- Distributed query execution

## Prerequisites

- Ubuntu 20.04 or later
- At least 4GB RAM
- SSD storage recommended
- Root or sudo access

## Installation

### Add ClickHouse Repository

```bash
# Install prerequisites
sudo apt update
sudo apt install -y apt-transport-https ca-certificates curl gnupg

# Add ClickHouse GPG key
curl -fsSL https://packages.clickhouse.com/rpm/lts/repodata/repomd.xml.key | sudo gpg --dearmor -o /usr/share/keyrings/clickhouse-keyring.gpg

# Add repository
echo "deb [signed-by=/usr/share/keyrings/clickhouse-keyring.gpg] https://packages.clickhouse.com/deb stable main" | sudo tee /etc/apt/sources.list.d/clickhouse.list

# Install ClickHouse
sudo apt update
sudo apt install -y clickhouse-server clickhouse-client
```

### Start ClickHouse

```bash
# Start and enable service
sudo systemctl start clickhouse-server
sudo systemctl enable clickhouse-server

# Check status
sudo systemctl status clickhouse-server
```

### Initial Configuration

During installation, you'll be prompted to set a default password. If not:

```bash
# Set password for default user
sudo nano /etc/clickhouse-server/users.d/default-password.xml
```

```xml
<clickhouse>
    <users>
        <default>
            <password>your_strong_password</password>
        </default>
    </users>
</clickhouse>
```

## Connect to ClickHouse

### Using CLI Client

```bash
# Connect locally
clickhouse-client

# Connect with password
clickhouse-client --password

# Connect to remote server
clickhouse-client --host 192.168.1.100 --port 9000 --user default --password

# Execute query directly
clickhouse-client -q "SELECT 1"
```

### Using HTTP Interface

```bash
# Query via HTTP
curl 'http://localhost:8123/?query=SELECT%201'

# With authentication
curl 'http://localhost:8123/?query=SELECT%201' --user 'default:password'

# POST query
curl 'http://localhost:8123/' --data 'SELECT version()'
```

## Configuration

### Main Configuration

```bash
sudo nano /etc/clickhouse-server/config.xml
```

Key settings:

```xml
<clickhouse>
    <!-- Network settings -->
    <http_port>8123</http_port>
    <tcp_port>9000</tcp_port>
    <listen_host>0.0.0.0</listen_host>  <!-- Allow remote connections -->

    <!-- Data paths -->
    <path>/var/lib/clickhouse/</path>
    <tmp_path>/var/lib/clickhouse/tmp/</tmp_path>
    <user_files_path>/var/lib/clickhouse/user_files/</user_files_path>

    <!-- Logging -->
    <logger>
        <level>information</level>
        <log>/var/log/clickhouse-server/clickhouse-server.log</log>
        <errorlog>/var/log/clickhouse-server/clickhouse-server.err.log</errorlog>
        <size>1000M</size>
        <count>10</count>
    </logger>

    <!-- Memory limits -->
    <max_memory_usage>10000000000</max_memory_usage>  <!-- 10GB -->
    <max_memory_usage_for_all_queries>20000000000</max_memory_usage_for_all_queries>

    <!-- Query settings -->
    <max_concurrent_queries>100</max_concurrent_queries>
</clickhouse>
```

### Users Configuration

```bash
sudo nano /etc/clickhouse-server/users.xml
```

```xml
<clickhouse>
    <users>
        <default>
            <password_sha256_hex>...</password_sha256_hex>
            <networks>
                <ip>::/0</ip>
            </networks>
            <profile>default</profile>
            <quota>default</quota>
        </default>

        <!-- Create admin user -->
        <admin>
            <password_sha256_hex>...</password_sha256_hex>
            <networks>
                <ip>::/0</ip>
            </networks>
            <profile>default</profile>
            <quota>default</quota>
            <access_management>1</access_management>
        </admin>
    </users>

    <!-- Profiles -->
    <profiles>
        <default>
            <max_memory_usage>10000000000</max_memory_usage>
            <max_execution_time>300</max_execution_time>
        </default>
        <readonly>
            <readonly>1</readonly>
        </readonly>
    </profiles>

    <!-- Quotas -->
    <quotas>
        <default>
            <interval>
                <duration>3600</duration>
                <queries>0</queries>
                <errors>0</errors>
                <result_rows>0</result_rows>
                <read_rows>0</read_rows>
                <execution_time>0</execution_time>
            </interval>
        </default>
    </quotas>
</clickhouse>
```

### Generate Password Hash

```bash
# Generate SHA256 hash for password
echo -n 'your_password' | sha256sum | tr -d ' -'
```

## Database and Table Management

### Create Database

```sql
-- Create database
CREATE DATABASE mydb;

-- Create database with engine
CREATE DATABASE mydb ENGINE = Atomic;

-- Use database
USE mydb;

-- Show databases
SHOW DATABASES;

-- Drop database
DROP DATABASE mydb;
```

### Create Tables

```sql
-- Simple table with MergeTree engine
CREATE TABLE events (
    event_date Date,
    event_time DateTime,
    user_id UInt64,
    event_type String,
    value Float64
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_date, user_id)
SETTINGS index_granularity = 8192;

-- Table with primary key
CREATE TABLE users (
    user_id UInt64,
    username String,
    email String,
    created_at DateTime DEFAULT now()
) ENGINE = MergeTree()
ORDER BY user_id;

-- ReplacingMergeTree for updates
CREATE TABLE user_sessions (
    user_id UInt64,
    session_id String,
    last_activity DateTime,
    version UInt64
) ENGINE = ReplacingMergeTree(version)
ORDER BY (user_id, session_id);

-- SummingMergeTree for aggregation
CREATE TABLE daily_stats (
    date Date,
    category String,
    views UInt64,
    clicks UInt64
) ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, category);
```

### Table Engines

```sql
-- MergeTree family (most common)
-- MergeTree, ReplacingMergeTree, SummingMergeTree
-- AggregatingMergeTree, CollapsingMergeTree, VersionedCollapsingMergeTree

-- Log family (for temporary data)
-- Log, StripeLog, TinyLog

-- Integration engines
-- Kafka, MySQL, PostgreSQL, S3, HDFS

-- Special engines
-- Memory, Null, Buffer, Distributed
```

## Data Types

```sql
-- Integer types
-- Int8, Int16, Int32, Int64
-- UInt8, UInt16, UInt32, UInt64

-- Float types
-- Float32, Float64

-- String types
-- String, FixedString(N)

-- Date/Time types
-- Date, DateTime, DateTime64

-- Other types
-- UUID, Enum8, Enum16
-- Array(T), Tuple(T1, T2, ...)
-- Nullable(T)
-- LowCardinality(T)

-- Example with various types
CREATE TABLE example_types (
    id UInt64,
    name String,
    tags Array(String),
    status Enum8('active' = 1, 'inactive' = 2),
    metadata Tuple(key String, value String),
    score Nullable(Float64),
    category LowCardinality(String)
) ENGINE = MergeTree()
ORDER BY id;
```

## Insert Data

```sql
-- Single insert
INSERT INTO events VALUES
    ('2024-01-15', '2024-01-15 10:30:00', 1, 'click', 1.5);

-- Multiple rows
INSERT INTO events VALUES
    ('2024-01-15', '2024-01-15 10:30:00', 1, 'click', 1.5),
    ('2024-01-15', '2024-01-15 10:31:00', 2, 'view', 2.0),
    ('2024-01-15', '2024-01-15 10:32:00', 1, 'purchase', 99.99);

-- Insert from SELECT
INSERT INTO events_archive
SELECT * FROM events
WHERE event_date < '2024-01-01';

-- Insert from file (CSV)
cat data.csv | clickhouse-client --query "INSERT INTO events FORMAT CSV"

-- Insert JSON
echo '{"user_id": 1, "event_type": "click"}' | \
    clickhouse-client --query "INSERT INTO events FORMAT JSONEachRow"
```

## Query Data

### Basic Queries

```sql
-- Select all
SELECT * FROM events LIMIT 10;

-- Count rows
SELECT count() FROM events;

-- Filter
SELECT * FROM events
WHERE event_date = '2024-01-15'
  AND user_id = 1;

-- Aggregation
SELECT
    event_type,
    count() AS cnt,
    avg(value) AS avg_value
FROM events
GROUP BY event_type
ORDER BY cnt DESC;
```

### Advanced Queries

```sql
-- Window functions
SELECT
    user_id,
    event_time,
    value,
    sum(value) OVER (PARTITION BY user_id ORDER BY event_time) AS running_total
FROM events;

-- Array functions
SELECT
    user_id,
    groupArray(event_type) AS event_types,
    arrayDistinct(groupArray(event_type)) AS unique_events
FROM events
GROUP BY user_id;

-- Date functions
SELECT
    toDate(event_time) AS date,
    toHour(event_time) AS hour,
    count() AS events
FROM events
GROUP BY date, hour
ORDER BY date, hour;

-- Subqueries
SELECT *
FROM events
WHERE user_id IN (
    SELECT user_id
    FROM users
    WHERE created_at > '2024-01-01'
);

-- JOIN
SELECT
    e.event_type,
    u.username,
    count() AS cnt
FROM events e
JOIN users u ON e.user_id = u.user_id
GROUP BY e.event_type, u.username;
```

### Query Optimization

```sql
-- Explain query
EXPLAIN SELECT * FROM events WHERE user_id = 1;

-- Explain with analysis
EXPLAIN PIPELINE SELECT * FROM events WHERE user_id = 1;

-- Use PREWHERE for filtering
SELECT * FROM events
PREWHERE event_date = '2024-01-15'
WHERE user_id = 1;

-- Use FINAL for ReplacingMergeTree
SELECT * FROM user_sessions FINAL
WHERE user_id = 1;
```

## Materialized Views

```sql
-- Create materialized view for aggregations
CREATE MATERIALIZED VIEW daily_event_stats
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, event_type)
AS SELECT
    toDate(event_time) AS date,
    event_type,
    count() AS event_count,
    sum(value) AS total_value
FROM events
GROUP BY date, event_type;

-- Data is automatically aggregated when inserted to source table

-- Query materialized view
SELECT * FROM daily_event_stats
WHERE date >= '2024-01-01';
```

## Distributed Setup

### Configure Cluster

```xml
<!-- /etc/clickhouse-server/config.d/clusters.xml -->
<clickhouse>
    <remote_servers>
        <my_cluster>
            <shard>
                <replica>
                    <host>node1.example.com</host>
                    <port>9000</port>
                </replica>
                <replica>
                    <host>node2.example.com</host>
                    <port>9000</port>
                </replica>
            </shard>
            <shard>
                <replica>
                    <host>node3.example.com</host>
                    <port>9000</port>
                </replica>
                <replica>
                    <host>node4.example.com</host>
                    <port>9000</port>
                </replica>
            </shard>
        </my_cluster>
    </remote_servers>
</clickhouse>
```

### Distributed Tables

```sql
-- Create local table on each node
CREATE TABLE events_local (
    event_date Date,
    user_id UInt64,
    event_type String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_date, user_id);

-- Create distributed table
CREATE TABLE events_distributed AS events_local
ENGINE = Distributed(my_cluster, default, events_local, rand());

-- Query distributed table
SELECT count() FROM events_distributed;
```

## Backup and Restore

### Using clickhouse-backup

```bash
# Install clickhouse-backup
wget https://github.com/AlexAkulov/clickhouse-backup/releases/download/v2.4.0/clickhouse-backup_2.4.0_amd64.deb
sudo dpkg -i clickhouse-backup_2.4.0_amd64.deb

# Configure
sudo nano /etc/clickhouse-backup/config.yml
```

```yaml
general:
  remote_storage: s3
  backups_to_keep_local: 3
  backups_to_keep_remote: 10

clickhouse:
  username: default
  password: your_password
  host: localhost
  port: 9000

s3:
  access_key: YOUR_ACCESS_KEY
  secret_key: YOUR_SECRET_KEY
  bucket: clickhouse-backups
  region: us-east-1
```

```bash
# Create backup
clickhouse-backup create

# Upload to remote
clickhouse-backup upload backup_name

# Restore
clickhouse-backup restore backup_name
```

## Performance Tuning

### Memory Settings

```xml
<!-- /etc/clickhouse-server/config.d/memory.xml -->
<clickhouse>
    <max_memory_usage>10000000000</max_memory_usage>
    <max_memory_usage_for_user>5000000000</max_memory_usage_for_user>
    <max_bytes_before_external_group_by>2000000000</max_bytes_before_external_group_by>
    <max_bytes_before_external_sort>2000000000</max_bytes_before_external_sort>
</clickhouse>
```

### Query Settings

```sql
-- Set for session
SET max_threads = 8;
SET max_memory_usage = 10000000000;

-- Per-query settings
SELECT * FROM events
SETTINGS max_threads = 4, max_execution_time = 60;
```

## Troubleshooting

### Check Logs

```bash
# Server log
sudo tail -f /var/log/clickhouse-server/clickhouse-server.log

# Error log
sudo tail -f /var/log/clickhouse-server/clickhouse-server.err.log
```

### System Tables

```sql
-- Current queries
SELECT * FROM system.processes;

-- Query log
SELECT * FROM system.query_log
ORDER BY event_time DESC
LIMIT 10;

-- Parts info
SELECT * FROM system.parts
WHERE table = 'events';

-- Metrics
SELECT * FROM system.metrics;

-- Async metrics
SELECT * FROM system.asynchronous_metrics;
```

### Common Issues

```bash
# Out of memory
# Reduce max_memory_usage or add more RAM

# Slow queries
# Check EXPLAIN output
# Add appropriate indexes
# Use PREWHERE

# Too many parts
OPTIMIZE TABLE events FINAL;
```

---

ClickHouse excels at analytical workloads with its columnar storage and vectorized query execution. It's ideal for log analytics, time-series data, and real-time dashboards. For comprehensive monitoring of your ClickHouse cluster, consider integrating with OneUptime for alerts and performance tracking.
