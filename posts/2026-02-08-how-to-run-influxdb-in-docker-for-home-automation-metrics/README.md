# How to Run InfluxDB in Docker for Home Automation Metrics

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, InfluxDB, Home Automation, Time Series Database, Metrics, IoT, Docker Compose

Description: Learn how to deploy InfluxDB in Docker to collect and query home automation metrics from IoT sensors and smart devices.

---

If you run a home automation setup with sensors scattered around your house, you need somewhere to store all those temperature readings, humidity levels, power consumption numbers, and motion events. InfluxDB is purpose-built for exactly this kind of time-series data. Running it inside Docker keeps the installation clean, portable, and easy to back up.

This guide walks you through setting up InfluxDB 2.x in Docker, configuring it for home automation workloads, connecting it to common data sources like Home Assistant and Telegraf, and keeping your data safe with proper backup strategies.

## Why InfluxDB for Home Automation

Traditional relational databases like MySQL or PostgreSQL can store time-series data, but they were not designed for it. InfluxDB handles high-write throughput from dozens of sensors, compresses old data automatically, and provides a query language (Flux) that makes time-based aggregations straightforward. You can ask questions like "what was the average temperature in the living room between 2 PM and 6 PM last Tuesday" with a single query.

For home automation, the typical data flow looks like this:

```mermaid
graph LR
    A[Sensors / IoT Devices] --> B[Home Assistant / MQTT]
    B --> C[Telegraf]
    C --> D[InfluxDB in Docker]
    D --> E[Grafana Dashboard]
```

## Prerequisites

You need Docker and Docker Compose installed on your host machine. A Raspberry Pi 4 with 4 GB of RAM works well for most home setups. If you have more than 50 sensors pushing data every second, consider a machine with at least 8 GB of RAM.

Verify your Docker installation before proceeding.

```bash
# Check Docker and Docker Compose versions
docker --version
docker compose version
```

## Quick Start with Docker Run

The fastest way to get InfluxDB running is a single docker run command. This is useful for testing, but you should switch to Docker Compose for any persistent setup.

```bash
# Run InfluxDB 2.x with a named volume for data persistence
docker run -d \
  --name influxdb \
  -p 8086:8086 \
  -v influxdb-data:/var/lib/influxdb2 \
  -v influxdb-config:/etc/influxdb2 \
  influxdb:2.7
```

After the container starts, open your browser and navigate to `http://your-host-ip:8086`. You will see the InfluxDB setup wizard where you can create your initial organization, bucket, and admin user.

## Production Setup with Docker Compose

For a real home automation deployment, Docker Compose gives you reproducible configuration and easy management. Create a project directory and add the following compose file.

```yaml
# docker-compose.yml - InfluxDB with Telegraf for home automation metrics
version: "3.8"

services:
  influxdb:
    image: influxdb:2.7
    container_name: influxdb
    restart: unless-stopped
    ports:
      - "8086:8086"
    volumes:
      # Persist database files across container restarts
      - influxdb-data:/var/lib/influxdb2
      # Persist configuration
      - influxdb-config:/etc/influxdb2
    environment:
      # Automated setup variables - skip the web wizard
      DOCKER_INFLUXDB_INIT_MODE: setup
      DOCKER_INFLUXDB_INIT_USERNAME: admin
      DOCKER_INFLUXDB_INIT_PASSWORD: ${INFLUX_PASSWORD}
      DOCKER_INFLUXDB_INIT_ORG: home
      DOCKER_INFLUXDB_INIT_BUCKET: homeassistant
      DOCKER_INFLUXDB_INIT_RETENTION: 90d
      DOCKER_INFLUXDB_INIT_ADMIN_TOKEN: ${INFLUX_TOKEN}
    healthcheck:
      test: ["CMD", "influx", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  telegraf:
    image: telegraf:1.29
    container_name: telegraf
    restart: unless-stopped
    depends_on:
      influxdb:
        condition: service_healthy
    volumes:
      # Mount your Telegraf configuration
      - ./telegraf.conf:/etc/telegraf/telegraf.conf:ro
    environment:
      INFLUX_TOKEN: ${INFLUX_TOKEN}

volumes:
  influxdb-data:
  influxdb-config:
```

Create a `.env` file next to your compose file to store sensitive values.

```bash
# .env - Store credentials outside of the compose file
INFLUX_PASSWORD=your-secure-password-here
INFLUX_TOKEN=your-api-token-here
```

Start everything up with a single command.

```bash
# Launch InfluxDB and Telegraf in the background
docker compose up -d
```

## Configuring Telegraf for Home Sensors

Telegraf acts as the bridge between your sensor data and InfluxDB. Here is a basic configuration that collects MQTT messages from a broker, which is the most common pattern in home automation.

