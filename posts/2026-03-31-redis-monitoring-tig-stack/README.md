# How to Build Redis Monitoring with the TIG Stack (Telegraf + InfluxDB + Grafana)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Telegraf, Grafana

Description: Learn how to collect Redis metrics with Telegraf, store them in InfluxDB, and visualize memory usage, latency, and throughput in Grafana dashboards.

---

The TIG stack (Telegraf, InfluxDB, Grafana) provides a time-series focused monitoring pipeline. Telegraf collects Redis metrics using a native plugin, InfluxDB stores them efficiently with automatic retention policies, and Grafana visualizes the data in real-time dashboards.

## Architecture

```text
Redis --> Telegraf (redis input) --> InfluxDB --> Grafana
```

## Start InfluxDB and Grafana with Docker

```yaml
# docker-compose.yml
version: "3.8"
services:
  influxdb:
    image: influxdb:2.7
    ports:
      - "8086:8086"
    environment:
      - DOCKER_INFLUXDB_INIT_MODE=setup
      - DOCKER_INFLUXDB_INIT_USERNAME=admin
      - DOCKER_INFLUXDB_INIT_PASSWORD=adminpassword
      - DOCKER_INFLUXDB_INIT_ORG=myorg
      - DOCKER_INFLUXDB_INIT_BUCKET=redis
      - DOCKER_INFLUXDB_INIT_RETENTION=7d
      - DOCKER_INFLUXDB_INIT_ADMIN_TOKEN=mytoken123

  grafana:
    image: grafana/grafana:10.3.0
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    depends_on:
      - influxdb
```

```bash
docker-compose up -d
```

## Install and Configure Telegraf

```bash
curl -s https://repos.influxdata.com/influxdb.key | sudo apt-key add -
echo "deb https://repos.influxdata.com/ubuntu focal stable" | sudo tee /etc/apt/sources.list.d/influxdb.list
sudo apt update && sudo apt install telegraf -y
```

```toml
# /etc/telegraf/telegraf.conf

[[inputs.redis]]
  servers = ["tcp://localhost:6379"]
  # Password optional
  # password = "yourpassword"

[[outputs.influxdb_v2]]
  urls = ["http://localhost:8086"]
  token = "mytoken123"
  organization = "myorg"
  bucket = "redis"
```

```bash
sudo systemctl start telegraf
sudo systemctl enable telegraf
```

## Verify Metrics in InfluxDB

```bash
# Query via influx CLI
influx query '
from(bucket: "redis")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "redis")
  |> filter(fn: (r) => r._field == "used_memory")
  |> last()
'
```

## Key Redis Metrics Collected by Telegraf

Telegraf's Redis plugin collects from `INFO all`:

```text
redis_connected_clients         - active connections
redis_used_memory               - memory bytes in use
redis_keyspace_hits             - successful key lookups
redis_keyspace_misses           - failed key lookups
redis_evicted_keys              - keys evicted due to maxmemory
redis_total_commands_processed  - total commands processed
redis_rdb_last_bgsave_status    - last save status
redis_aof_last_rewrite_time_sec - AOF rewrite duration
```

## Grafana Dashboard Setup

1. Add InfluxDB as a data source in Grafana (http://localhost:3000)
2. Set URL to `http://influxdb:8086`, organization `myorg`, token `mytoken123`, bucket `redis`

Sample Flux query for memory usage panel:

```text
from(bucket: "redis")
  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)
  |> filter(fn: (r) => r._measurement == "redis")
  |> filter(fn: (r) => r._field == "used_memory")
  |> aggregateWindow(every: v.windowPeriod, fn: mean)
  |> yield(name: "mean")
```

Sample query for hit rate:

```text
hits = from(bucket: "redis")
  |> range(start: v.timeRangeStart)
  |> filter(fn: (r) => r._field == "keyspace_hits")
  |> derivative(unit: 1s, nonNegative: true)

misses = from(bucket: "redis")
  |> range(start: v.timeRangeStart)
  |> filter(fn: (r) => r._field == "keyspace_misses")
  |> derivative(unit: 1s, nonNegative: true)
```

## Set Up Grafana Alerts

```bash
# Add contact point via Grafana Alerting Provisioning API
curl -X POST http://localhost:3000/api/v1/provisioning/contact-points \
  -H "Authorization: Bearer mytoken123" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Redis High Memory",
    "type": "slack",
    "settings": { "url": "https://hooks.slack.com/services/..." }
  }'
```

## Summary

The TIG stack provides efficient time-series monitoring for Redis with minimal configuration. Telegraf's built-in Redis plugin collects all INFO metrics automatically every 10 seconds. InfluxDB stores them with efficient compression and retention policies, and Grafana dashboards enable real-time visualization of memory, latency, hit rates, and connection counts.
