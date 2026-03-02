# How to Install and Configure InfluxDB on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, InfluxDB, Time Series, Monitoring, Database

Description: Install and configure InfluxDB 2.x on Ubuntu for time-series data storage, covering setup, authentication, organizations, buckets, and writing data with the CLI and HTTP API.

---

InfluxDB is a purpose-built time-series database designed for high write and query loads on timestamped data. It's the go-to choice for storing metrics, events, and IoT sensor data because it handles millions of data points per second and makes time-based queries fast and simple. InfluxDB 2.x introduced a unified platform combining the database, UI, and Flux query language in a single binary.

## What InfluxDB is Good For

- Infrastructure metrics (CPU, memory, disk I/O, network throughput)
- Application performance metrics (request latency, error rates, throughput)
- IoT sensor data (temperature, humidity, pressure readings)
- Financial tick data
- Any data where the timestamp is the primary dimension

## Prerequisites

- Ubuntu 22.04 or 24.04
- At least 2 GB RAM (4 GB recommended for production)
- Adequate disk space (time-series data grows fast - plan for your retention needs)

## Installing InfluxDB 2.x

```bash
# Download the InfluxDB signing key
wget -q https://repos.influxdata.com/influxdata-archive_compat.key

# Verify the key fingerprint (optional but recommended)
echo "393e8779c89ac8d958f81f942f9ad7fb82a25e133faddaf92e15b16e6ac9ce4c influxdata-archive_compat.key" | sha256sum -c

# Install the key
cat influxdata-archive_compat.key | gpg --dearmor | \
  sudo tee /etc/apt/trusted.gpg.d/influxdata-archive_compat.gpg > /dev/null

# Add the InfluxDB repository
echo "deb [signed-by=/etc/apt/trusted.gpg.d/influxdata-archive_compat.gpg] \
  https://repos.influxdata.com/debian stable main" | \
  sudo tee /etc/apt/sources.list.d/influxdata.list

# Install InfluxDB
sudo apt update && sudo apt install -y influxdb2

# Enable and start the service
sudo systemctl enable influxdb
sudo systemctl start influxdb
sudo systemctl status influxdb
```

## Initial Setup

InfluxDB needs initialization before you can use it. You can do this via the web UI or CLI:

### Option A: Web UI Setup

Open `http://your-server:8086` in a browser. The setup wizard walks you through:
1. Creating the initial admin user
2. Setting the organization name (e.g., "mycompany")
3. Creating the initial bucket (data storage unit)
4. Choosing the default retention period

### Option B: CLI Setup

```bash
# Run the setup command
influx setup \
  --username admin \
  --password YourSecurePassword123! \
  --org mycompany \
  --bucket myapp-metrics \
  --retention 30d \
  --force

# This creates a config profile in ~/.influxdbv2/configs
# Verify the setup
influx config list
```

## Understanding InfluxDB 2.x Concepts

**Organization**: A workspace that contains buckets, users, and dashboards. Think of it as a tenant.

**Bucket**: Where time-series data is stored, with an associated retention policy. Equivalent to a database + retention policy in InfluxDB 1.x.

**Measurement**: The "table" equivalent. Organizes related data points.

**Tags**: Indexed metadata (string key-value pairs). Use for fields you filter on frequently.

**Fields**: The actual measured values (integers, floats, strings, booleans). Not indexed.

**Point**: A single data record consisting of measurement name, tags, fields, and timestamp.

## Configuration File

```bash
# InfluxDB configuration is in /etc/influxdb/config.toml
sudo nano /etc/influxdb/config.toml
```

Key settings:

```toml
# /etc/influxdb/config.toml

[meta]
  # Metadata storage path
  dir = "/var/lib/influxdb/meta"

[storage]
  # Data storage path
  dir = "/var/lib/influxdb/data"

[http]
  # Bind address
  bind-address = ":8086"
  # Set to https://your-domain.com if behind a proxy
  # http-bind-address = ":8086"

[tls]
  # Uncomment to enable TLS directly on InfluxDB
  # cert = "/etc/ssl/influxdb/cert.pem"
  # key = "/etc/ssl/influxdb/key.pem"

[log]
  level = "info"

[query]
  # Concurrency limit for queries
  max-concurrent-queries = 20
  # Memory limit per query (0 = unlimited)
  max-select-bucket-count = 20
```

