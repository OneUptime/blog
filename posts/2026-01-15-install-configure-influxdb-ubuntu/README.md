# How to Install and Configure InfluxDB on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, InfluxDB, Time Series, Database, Metrics, Tutorial

Description: Complete guide to installing InfluxDB time-series database on Ubuntu for storing metrics, events, and IoT data.

---

InfluxDB is a high-performance time-series database designed for handling high write and query loads. It's ideal for metrics, events, real-time analytics, and IoT data. This guide covers installing InfluxDB 2.x on Ubuntu.

## Features

- Purpose-built for time-series data
- High write throughput
- Compression for efficient storage
- SQL-like query language (Flux)
- Built-in visualization (InfluxDB UI)
- Native HTTP API

## Prerequisites

- Ubuntu 20.04 or later
- At least 2GB RAM
- Root or sudo access

## Installation

### Add InfluxDB Repository

```bash
# Import GPG key
wget -q https://repos.influxdata.com/influxdata-archive_compat.key
echo '393e8779c89ac8d958f81f942f9ad7fb82a25e133faddaf92e15b16e6ac9ce4c influxdata-archive_compat.key' | sha256sum -c && cat influxdata-archive_compat.key | gpg --dearmor | sudo tee /etc/apt/keyrings/influxdata-archive_compat.gpg > /dev/null

# Add repository
echo 'deb [signed-by=/etc/apt/keyrings/influxdata-archive_compat.gpg] https://repos.influxdata.com/debian stable main' | sudo tee /etc/apt/sources.list.d/influxdata.list

# Install InfluxDB
sudo apt update
sudo apt install influxdb2 -y
```

### Start InfluxDB

```bash
# Start and enable service
sudo systemctl start influxdb
sudo systemctl enable influxdb

# Verify status
sudo systemctl status influxdb
```

## Initial Setup

### Web UI Setup

1. Open browser: `http://your_server_ip:8086`
2. Click "Get Started"
3. Create initial user:
   - Username: admin
   - Password: (strong password)
   - Organization: myorg
   - Bucket: mybucket
4. Save the generated API token!

### CLI Setup

```bash
# Interactive setup
influx setup

# Or non-interactive
influx setup \
  --username admin \
  --password YourStrongPassword \
  --org myorg \
  --bucket mybucket \
  --force
```

## Configuration

### Configuration File

```bash
# View current config
influxd print-config

# Create custom config
sudo nano /etc/influxdb/config.toml
```

```toml
# InfluxDB configuration

# Bind address
http-bind-address = ":8086"

# Storage engine
[storage]
  wal-fsync-delay = "0s"

# Query settings
[query]
  memory-bytes = 0
  concurrency = 10

# Logging
[logging]
  level = "info"
  format = "auto"
```

### Apply Configuration

```bash
sudo systemctl restart influxdb
```

## Authentication

### Create API Token

```bash
# List existing tokens
influx auth list

# Create new token with read/write access
influx auth create \
  --org myorg \
  --read-bucket mybucket \
  --write-bucket mybucket \
  --description "Application token"

# Create all-access token
influx auth create \
  --org myorg \
  --all-access \
  --description "Admin token"
```

### Configure CLI Authentication

```bash
# Set up CLI configuration
influx config create \
  --config-name myconfig \
  --host-url http://localhost:8086 \
  --org myorg \
  --token YOUR_API_TOKEN \
  --active
```

## Managing Organizations and Buckets

### Organizations

```bash
# List organizations
influx org list

# Create organization
influx org create --name neworg

# Delete organization
influx org delete --name oldorg
```

### Buckets

```bash
# List buckets
influx bucket list

# Create bucket with retention
influx bucket create \
  --name metrics \
  --org myorg \
  --retention 30d

# Create bucket with no retention (infinite)
influx bucket create \
  --name historical \
  --org myorg \
  --retention 0

# Delete bucket
influx bucket delete --name oldbucket
```

## Writing Data

### Using Line Protocol

```bash
# Write single point
influx write \
  --bucket mybucket \
  --org myorg \
  'cpu,host=server01,region=us-east usage=85.5'

# Write from file
influx write \
  --bucket mybucket \
  --org myorg \
  --file data.lp

# Write with timestamp
influx write \
  --bucket mybucket \
  --org myorg \
  'cpu,host=server01 usage=85.5 1609459200000000000'
```

### Line Protocol Format

```
measurement,tag1=value1,tag2=value2 field1=value1,field2=value2 timestamp
```

Example:

```
temperature,location=office,sensor=dht22 value=23.5,humidity=45.2 1609459200000000000
```

### Using HTTP API

```bash
# Write data via HTTP
curl -X POST "http://localhost:8086/api/v2/write?org=myorg&bucket=mybucket&precision=s" \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: text/plain" \
  --data-binary 'cpu,host=server01 usage=75.5'
```

### Using Python Client

```python
# Install: pip install influxdb-client

from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS

# Connect to InfluxDB
client = InfluxDBClient(
    url="http://localhost:8086",
    token="YOUR_TOKEN",
    org="myorg"
)

# Create write API
write_api = client.write_api(write_options=SYNCHRONOUS)

# Write point using Point class
point = Point("cpu") \
    .tag("host", "server01") \
    .field("usage", 85.5)

write_api.write(bucket="mybucket", record=point)

# Write using line protocol
write_api.write(bucket="mybucket", record="cpu,host=server02 usage=92.3")

# Close client
client.close()
```

## Querying Data

### Using Flux Query Language

```bash
# Query via CLI
influx query 'from(bucket: "mybucket")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "cpu")
  |> mean()'
```

