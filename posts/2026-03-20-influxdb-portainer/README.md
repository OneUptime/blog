# How to Deploy InfluxDB via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, InfluxDB, Time Series, Metric, Monitoring, IoT

Description: Deploy InfluxDB 2.x as a time-series database with Grafana and Telegraf for metrics collection using Portainer.

## Introduction

InfluxDB is the leading open-source time-series database, purpose-built for high-performance metrics, events, and logs. It's ideal for IoT sensor data, application metrics, and monitoring use cases. This guide covers deploying InfluxDB 2.x with Telegraf (data collection) and Grafana (visualization) via Portainer in a Docker Standalone environment.

## Step 1: Deploy InfluxDB Stack

```yaml
# docker-compose.yml - InfluxDB + Telegraf + Grafana

networks:
  metrics_net:
    driver: bridge

volumes:
  influxdb_data:
  influxdb_config:
  grafana_data:
  telegraf_config:

services:
  # InfluxDB 2.x
  influxdb:
    image: influxdb:2.7-alpine
    container_name: influxdb
    restart: unless-stopped
    ports:
      - "8086:8086"
    environment:
      # Initial setup
      - DOCKER_INFLUXDB_INIT_MODE=setup
      - DOCKER_INFLUXDB_INIT_USERNAME=admin
      - DOCKER_INFLUXDB_INIT_PASSWORD=admin_influx_password
      - DOCKER_INFLUXDB_INIT_ORG=my-org
      - DOCKER_INFLUXDB_INIT_BUCKET=metrics
      - DOCKER_INFLUXDB_INIT_RETENTION=30d
      - DOCKER_INFLUXDB_INIT_ADMIN_TOKEN=my-super-secret-auth-token
    volumes:
      - influxdb_data:/var/lib/influxdb2
      - influxdb_config:/etc/influxdb2
    networks:
      - metrics_net
    healthcheck:
      test: ["CMD", "influx", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Telegraf - metrics collection agent
  telegraf:
    image: telegraf:1.29-alpine
    container_name: telegraf
    restart: unless-stopped
    volumes:
      - /opt/telegraf/telegraf.conf:/etc/telegraf/telegraf.conf:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /etc:/host/etc:ro
    environment:
      - HOST_PROC=/host/proc
      - HOST_SYS=/host/sys
      - HOST_ETC=/host/etc
      - INFLUX_TOKEN=my-super-secret-auth-token
    networks:
      - metrics_net
    depends_on:
      influxdb:
        condition: service_healthy

  # Grafana - visualization
  grafana:
    image: grafana/grafana:latest
    container_name: grafana_influx
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=grafana_admin_password
    volumes:
      - grafana_data:/var/lib/grafana
      - /opt/grafana/provisioning:/etc/grafana/provisioning
    networks:
      - metrics_net
    depends_on:
      - influxdb
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.grafana.rule=Host(`grafana.yourdomain.com`)"
      - "traefik.http.routers.grafana.entrypoints=websecure"
      - "traefik.http.services.grafana.loadbalancer.server.port=3000"
```

## Step 2: Configure Telegraf

```toml
# /opt/telegraf/telegraf.conf
# Global configuration
[global_tags]
  environment = "production"
  datacenter = "us-east"

[agent]
  interval = "10s"
  round_interval = true
  metric_batch_size = 1000
  flush_interval = "10s"

# Output: InfluxDB 2.x
[[outputs.influxdb_v2]]
  urls = ["http://influxdb:8086"]
  token = "${INFLUX_TOKEN}"
  organization = "my-org"
  bucket = "metrics"
  timeout = "5s"

# Input: System CPU
[[inputs.cpu]]
  percpu = true
  totalcpu = true
  collect_cpu_time = false
  report_active = false

# Input: System Memory
[[inputs.mem]]

# Input: Disk I/O
[[inputs.diskio]]

# Input: Disk usage
[[inputs.disk]]
  ignore_fs = ["tmpfs", "devtmpfs", "devfs"]

# Input: Network
[[inputs.net]]

# Input: System load
[[inputs.system]]

# Input: Docker container metrics
[[inputs.docker]]
  endpoint = "unix:///var/run/docker.sock"
  gather_services = false
  source_tag = false
  container_name_include = []
  container_name_exclude = []
  timeout = "5s"
  perdevice = false
  perdevice_include = ["cpu", "blkio", "network"]
  docker_label_include = []
  docker_label_exclude = []

# Input: HTTP metrics from applications
[[inputs.http_response]]
  urls = [
    "http://api_service:8080/health",
    "http://user_service:8002/health",
  ]
  response_timeout = "5s"
  method = "GET"
  [inputs.http_response.tags]
    environment = "production"

# Input: Prometheus metrics scraping
[[inputs.prometheus]]
  urls = ["http://prometheus:9090/metrics"]
  metric_version = 2
```

