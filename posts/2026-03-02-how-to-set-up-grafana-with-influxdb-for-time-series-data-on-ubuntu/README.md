# How to Set Up Grafana with InfluxDB for Time-Series Data on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Grafana, InfluxDB, Monitoring, Time Series

Description: Connect Grafana to InfluxDB on Ubuntu to build powerful time-series dashboards, covering data source configuration, Flux queries, and alerting.

---

Grafana and InfluxDB are a classic pairing in the observability stack. InfluxDB stores your metrics and time-series data while Grafana provides the visualization layer. Together they're the backbone of many monitoring setups for infrastructure metrics, application performance data, IoT sensors, and business KPIs.

This guide covers installing both on Ubuntu, connecting them, building your first dashboards, and setting up alerts.

## What You'll Build

By the end of this guide you'll have:
- InfluxDB 2.x storing your time-series data
- Grafana connected to InfluxDB using both InfluxQL and Flux
- A working dashboard showing system metrics
- Configured alerting rules

## Prerequisites

- Ubuntu 22.04 or 24.04
- Root or sudo access
- At least 2 GB RAM (4 GB recommended with both services running)

## Installing InfluxDB

```bash
# Add InfluxData repository
wget -q https://repos.influxdata.com/influxdata-archive_compat.key
echo "393e8779c89ac8d958f81f942f9ad7fb82a25e133faddaf92e15b16e6ac9ce4c influxdata-archive_compat.key" | sha256sum -c
cat influxdata-archive_compat.key | gpg --dearmor | \
  sudo tee /etc/apt/trusted.gpg.d/influxdata-archive_compat.gpg > /dev/null

echo "deb [signed-by=/etc/apt/trusted.gpg.d/influxdata-archive_compat.gpg] \
  https://repos.influxdata.com/debian stable main" | \
  sudo tee /etc/apt/sources.list.d/influxdata.list

sudo apt update && sudo apt install -y influxdb2

# Enable and start InfluxDB
sudo systemctl enable influxdb
sudo systemctl start influxdb
```

Set up InfluxDB:

```bash
influx setup \
  --username admin \
  --password InfluxPass123! \
  --org monitoring \
  --bucket infrastructure \
  --retention 30d \
  --force
```

Create a read-only API token for Grafana:

```bash
# Get the bucket ID first
BUCKET_ID=$(influx bucket list --name infrastructure --json | \
  python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")

# Create a read-only token for Grafana
influx auth create \
  --org monitoring \
  --description "Grafana read-only" \
  --read-bucket "$BUCKET_ID"
```

Save the token that's displayed - you'll need it when configuring the Grafana data source.

## Installing Telegraf for Metric Collection

Telegraf is InfluxData's metrics collection agent. It auto-discovers system metrics and writes them directly to InfluxDB:

```bash
sudo apt install -y telegraf
```

Configure Telegraf to collect system metrics and write to InfluxDB:

```bash
sudo nano /etc/telegraf/telegraf.conf
```

```toml
# /etc/telegraf/telegraf.conf

# Global agent configuration
[agent]
  interval = "10s"          # Collect metrics every 10 seconds
  round_interval = true
  metric_batch_size = 1000
  metric_buffer_limit = 10000
  collection_jitter = "0s"
  flush_interval = "10s"
  flush_jitter = "0s"
  precision = "0s"
  hostname = ""             # Auto-detect hostname
  omit_hostname = false

# Write to InfluxDB 2.x
[[outputs.influxdb_v2]]
  urls = ["http://127.0.0.1:8086"]
  token = "YOUR_WRITE_TOKEN_HERE"  # Replace with your write token
  organization = "monitoring"
  bucket = "infrastructure"

# Collect CPU metrics
[[inputs.cpu]]
  percpu = true
  totalcpu = true
  collect_cpu_time = false
  report_active = false
  core_tags = false

# Collect disk usage
[[inputs.disk]]
  ignore_fs = ["tmpfs", "devtmpfs", "devfs", "iso9660", "overlay", "aufs", "squashfs"]

# Collect disk I/O
[[inputs.diskio]]

# Collect memory metrics
[[inputs.mem]]

# Collect network metrics
[[inputs.net]]
  ignore_protocol_stats = true

# Collect system load
[[inputs.system]]

# Collect kernel metrics
[[inputs.kernel]]

# Collect process counts
[[inputs.processes]]

# Collect swap usage
[[inputs.swap]]
```

```bash
sudo systemctl enable telegraf
sudo systemctl start telegraf
sudo systemctl status telegraf

# Verify data is flowing
influx query '
from(bucket: "infrastructure")
  |> range(start: -5m)
  |> filter(fn: (r) => r._measurement == "cpu")
  |> limit(n: 5)
' --org monitoring
```

