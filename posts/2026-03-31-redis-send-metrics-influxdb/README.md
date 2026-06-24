# How to Send Redis Metrics to InfluxDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, InfluxDB, Metric, Monitoring, Telegraf

Description: Learn how to send Redis metrics to InfluxDB using Telegraf - covering plugin configuration, key metrics, retention policies, and building queries for Redis monitoring.

---

InfluxDB is a time-series database that pairs naturally with Redis metrics collection. Telegraf's Redis input plugin collects metrics from the Redis INFO command and sends them to InfluxDB with minimal configuration.

## Install Telegraf

```bash
# Ubuntu/Debian
wget -q https://repos.influxdata.com/influxdata-archive_compat.key
echo '393e8779c89ac8d958f81f942f9ad7fb82a25e133faddaf92e15b16e6ac9ce4c influxdata-archive_compat.key' | sha256sum -c && cat influxdata-archive_compat.key | gpg --dearmor | sudo tee /etc/apt/trusted.gpg.d/influxdata-archive_compat.gpg > /dev/null
echo 'deb [signed-by=/etc/apt/trusted.gpg.d/influxdata-archive_compat.gpg] https://repos.influxdata.com/debian stable main' | sudo tee /etc/apt/sources.list.d/influxdata.list
sudo apt-get update && sudo apt-get install telegraf
```

## Configure the Redis Input Plugin

```toml
# /etc/telegraf/telegraf.d/redis.conf

[[inputs.redis]]
  servers = ["tcp://localhost:6379"]
  # servers = ["tcp://:password@localhost:6379"]

  # Collect keyspace metrics per database
  # fieldinclude = ["keyspace_hits", "keyspace_misses", "connected_clients",
  #                  "used_memory", "evicted_keys", "rejected_connections"]
```

## Configure the InfluxDB Output

```toml
# /etc/telegraf/telegraf.conf (output section)

[[outputs.influxdb_v2]]
  urls = ["http://influxdb:8086"]
  token = "your-influx-token"
  organization = "myorg"
  bucket = "redis-metrics"
```

Start Telegraf:

```bash
systemctl enable telegraf
systemctl start telegraf
```

## Verify Metrics Are Arriving

In InfluxDB, query to confirm data is flowing:

```sql
from(bucket: "redis-metrics")
  |> range(start: -10m)
  |> filter(fn: (r) => r._measurement == "redis")
  |> limit(n: 10)
```

## Key Redis Metrics in InfluxDB

Telegraf collects these fields under the `redis` measurement:

```text
Field                      | Description
---------------------------|---------------------------
used_memory                | Bytes used by Redis data
connected_clients          | Active client connections
keyspace_hits              | Total cache hits
keyspace_misses            | Total cache misses
evicted_keys               | Keys evicted by maxmemory policy
instantaneous_ops_per_sec  | Current commands/sec
rdb_last_bgsave_status     | Last RDB save result (ok/err)
repl_backlog_size          | Replication backlog bytes
```

## Build Useful InfluxDB Queries

Cache hit rate over time:

```sql
from(bucket: "redis-metrics")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "redis")
  |> filter(fn: (r) => r._field == "keyspace_hits" or r._field == "keyspace_misses")
  |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> map(fn: (r) => ({
      _time: r._time,
      hit_rate: if float(v: r.keyspace_hits + r.keyspace_misses) > 0.0
                then float(v: r.keyspace_hits) / float(v: r.keyspace_hits + r.keyspace_misses) * 100.0
                else 0.0
  }))
```

Memory usage percentage:

```sql
from(bucket: "redis-metrics")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "redis" and r._field == "used_memory")
  |> map(fn: (r) => ({r with _value: r._value / 4294967296.0 * 100.0}))
  // Assuming 4GB maxmemory
```

## Set Up InfluxDB Alerts (Flux Tasks)

```sql
// Create a task that alerts on high memory
option task = {name: "redis-memory-alert", every: 5m}

data = from(bucket: "redis-metrics")
  |> range(start: -5m)
  |> filter(fn: (r) => r._measurement == "redis" and r._field == "used_memory")
  |> last()

data |> filter(fn: (r) => r._value > 3500000000)
     |> to(bucket: "redis-alerts")
```

## Summary

Telegraf's Redis input plugin provides a simple, zero-code path for sending Redis metrics to InfluxDB. Configure the plugin with your Redis connection details, set the InfluxDB output target, and start Telegraf. Use Flux queries in InfluxDB to calculate cache hit rates, memory percentages, and connection trends, then build dashboards in Grafana or InfluxDB's built-in visualization tools.
