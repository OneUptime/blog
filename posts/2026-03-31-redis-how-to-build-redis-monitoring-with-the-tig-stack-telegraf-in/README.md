# How to Build Redis Monitoring with the TIG Stack

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Telegraf, InfluxDB, Grafana, TIG Stack, Monitoring

Description: Set up Redis monitoring using the TIG stack - Telegraf for collection, InfluxDB for storage, and Grafana for dashboards and alerts.

---

## What Is the TIG Stack

The TIG stack is an alternative to Prometheus for metrics collection and visualization:

- **Telegraf** - collects metrics from Redis (and hundreds of other sources) via plugins
- **InfluxDB** - stores time-series metrics with SQL-like query language (Flux/InfluxQL)
- **Grafana** - visualizes metrics and sends alerts

The TIG stack is often simpler to configure than Prometheus for straightforward monitoring use cases.

## Step 1: Install InfluxDB

```bash
# Ubuntu/Debian
wget -q https://repos.influxdata.com/influxdata-archive_compat.key
cat influxdata-archive_compat.key | gpg --dearmor | sudo tee /etc/apt/trusted.gpg.d/influxdata-archive_compat.gpg > /dev/null
echo 'deb [signed-by=/etc/apt/trusted.gpg.d/influxdata-archive_compat.gpg] https://repos.influxdata.com/debian stable main' | sudo tee /etc/apt/sources.list.d/influxdata.list
sudo apt-get update && sudo apt-get install influxdb2

sudo systemctl enable --now influxdb
```

Configure InfluxDB:

```bash
# Set up via CLI
influx setup \
  --username admin \
  --password yourpassword \
  --org myorg \
  --bucket redis_metrics \
  --retention 30d \
  --force

# Get your API token
influx auth list
```

## Step 2: Install and Configure Telegraf

```bash
sudo apt-get install telegraf
```

Create the Telegraf config for Redis:

```toml
# /etc/telegraf/telegraf.conf

[global_tags]
  environment = "production"

[agent]
  interval = "10s"
  round_interval = true
  metric_batch_size = 1000
  metric_buffer_limit = 10000
  flush_interval = "10s"

# Output to InfluxDB v2
[[outputs.influxdb_v2]]
  urls = ["http://localhost:8086"]
  token = "your-influxdb-token-here"
  organization = "myorg"
  bucket = "redis_metrics"

# Redis input plugin
[[inputs.redis]]
  servers = ["tcp://localhost:6379"]
  # Uncomment if password is set
  # password = "yourredispassword"
```

Start Telegraf:

```bash
sudo systemctl enable --now telegraf

# Test the config
telegraf --config /etc/telegraf/telegraf.conf --test
```

## Step 3: Verify Data in InfluxDB

```bash
# Query Redis metrics using InfluxDB CLI
influx query '
from(bucket: "redis_metrics")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "redis")
  |> filter(fn: (r) => r._field == "connected_clients")
  |> last()
'
```

Check what fields are available:

```bash
influx query '
from(bucket: "redis_metrics")
  |> range(start: -10m)
  |> filter(fn: (r) => r._measurement == "redis")
  |> keep(columns: ["_field"])
  |> distinct(column: "_field")
'
```

## Step 4: Install Grafana

```bash
sudo apt-get install grafana
sudo systemctl enable --now grafana-server
```

Add InfluxDB as a data source via Grafana UI:
1. Go to Configuration - Data Sources
2. Click Add data source
3. Select InfluxDB
4. Set URL to `http://localhost:8086`
5. Set Query language to Flux
6. Add your org, token, and default bucket

## Step 5: Create Grafana Dashboard

Key Flux queries for Redis panels:

```flux
// Connected clients over time
from(bucket: "redis_metrics")
  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)
  |> filter(fn: (r) => r._measurement == "redis")
  |> filter(fn: (r) => r._field == "connected_clients")
  |> aggregateWindow(every: v.windowPeriod, fn: mean)
```

```flux
// Memory usage percentage
from(bucket: "redis_metrics")
  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)
  |> filter(fn: (r) => r._measurement == "redis")
  |> filter(fn: (r) => r._field == "used_memory" or r._field == "maxmemory")
  |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> map(fn: (r) => ({r with _value: float(v: r.used_memory) / float(v: r.maxmemory) * 100.0}))
```

```flux
// Cache hit rate
from(bucket: "redis_metrics")
  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)
  |> filter(fn: (r) => r._measurement == "redis")
  |> filter(fn: (r) => r._field == "keyspace_hits" or r._field == "keyspace_misses")
  |> derivative(unit: 1s, nonNegative: true)
  |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> map(fn: (r) => ({
      r with
      _value: r.keyspace_hits / (r.keyspace_hits + r.keyspace_misses) * 100.0
    }))
```

```flux
// Commands per second
from(bucket: "redis_metrics")
  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)
  |> filter(fn: (r) => r._measurement == "redis")
  |> filter(fn: (r) => r._field == "total_commands_processed")
  |> derivative(unit: 1s, nonNegative: true)
  |> aggregateWindow(every: v.windowPeriod, fn: mean)
```

## Step 6: Configure Grafana Alerts

In Grafana (v8+), create alert rules directly in the dashboard:

```text
Alert: Redis High Memory
- Query: used_memory / maxmemory * 100
- Condition: IS ABOVE 85
- For: 5m
- Notify: slack-channel
```

Or via Grafana Alert Rules UI:
1. Go to Alerting - Alert Rules
2. Create new rule
3. Define the Flux query
4. Set threshold and evaluation interval
5. Add notification channel (Slack, email, PagerDuty)

## Telegraf Redis Plugin Fields Reference

```text
# Key fields collected by the Redis Telegraf plugin:
connected_clients        - active client connections
used_memory             - bytes used by Redis
used_memory_rss         - bytes from OS perspective
keyspace_hits           - successful key lookups
keyspace_misses         - failed key lookups
evicted_keys            - keys removed due to memory limits
expired_keys            - keys that expired
total_commands_processed - cumulative commands executed
master_repl_offset      - replication stream offset
rdb_last_bgsave_status  - last RDB save result
aof_last_bgrewrite_status - last AOF rewrite result
```

## Summary

The TIG stack provides a turnkey Redis monitoring solution where Telegraf's Redis plugin automatically collects all key metrics without any exporter configuration. InfluxDB stores the time-series data with automatic retention policies, and Grafana provides rich dashboards with built-in alerting. Compared to the Prometheus stack, TIG requires less configuration for single-server Redis monitoring and provides a simpler Flux query language for transforming time-series data.
