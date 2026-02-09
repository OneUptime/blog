# How to Set Up a TIG Stack (Telegraf + InfluxDB + Grafana) with Docker Compose

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Compose, Telegraf, InfluxDB, Grafana, Monitoring, Metrics, Time Series

Description: Deploy a complete TIG monitoring stack with Docker Compose to collect, store, and visualize metrics from your infrastructure.

---

The TIG stack brings together three specialized tools for infrastructure monitoring. Telegraf collects metrics from your servers, applications, and services. InfluxDB stores those metrics in a time-series database optimized for this exact workload. Grafana turns the raw numbers into dashboards and alerts. Together, they form a monitoring pipeline that competes with commercial solutions at zero licensing cost.

Docker Compose makes this stack trivial to deploy. In under five minutes, you can have a fully functional monitoring system collecting host metrics and displaying them on pre-built dashboards.

## Architecture

```mermaid
graph LR
    Host["Host System"] --> Telegraf
    Docker["Docker Engine"] --> Telegraf
    App["Applications"] --> Telegraf
    Telegraf --> InfluxDB
    InfluxDB --> Grafana
    Grafana --> Users["Dashboard Users"]
```

Telegraf acts as the agent, collecting metrics from multiple sources. It pushes those metrics to InfluxDB via its native line protocol. Grafana queries InfluxDB and renders the results as charts, graphs, and tables.

## Directory Structure

```
tig-stack/
├── docker-compose.yml
├── telegraf/
│   └── telegraf.conf
├── grafana/
│   └── provisioning/
│       ├── datasources/
│       │   └── influxdb.yml
│       └── dashboards/
│           ├── dashboard.yml
│           └── system-metrics.json
└── influxdb/
    └── (data persisted via volume)
```

## Docker Compose Configuration

```yaml
# TIG Stack - Telegraf, InfluxDB, Grafana
version: "3.8"

services:
  # InfluxDB - time-series database for metrics storage
  influxdb:
    image: influxdb:2.7
    ports:
      - "8086:8086"
    environment:
      DOCKER_INFLUXDB_INIT_MODE: setup
      DOCKER_INFLUXDB_INIT_USERNAME: admin
      DOCKER_INFLUXDB_INIT_PASSWORD: adminpassword123
      DOCKER_INFLUXDB_INIT_ORG: myorg
      DOCKER_INFLUXDB_INIT_BUCKET: telegraf
      DOCKER_INFLUXDB_INIT_ADMIN_TOKEN: my-super-secret-token
      DOCKER_INFLUXDB_INIT_RETENTION: 30d
    volumes:
      - influxdb-data:/var/lib/influxdb2
      - influxdb-config:/etc/influxdb2
    healthcheck:
      test: ["CMD", "influx", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - tig-network

  # Telegraf - metrics collection agent
  telegraf:
    image: telegraf:1.29
    volumes:
      - ./telegraf/telegraf.conf:/etc/telegraf/telegraf.conf:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
    environment:
      HOST_PROC: /host/proc
      HOST_SYS: /host/sys
      INFLUX_TOKEN: my-super-secret-token
    depends_on:
      influxdb:
        condition: service_healthy
    networks:
      - tig-network

  # Grafana - visualization and dashboarding
  grafana:
    image: grafana/grafana:10.3.1
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_USER: admin
      GF_SECURITY_ADMIN_PASSWORD: grafana
      GF_INSTALL_PLUGINS: grafana-clock-panel
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning:ro
    depends_on:
      - influxdb
    networks:
      - tig-network

volumes:
  influxdb-data:
  influxdb-config:
  grafana-data:

networks:
  tig-network:
    driver: bridge
```

The Telegraf service mounts the Docker socket so it can collect container metrics, plus `/proc` and `/sys` for host-level CPU, memory, and disk statistics.

## Telegraf Configuration

This is where you define what metrics to collect and where to send them.

```toml
# telegraf/telegraf.conf - Telegraf agent configuration

# Global agent settings
[agent]
  interval = "10s"
  round_interval = true
  metric_batch_size = 1000
  metric_buffer_limit = 10000
  flush_interval = "10s"
  hostname = ""
  omit_hostname = false

# Output to InfluxDB v2
[[outputs.influxdb_v2]]
  urls = ["http://influxdb:8086"]
  token = "$INFLUX_TOKEN"
  organization = "myorg"
  bucket = "telegraf"

# Collect CPU metrics
[[inputs.cpu]]
  percpu = true
  totalcpu = true
  collect_cpu_time = false
  report_active = false

# Collect disk usage metrics
[[inputs.disk]]
  ignore_fs = ["tmpfs", "devtmpfs", "devfs", "iso9660", "overlay", "aufs", "squashfs"]

# Collect disk I/O metrics
[[inputs.diskio]]

# Collect memory metrics
[[inputs.mem]]

# Collect network interface metrics
[[inputs.net]]

# Collect system load and uptime
[[inputs.system]]

# Collect process counts
[[inputs.processes]]

# Collect Docker container metrics
[[inputs.docker]]
  endpoint = "unix:///var/run/docker.sock"
  gather_services = false
  container_names = []
  timeout = "5s"
  perdevice = true
  total = false

# Collect internal Telegraf metrics
[[inputs.internal]]
  collect_memstats = true
```