```toml
# telegraf.conf - Collect MQTT sensor data and write to InfluxDB

# Output plugin: send all collected data to InfluxDB 2.x
[[outputs.influxdb_v2]]
  urls = ["http://influxdb:8086"]
  token = "$INFLUX_TOKEN"
  organization = "home"
  bucket = "homeassistant"

# Input plugin: subscribe to MQTT topics from your sensor network
[[inputs.mqtt_consumer]]
  servers = ["tcp://mqtt-broker:1883"]
  topics = [
    "home/+/temperature",
    "home/+/humidity",
    "home/+/power",
    "home/+/motion"
  ]
  data_format = "value"
  data_type = "float"

# Input plugin: monitor the host system running Docker
[[inputs.system]]

[[inputs.cpu]]
  percpu = false
  totalcpu = true

[[inputs.mem]]

[[inputs.disk]]
  ignore_fs = ["tmpfs", "devtmpfs"]
```

## Connecting Home Assistant to InfluxDB

If you use Home Assistant, you can send all entity state changes directly to InfluxDB without Telegraf. Add the following to your Home Assistant `configuration.yaml`.

```yaml
# Home Assistant configuration.yaml - Send entity data to InfluxDB
influxdb:
  api_version: 2
  host: your-docker-host-ip
  port: 8086
  token: "your-api-token-here"
  organization: "home"
  bucket: "homeassistant"
  # Only include specific domains to avoid flooding the database
  include:
    domains:
      - sensor
      - binary_sensor
      - climate
      - weather
```

Restart Home Assistant after making this change. You should start seeing data flow into InfluxDB within a few minutes.

## Querying Your Data with Flux

InfluxDB 2.x uses the Flux query language. Here are some practical queries for home automation data.

```flux
// Get the average temperature per room over the last 24 hours
from(bucket: "homeassistant")
  |> range(start: -24h)
  |> filter(fn: (r) => r._measurement == "temperature")
  |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)
  |> yield(name: "hourly_avg")
```

```flux
// Find the peak power consumption in the last week
from(bucket: "homeassistant")
  |> range(start: -7d)
  |> filter(fn: (r) => r._measurement == "power")
  |> max()
```

## Performance Tuning for Raspberry Pi

Running InfluxDB on a Raspberry Pi requires some tuning. Add these environment variables to your compose file to reduce memory usage.

```yaml
# Additional environment variables for resource-constrained devices
environment:
  # Limit the in-memory cache size
  INFLUXD_STORAGE_CACHE_MAX_MEMORY_SIZE: "256m"
  # Reduce the WAL throughput limit
  INFLUXD_STORAGE_WAL_MAX_CONCURRENT_WRITES: "1"
  # Lower query memory limit
  INFLUXD_QUERY_MEMORY_BYTES: "209715200"
```

## Backup and Restore

Losing months of sensor data is painful. Set up automated backups with a simple cron job.

```bash
# Backup InfluxDB data to a local directory
docker exec influxdb influx backup /tmp/backup \
  --token your-api-token-here

# Copy the backup from the container to the host
docker cp influxdb:/tmp/backup ./influxdb-backup-$(date +%Y%m%d)
```

To automate this, create a small script and schedule it with cron.

```bash
#!/bin/bash
# backup-influxdb.sh - Run daily via cron
BACKUP_DIR="/home/pi/backups/influxdb"
DATE=$(date +%Y%m%d)

mkdir -p "$BACKUP_DIR"

docker exec influxdb influx backup /tmp/backup --token "$INFLUX_TOKEN"
docker cp influxdb:/tmp/backup "$BACKUP_DIR/$DATE"

# Clean up backups older than 30 days
find "$BACKUP_DIR" -type d -mtime +30 -exec rm -rf {} +

# Clean up the temporary backup inside the container
docker exec influxdb rm -rf /tmp/backup
```

Restoring from a backup is just as straightforward.

```bash
# Copy backup into the container and restore
docker cp ./influxdb-backup-20260208 influxdb:/tmp/restore
docker exec influxdb influx restore /tmp/restore --token your-api-token-here
```

## Retention Policies and Downsampling

Home automation data does not need second-level precision forever. You probably want detailed data for the last month and hourly averages for anything older. InfluxDB tasks handle this automatically.

```flux
// Create a downsampling task that runs every hour
option task = {name: "downsample_hourly", every: 1h}

from(bucket: "homeassistant")
  |> range(start: -task.every)
  |> filter(fn: (r) => r._measurement == "temperature" or r._measurement == "humidity")
  |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)
  |> to(bucket: "homeassistant_longterm", org: "home")
```

## Monitoring InfluxDB Health

You should monitor the database itself, not just the data inside it. Check container health and resource usage regularly.

```bash
# View container resource usage
docker stats influxdb --no-stream

# Check InfluxDB internal metrics
curl -s http://localhost:8086/metrics | grep influxdb_organizations_total
```

For production home labs, consider integrating with a monitoring tool like OneUptime to get alerts when InfluxDB goes down or when disk usage gets too high. Losing your metrics collection silently defeats the purpose of having it in the first place.

## Summary

InfluxDB in Docker gives you a solid foundation for storing and querying home automation metrics. The key points to remember are: use Docker Compose for reproducibility, configure retention policies to manage storage, back up your data regularly, and tune memory settings if you are running on constrained hardware like a Raspberry Pi. With Telegraf or Home Assistant feeding data in and Grafana rendering dashboards, you get full visibility into everything happening in your home.