## Step 3: Write Data to InfluxDB

```python
# Python - Write time-series data
from influxdb_client import InfluxDBClient, Point, WritePrecision
from influxdb_client.client.write_api import SYNCHRONOUS
from datetime import datetime

client = InfluxDBClient(
    url="http://influxdb:8086",
    token="my-super-secret-auth-token",
    org="my-org"
)

write_api = client.write_api(write_options=SYNCHRONOUS)

# Write a data point
point = Point("application_metrics") \
    .tag("service", "order-service") \
    .tag("region", "us-east") \
    .field("request_count", 1542) \
    .field("error_count", 3) \
    .field("response_time_ms", 45.2) \
    .time(datetime.utcnow(), WritePrecision.NS)

write_api.write(bucket="metrics", org="my-org", record=point)

# Batch write for efficiency
points = []
for i in range(100):
    p = Point("sensor_data") \
        .tag("sensor_id", f"sensor_{i}") \
        .field("temperature", 20.0 + i * 0.1) \
        .field("humidity", 60.0 - i * 0.2)
    points.append(p)

write_api.write(bucket="metrics", org="my-org", record=points)
```

## Step 4: Query Data with Flux

```flux
// Flux query - InfluxDB's query language

// Get average CPU usage over last hour
from(bucket: "metrics")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "cpu" and r._field == "usage_idle")
  |> aggregateWindow(every: 5m, fn: mean, createEmpty: false)
  |> map(fn: (r) => ({ r with _value: 100.0 - r._value }))
  |> yield(name: "cpu_usage")

// Get memory usage trend
from(bucket: "metrics")
  |> range(start: -24h)
  |> filter(fn: (r) => r._measurement == "mem" and r._field == "used_percent")
  |> aggregateWindow(every: 1h, fn: mean)
  |> yield(name: "memory_usage")

// Alert condition: error rate > 5%
from(bucket: "metrics")
  |> range(start: -5m)
  |> filter(fn: (r) => r._measurement == "application_metrics")
  |> pivot(rowKey: ["_time", "service"], columnKey: ["_field"], valueColumn: "_value")
  |> map(fn: (r) => ({
      r with
      error_rate: if r.request_count > 0 then float(v: r.error_count) / float(v: r.request_count) * 100.0 else 0.0
    }))
  |> filter(fn: (r) => r.error_rate > 5.0)
```

## Step 5: Grafana InfluxDB Datasource

```yaml
# /opt/grafana/provisioning/datasources/influxdb.yml
apiVersion: 1

datasources:
  - name: InfluxDB
    type: influxdb
    access: proxy
    url: http://influxdb:8086
    jsonData:
      version: Flux
      organization: my-org
      defaultBucket: metrics
      tlsSkipVerify: true
    secureJsonData:
      token: my-super-secret-auth-token
    isDefault: true
```

## Step 6: IoT Data Ingestion

```bash
# Write IoT data via Line Protocol over HTTP
curl -X POST "http://localhost:8086/api/v2/write?org=my-org&bucket=metrics&precision=s" \
  -H "Authorization: Token my-super-secret-auth-token" \
  -H "Content-Type: text/plain; charset=utf-8" \
  --data-binary "
temperature,sensor=room1,building=HQ value=23.5 $(date +%s)
humidity,sensor=room1,building=HQ value=65.2 $(date +%s)
pressure,sensor=weather-station value=1013.25 $(date +%s)
"
```

## Conclusion

InfluxDB 2.x provides a powerful time-series database with Flux query language, built-in dashboards, alerting, and tasks (scheduled queries). Telegraf collects metrics from your host system and Docker containers automatically. Portainer manages all three components of the stack, making it easy to view logs, update images, and monitor resource usage. This combination is ideal for IoT data collection, application performance monitoring, and infrastructure observability.
