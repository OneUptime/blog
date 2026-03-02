# How to Install and Configure QuestDB on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, QuestDB, Time Series, Database, Analytics

Description: Learn how to install and configure QuestDB on Ubuntu for high-performance time-series data storage, covering setup, the web console, ingestion protocols, and SQL queries.

---

QuestDB is an open-source time-series database designed for extremely high ingestion rates with minimal resources. It can ingest millions of rows per second on modest hardware and queries that data with SQL - no proprietary query language to learn. QuestDB stores data in columnar format with custom time-series optimizations, making time-range queries fast even against billions of rows.

It's a good choice when you need something faster and lighter than InfluxDB but prefer SQL over Flux, or when you want a simpler operational footprint than TimescaleDB's PostgreSQL dependency.

## Prerequisites

- Ubuntu 22.04 or 24.04
- Java 11+ (QuestDB is a Java application, though the query engine is native)
- At least 2 GB RAM
- Root or sudo access

## Installing Java

```bash
sudo apt update
sudo apt install -y openjdk-17-jdk-headless

# Verify the installation
java -version
```

## Installing QuestDB

QuestDB ships as a single JAR file, which makes installation simple:

```bash
# Create a directory for QuestDB
sudo mkdir -p /opt/questdb/data
sudo mkdir -p /opt/questdb/conf

# Create a dedicated user
sudo useradd -r -m -d /opt/questdb -s /bin/false questdb
sudo chown -R questdb:questdb /opt/questdb

# Download the latest QuestDB release
cd /tmp
QDB_VERSION=$(curl -s https://api.github.com/repos/questdb/questdb/releases/latest | \
  grep '"tag_name"' | sed 's/.*"v\([^"]*\)".*/\1/')
wget "https://github.com/questdb/questdb/releases/download/${QDB_VERSION}/questdb-${QDB_VERSION}-rt-linux-amd64.tar.gz"

# Extract and move to the installation directory
tar xzf "questdb-${QDB_VERSION}-rt-linux-amd64.tar.gz"
sudo cp -r "questdb-${QDB_VERSION}-rt-linux-amd64/"* /opt/questdb/
sudo chown -R questdb:questdb /opt/questdb
```

## Creating the systemd Service

```bash
sudo nano /etc/systemd/system/questdb.service
```

```ini
[Unit]
Description=QuestDB Time Series Database
After=network.target
Documentation=https://questdb.io/docs/

[Service]
Type=simple
User=questdb
Group=questdb
WorkingDirectory=/opt/questdb

# Start QuestDB with custom data directory
ExecStart=/opt/questdb/bin/questdb.sh start -d /opt/questdb/data

# Or use the JAR directly
# ExecStart=/usr/bin/java \
#     -Xmx4g \
#     -Xms4g \
#     -p /opt/questdb/data \
#     -jar /opt/questdb/questdb.jar

# Restart on failure
Restart=on-failure
RestartSec=10

# Resource limits
LimitNOFILE=1024000

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable questdb
sudo systemctl start questdb
sudo systemctl status questdb
```

## QuestDB Ports

QuestDB listens on multiple ports:
- **9000**: HTTP REST API and Web Console (browser-based SQL editor)
- **9009**: InfluxDB Line Protocol (ILP) - high-speed ingestion
- **8812**: PostgreSQL wire protocol - connect with any PostgreSQL client

## Accessing the Web Console

Open `http://your-server:9000` in a browser. The QuestDB Web Console includes:
- A SQL editor with autocomplete
- Schema browser (tables and columns)
- Visualization of query results as charts
- Import tool for CSV files

Since port 9000 has no authentication by default, configure a firewall rule to restrict access:

```bash
# Allow the web console only from your office IP
sudo ufw allow from YOUR_IP to any port 9000 comment "QuestDB Web Console"

# Allow ILP ingestion from your metrics agents
sudo ufw allow from 192.168.1.0/24 to any port 9009 comment "QuestDB ILP"

# Allow PostgreSQL protocol from app servers
sudo ufw allow from 192.168.1.100 to any port 8812 comment "QuestDB PG Wire"

sudo ufw reload
```

## Configuration

QuestDB's configuration file is at `/opt/questdb/data/conf/server.conf`:

```bash
sudo nano /opt/questdb/data/conf/server.conf
```