### Flux Query Examples

```flux
// Basic query - get last hour of CPU data
from(bucket: "mybucket")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "cpu")

// Filter by tag
from(bucket: "mybucket")
  |> range(start: -24h)
  |> filter(fn: (r) => r._measurement == "cpu")
  |> filter(fn: (r) => r.host == "server01")

// Aggregate - calculate mean
from(bucket: "mybucket")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "cpu")
  |> mean()

// Window aggregate - 5 minute averages
from(bucket: "mybucket")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "cpu")
  |> aggregateWindow(every: 5m, fn: mean)

// Group by tag
from(bucket: "mybucket")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "cpu")
  |> group(columns: ["host"])
  |> mean()

// Join multiple measurements
cpuData = from(bucket: "mybucket")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "cpu")

memData = from(bucket: "mybucket")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "memory")

join(tables: {cpu: cpuData, mem: memData}, on: ["_time", "host"])
```

### Query via HTTP API

```bash
curl -X POST "http://localhost:8086/api/v2/query?org=myorg" \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/vnd.flux" \
  -H "Accept: application/csv" \
  --data 'from(bucket: "mybucket") |> range(start: -1h) |> filter(fn: (r) => r._measurement == "cpu")'
```

### Query with Python

```python
from influxdb_client import InfluxDBClient

client = InfluxDBClient(
    url="http://localhost:8086",
    token="YOUR_TOKEN",
    org="myorg"
)

query_api = client.query_api()

# Execute query
query = '''
from(bucket: "mybucket")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "cpu")
'''

tables = query_api.query(query)

# Process results
for table in tables:
    for record in table.records:
        print(f"{record.get_time()}: {record.get_value()}")

client.close()
```

## Tasks (Scheduled Queries)

### Create Task

```flux
// In InfluxDB UI or via CLI

option task = {
    name: "Downsample CPU",
    every: 1h,
    offset: 5m
}

from(bucket: "mybucket")
  |> range(start: -task.every)
  |> filter(fn: (r) => r._measurement == "cpu")
  |> aggregateWindow(every: 5m, fn: mean)
  |> to(bucket: "mybucket_downsampled", org: "myorg")
```

### Manage Tasks via CLI

```bash
# List tasks
influx task list

# Create task from file
influx task create --file task.flux

# Run task manually
influx task run --task-id TASK_ID
```

## Alerts and Checks

### Create Check via UI

1. Go to Alerts → Checks
2. Create Threshold Check
3. Configure:
   - Query for data
   - Set threshold conditions
   - Define check interval

### Create Notification Endpoint

1. Go to Alerts → Notification Endpoints
2. Add endpoint (Slack, PagerDuty, HTTP, etc.)
3. Configure endpoint settings

## Backup and Restore

### Backup

```bash
# Backup all data
influx backup /path/to/backup

# Backup specific bucket
influx backup /path/to/backup --bucket mybucket

# Backup with compression
influx backup /path/to/backup --compression gzip
```

### Restore

```bash
# Restore full backup
influx restore /path/to/backup --full

# Restore specific bucket
influx restore /path/to/backup --bucket mybucket
```

## Data Retention

### Set Retention Policy

```bash
# Update bucket retention
influx bucket update \
  --id BUCKET_ID \
  --retention 7d
```

### Downsampling Strategy

```mermaid
graph LR
    A[Raw Data - 1s] --> B[1h Retention]
    B --> C[Task: 1m avg]
    C --> D[30d Retention]
    D --> E[Task: 1h avg]
    E --> F[1y Retention]
```

## Performance Tuning

### Memory Settings

```toml
# /etc/influxdb/config.toml
[storage-engine]
  # Cache settings
  cache-max-memory-size = "1g"
  cache-snapshot-memory-size = "25m"

[query]
  # Query memory limit
  memory-bytes = 0  # 0 = unlimited
```

### Write Optimization

```bash
# Batch writes (recommended)
# Write multiple points at once instead of individual writes
```

## Telegraf Integration

Telegraf is the recommended data collector for InfluxDB:

```bash
# Install Telegraf
sudo apt install telegraf -y

# Configure for InfluxDB 2.x
sudo nano /etc/telegraf/telegraf.conf
```

```toml
[[outputs.influxdb_v2]]
  urls = ["http://localhost:8086"]
  token = "YOUR_TOKEN"
  organization = "myorg"
  bucket = "telegraf"

[[inputs.cpu]]
  percpu = true
  totalcpu = true

[[inputs.mem]]

[[inputs.disk]]
  ignore_fs = ["tmpfs", "devtmpfs"]
```

```bash
# Start Telegraf
sudo systemctl enable telegraf
sudo systemctl start telegraf
```

## Troubleshooting

### Check Logs

```bash
# View service logs
sudo journalctl -u influxdb -f

# Check error logs
sudo tail -f /var/log/influxdb/influxd.log
```

### Common Issues

```bash
# Port already in use
sudo lsof -i :8086

# Permission issues
sudo chown -R influxdb:influxdb /var/lib/influxdb

# Reset admin password
influx user password --name admin

# Check disk usage
du -sh /var/lib/influxdb/
```

### Health Check

```bash
# Check service health
curl http://localhost:8086/health

# Check ready status
curl http://localhost:8086/ready
```

---

InfluxDB excels at time-series data storage with excellent write performance and powerful querying via Flux. Combined with Telegraf for collection and Grafana for visualization, it forms a robust metrics platform. For comprehensive observability including logs and uptime monitoring, consider integrating with OneUptime.