Each `[[inputs.*]]` block defines a data source. Telegraf has hundreds of input plugins for everything from databases to cloud services to SNMP devices. The configuration above covers the most common host and Docker metrics.

## Grafana Data Source Provisioning

Auto-configure Grafana to connect to InfluxDB on startup:

```yaml
# grafana/provisioning/datasources/influxdb.yml
apiVersion: 1

datasources:
  - name: InfluxDB
    type: influxdb
    access: proxy
    url: http://influxdb:8086
    jsonData:
      version: Flux
      organization: myorg
      defaultBucket: telegraf
    secureJsonData:
      token: my-super-secret-token
    isDefault: true
```

## Dashboard Provisioning

Tell Grafana where to find dashboard JSON files:

```yaml
# grafana/provisioning/dashboards/dashboard.yml
apiVersion: 1

providers:
  - name: "default"
    orgId: 1
    type: file
    disableDeletion: false
    updateIntervalSeconds: 30
    options:
      path: /etc/grafana/provisioning/dashboards
      foldersFromFilesStructure: false
```

## Starting the Stack

```bash
# Create the directory structure
mkdir -p telegraf grafana/provisioning/datasources grafana/provisioning/dashboards

# Start all services
docker compose up -d

# Verify all containers are running
docker compose ps

# Check InfluxDB health
curl http://localhost:8086/health
```

## Verifying Data Collection

After a minute or two, Telegraf should have collected metrics. Verify by querying InfluxDB directly:

```bash
# Query InfluxDB for recent CPU metrics using Flux
curl -X POST "http://localhost:8086/api/v2/query?org=myorg" \
  -H "Authorization: Token my-super-secret-token" \
  -H "Content-Type: application/vnd.flux" \
  -d 'from(bucket: "telegraf")
    |> range(start: -5m)
    |> filter(fn: (r) => r._measurement == "cpu")
    |> filter(fn: (r) => r.cpu == "cpu-total")
    |> limit(n: 5)'
```

## Accessing Grafana

Open http://localhost:3000 and log in with admin/grafana. The InfluxDB data source should already be configured thanks to the provisioning files.

To build a basic CPU dashboard:

1. Click "New Dashboard" and then "Add Visualization"
2. Select the InfluxDB data source
3. Use this Flux query:

```flux
// Query for CPU usage percentage over the last hour
from(bucket: "telegraf")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "cpu")
  |> filter(fn: (r) => r._field == "usage_user" or r._field == "usage_system")
  |> filter(fn: (r) => r.cpu == "cpu-total")
  |> aggregateWindow(every: 30s, fn: mean, createEmpty: false)
```

## Adding Application Metrics

Beyond system metrics, you can configure Telegraf to scrape application metrics. For example, if your application exposes a Prometheus endpoint:

```toml
# Add to telegraf.conf - scrape Prometheus metrics from your app
[[inputs.prometheus]]
  urls = ["http://myapp:8080/metrics"]
  metric_version = 2
  response_timeout = "5s"
```

Or collect metrics from a PostgreSQL database:

```toml
# Add to telegraf.conf - collect PostgreSQL metrics
[[inputs.postgresql]]
  address = "host=postgres user=monitor password=monitor dbname=mydb sslmode=disable"
  databases = ["mydb"]
```

## Setting Up Alerts

Grafana supports alerting based on metric thresholds. You can configure alerts directly in Grafana's UI, or provision them via YAML. For example, an alert that fires when CPU usage exceeds 80% for 5 minutes.

## Resource Tuning

For local development, the default settings work fine. For production, tune InfluxDB's memory and Telegraf's collection interval:

```yaml
# Production-tuned InfluxDB settings
influxdb:
  environment:
    INFLUXD_STORAGE_CACHE_MAX_MEMORY_SIZE: 1073741824
    INFLUXD_STORAGE_CACHE_SNAPSHOT_MEMORY_SIZE: 26214400
```

## Troubleshooting

```bash
# Check Telegraf is collecting data
docker compose logs telegraf

# Test Telegraf configuration
docker compose exec telegraf telegraf --config /etc/telegraf/telegraf.conf --test

# Verify InfluxDB bucket exists
curl -H "Authorization: Token my-super-secret-token" \
  http://localhost:8086/api/v2/buckets?org=myorg

# Check Grafana logs for data source errors
docker compose logs grafana | grep -i error
```

## Summary

The TIG stack gives you a lightweight, self-hosted monitoring solution. Telegraf collects metrics from dozens of sources with minimal configuration, InfluxDB stores them efficiently with automatic retention policies, and Grafana turns the data into actionable dashboards. With Docker Compose, the entire stack deploys in minutes and can be version-controlled alongside your application code.