```properties
# /opt/questdb/data/conf/server.conf

# HTTP port for REST API and web console
http.port=9000
# Bind only to specific interface
http.bind.to=0.0.0.0:9000

# ILP (InfluxDB Line Protocol) port
line.tcp.net.bind.to=0.0.0.0:9009

# PostgreSQL wire protocol port
pg.net.bind.to=0.0.0.0:8812

# PostgreSQL authentication
pg.user=admin
pg.password=QuestDBPass123!

# Enable HTTP authentication
# http.user=admin
# http.password=QuestDBPass123!

# Data root directory
cairo.root=/opt/questdb/data/db

# Maximum number of open files
cairo.max.uncommitted.rows=500000

# WAL enabled (for durability)
cairo.wal.enabled=true

# Commit lag - wait this long before committing to storage
# Higher values = better write throughput, lower = better durability
cairo.commit.lag=10000

# O3 (out-of-order) ingestion settings
cairo.o3.max.lag=300000
```

Restart QuestDB after configuration changes:

```bash
sudo systemctl restart questdb
```

## Creating Tables

QuestDB uses standard SQL with time-series extensions:

```sql
-- Connect via the web console at http://your-server:9000
-- Or via psql: psql -h localhost -p 8812 -U admin

-- Create a table for server metrics
-- TIMESTAMP() designates the time column (required for time-series features)
CREATE TABLE server_metrics (
    ts          TIMESTAMP,
    host        SYMBOL CAPACITY 100 CACHE,  -- SYMBOL is like a dictionary-encoded string
    region      SYMBOL CAPACITY 10 CACHE,
    cpu_pct     FLOAT,
    mem_mb      LONG,
    disk_read   LONG,
    disk_write  LONG
) TIMESTAMP(ts)
PARTITION BY DAY  -- Partition by day (can also be HOUR, WEEK, MONTH, YEAR)
WAL;              -- Write-Ahead Log for durability
```

```sql
-- Create a table for application events
CREATE TABLE app_events (
    ts          TIMESTAMP,
    service     SYMBOL CAPACITY 50 CACHE,
    endpoint    STRING,
    status_code SHORT,
    latency_ms  INT,
    user_id     LONG,
    trace_id    STRING
) TIMESTAMP(ts)
PARTITION BY HOUR
WAL;
```

## Ingesting Data via InfluxDB Line Protocol

The ILP protocol is the fastest way to ingest data into QuestDB:

```bash
# Send a metric using nc (netcat)
echo "server_metrics,host=web01,region=us-east cpu_pct=45.2,mem_mb=6800,disk_read=1200,disk_write=800 $(date +%s%N)" | \
  nc -q 1 localhost 9009

# Send multiple metrics in one batch
cat << 'EOF' | nc -q 1 localhost 9009
server_metrics,host=web01,region=us-east cpu_pct=45.2,mem_mb=6800
server_metrics,host=web02,region=us-east cpu_pct=62.1,mem_mb=7200
server_metrics,host=db01,region=us-east cpu_pct=28.4,mem_mb=14900
EOF
```

## Ingesting Data via REST API

```bash
# Insert a row via the HTTP API
curl -G 'http://localhost:9000/exec' \
  --data-urlencode "query=INSERT INTO server_metrics VALUES (now(), 'web01', 'us-east', 45.2, 6800, 1200, 800)"

# Run a SELECT query
curl -G 'http://localhost:9000/exec' \
  --data-urlencode "query=SELECT * FROM server_metrics LIMIT 10"

# Import CSV data
curl -F 'data=@/path/to/metrics.csv' 'http://localhost:9000/imp?name=server_metrics'
```

## Querying Time-Series Data

```sql
-- Get metrics from the last 24 hours
SELECT * FROM server_metrics
WHERE ts > dateadd('d', -1, now())
ORDER BY ts DESC
LIMIT 100;

-- Average CPU per host per hour
SELECT
    hour(ts) AS hour,
    host,
    avg(cpu_pct) AS avg_cpu,
    max(cpu_pct) AS max_cpu
FROM server_metrics
WHERE ts > dateadd('d', -1, now())
SAMPLE BY 1h ALIGN TO CALENDAR  -- SAMPLE BY = time bucket aggregation
ORDER BY hour, host;

-- Latest value per host (using LATEST ON)
SELECT * FROM server_metrics
LATEST ON ts PARTITION BY host;

-- This returns the most recent row for each distinct host value
-- This is one of QuestDB's special time-series operators
```

## Connecting with psql

Since QuestDB speaks the PostgreSQL wire protocol, you can use `psql`:

```bash
# Install psql client if needed
sudo apt install -y postgresql-client

# Connect to QuestDB
psql -h localhost -p 8812 -U admin -d qdb

# Run standard SQL
\dt          -- List tables
\d server_metrics  -- Describe table structure
SELECT count() FROM server_metrics;
```

Monitor your QuestDB instance's health with [OneUptime](https://oneuptime.com). The HTTP API endpoint at `/exec?query=SELECT 1` can serve as a simple health check for uptime monitoring.