## Installing Grafana

```bash
# Add Grafana repository
sudo apt install -y apt-transport-https software-properties-common

wget -q -O - https://apt.grafana.com/gpg.key | \
  sudo gpg --dearmor -o /etc/apt/keyrings/grafana.gpg

echo "deb [signed-by=/etc/apt/keyrings/grafana.gpg] \
  https://apt.grafana.com stable main" | \
  sudo tee /etc/apt/sources.list.d/grafana.list

sudo apt update
sudo apt install -y grafana

# Enable and start Grafana
sudo systemctl enable grafana-server
sudo systemctl start grafana-server
sudo systemctl status grafana-server
```

Grafana listens on port 3000. Access it at `http://your-server:3000`. Default login is `admin`/`admin` - you'll be prompted to change the password on first login.

## Configuring the InfluxDB Data Source

In the Grafana UI:

1. Go to **Configuration** (gear icon) > **Data Sources**
2. Click **Add data source**
3. Select **InfluxDB**

Configure the data source:

- **Query Language**: Flux (for InfluxDB 2.x) or InfluxQL
- **URL**: `http://localhost:8086`
- **Organization**: `monitoring`
- **Token**: (the read-only Grafana token you created earlier)
- **Default Bucket**: `infrastructure`

Click **Save & Test** - you should see "datasource is working. 3 buckets found."

## Building a Dashboard

### Manually Creating a Panel

1. Click **+** > **New Dashboard** > **Add new panel**
2. In the query editor, select your InfluxDB data source
3. Enter a Flux query:

```flux
from(bucket: "infrastructure")
  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)
  |> filter(fn: (r) => r._measurement == "cpu")
  |> filter(fn: (r) => r._field == "usage_user")
  |> filter(fn: (r) => r.cpu == "cpu-total")
  |> aggregateWindow(every: v.windowPeriod, fn: mean, createEmpty: false)
  |> yield(name: "mean")
```

4. Set the panel title to "CPU Usage"
5. Set the visualization type to "Time series"
6. Set the Y-axis unit to "Percent (0-100)"
7. Click **Apply**

### Importing a Community Dashboard

Grafana's dashboard library has pre-built dashboards for Telegraf:

1. Go to **+** > **Import**
2. Enter dashboard ID `928` (Telegraf system dashboard)
3. Select your InfluxDB data source
4. Click **Import**

This gives you a complete system metrics dashboard immediately.

## Writing Useful Flux Queries

```flux
// Memory usage percentage
from(bucket: "infrastructure")
  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)
  |> filter(fn: (r) => r._measurement == "mem")
  |> filter(fn: (r) => r._field == "used_percent")
  |> aggregateWindow(every: v.windowPeriod, fn: mean, createEmpty: false)

// Disk I/O - reads and writes in a single panel
from(bucket: "infrastructure")
  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)
  |> filter(fn: (r) => r._measurement == "diskio")
  |> filter(fn: (r) => r._field == "read_bytes" or r._field == "write_bytes")
  |> derivative(unit: 1s, nonNegative: true)
  |> aggregateWindow(every: v.windowPeriod, fn: mean, createEmpty: false)

// Network throughput
from(bucket: "infrastructure")
  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)
  |> filter(fn: (r) => r._measurement == "net")
  |> filter(fn: (r) => r._field == "bytes_recv" or r._field == "bytes_sent")
  |> derivative(unit: 1s, nonNegative: true)
  |> aggregateWindow(every: v.windowPeriod, fn: mean, createEmpty: false)
```

## Setting Up Alerts

In Grafana 10+, alerts are configured in **Alerting** > **Alert rules**:

1. Click **Alerting** > **Alert rules** > **New alert rule**
2. Set the query (same Flux syntax as panels)
3. Set condition: "IS ABOVE 90" for a CPU threshold alert
4. Set evaluation interval: Every 1 minute, for 5 minutes
5. Configure notification channels:
   - Email (configure SMTP in Grafana settings)
   - Slack (webhook URL)
   - PagerDuty

Configure SMTP in `/etc/grafana/grafana.ini`:

```ini
[smtp]
enabled = true
host = smtp.example.com:587
user = grafana@example.com
password = smtp_password
from_address = grafana@example.com
from_name = Grafana
```

For end-to-end monitoring of your Grafana and InfluxDB instances themselves, use [OneUptime](https://oneuptime.com) - it monitors your monitoring stack to ensure you're notified when your observability infrastructure goes down.