## Creating Organizations and Buckets

```bash
# List existing organizations
influx org list

# Create a new organization
influx org create --name "engineering-team"

# Create a bucket with 7-day retention in an organization
influx bucket create \
  --name "server-metrics" \
  --org mycompany \
  --retention 7d

# Create a bucket with infinite retention (for long-term data)
influx bucket create \
  --name "business-metrics" \
  --org mycompany \
  --retention 0

# List buckets
influx bucket list --org mycompany
```

## Writing Data

### Using the CLI

```bash
# Write a single data point
influx write \
  --org mycompany \
  --bucket server-metrics \
  --precision s \
  "cpu_usage,host=web01,region=us-east usage_user=45.2,usage_system=12.1 $(date +%s)"

# Write multiple points from a file
cat > /tmp/metrics.lp << 'EOF'
# Line Protocol format: measurement,tags field_key=value timestamp
cpu_usage,host=web01,region=us-east usage_user=45.2,usage_system=12.1
cpu_usage,host=web02,region=us-east usage_user=60.5,usage_system=15.3
memory_used,host=web01 bytes=3221225472i
memory_used,host=web02 bytes=2684354560i
EOF

influx write \
  --org mycompany \
  --bucket server-metrics \
  --file /tmp/metrics.lp
```

### Using the HTTP API

```bash
# Get your API token
influx auth list

# Write using curl
curl -s --request POST \
  "http://localhost:8086/api/v2/write?org=mycompany&bucket=server-metrics&precision=s" \
  --header "Authorization: Token YOUR_API_TOKEN" \
  --header "Content-Type: text/plain; charset=utf-8" \
  --data-raw "cpu_usage,host=web01 usage_user=45.2,usage_system=12.1 $(date +%s)"
```

## Querying with Flux

Flux is InfluxDB 2.x's functional query language:

```flux
// Get CPU usage for the last hour
from(bucket: "server-metrics")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "cpu_usage")
  |> filter(fn: (r) => r.host == "web01")
  |> mean()

// Get the average CPU usage per host over the last 24 hours, grouped into 5-minute windows
from(bucket: "server-metrics")
  |> range(start: -24h)
  |> filter(fn: (r) => r._measurement == "cpu_usage")
  |> filter(fn: (r) => r._field == "usage_user")
  |> aggregateWindow(every: 5m, fn: mean, createEmpty: false)
  |> group(columns: ["host"])
```

Run Flux queries from the CLI:

```bash
influx query '
from(bucket: "server-metrics")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "cpu_usage")
  |> last()
' --org mycompany
```

## Setting Up Token-Based Access Control

```bash
# Create a read-only token for a specific bucket
influx auth create \
  --org mycompany \
  --read-buckets \
  --description "Read-only token for dashboard"

# Create a write-only token for a specific bucket
BUCKET_ID=$(influx bucket list --name server-metrics --json | \
  python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")

influx auth create \
  --org mycompany \
  --write-bucket "$BUCKET_ID" \
  --description "Write token for metrics agent"
```

## Automated Backup

```bash
# Backup all InfluxDB data and metadata
influx backup /var/backups/influxdb/$(date +%Y%m%d) \
  --host http://localhost:8086 \
  --token YOUR_ADMIN_TOKEN

# Restore from backup
influx restore /var/backups/influxdb/20240302 \
  --host http://localhost:8086 \
  --token YOUR_ADMIN_TOKEN
```

Add to cron for daily backups:

```bash
sudo crontab -e
# 0 2 * * * influx backup /var/backups/influxdb/$(date +\%Y\%m\%d) --host http://localhost:8086 --token YOUR_TOKEN
```

Monitor your InfluxDB instance's availability and query performance with [OneUptime](https://oneuptime.com) to ensure your metrics platform stays online.
