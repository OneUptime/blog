# How to Deploy InfluxDB + Grafana for IoT Data via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, InfluxDB, Grafana, IoT, Time Series, Monitoring

Description: Deploy InfluxDB v2 and Grafana as a complete IoT time-series data storage and visualization platform using Portainer stacks.

## Introduction

InfluxDB is the leading time-series database purpose-built for IoT sensor data, metrics, and events. Paired with Grafana for visualization, it creates a powerful observability platform for IoT deployments. This guide shows you how to deploy both services via Portainer with proper configuration for IoT workloads.

## Prerequisites

- Portainer installed with Docker
- At least 4 GB RAM recommended (2 GB minimum)
- Persistent storage for data volumes
- Basic understanding of time-series concepts

## Step 1: Deploy InfluxDB + Grafana Stack

Create a new stack in Portainer:

```yaml
# docker-compose.yml for InfluxDB v2 + Grafana

version: "3.8"

services:
  # InfluxDB v2 - time-series database
  influxdb:
    image: influxdb:2.7-alpine
    container_name: influxdb
    restart: always
    ports:
      - "8086:8086"
    volumes:
      # Persist InfluxDB data and configuration
      - influxdb-data:/var/lib/influxdb2
      - influxdb-config:/etc/influxdb2
      # Backup directory
      - influxdb-backups:/backups
    environment:
      # Initial setup configuration
      - DOCKER_INFLUXDB_INIT_MODE=setup
      - DOCKER_INFLUXDB_INIT_USERNAME=${INFLUXDB_ADMIN_USER:-admin}
      - DOCKER_INFLUXDB_INIT_PASSWORD=${INFLUXDB_ADMIN_PASSWORD}
      - DOCKER_INFLUXDB_INIT_ORG=${INFLUXDB_ORG:-iotorg}
      - DOCKER_INFLUXDB_INIT_BUCKET=${INFLUXDB_BUCKET:-iot-sensors}
      - DOCKER_INFLUXDB_INIT_ADMIN_TOKEN=${INFLUXDB_TOKEN}
      - DOCKER_INFLUXDB_INIT_RETENTION=${INFLUXDB_RETENTION:-90d}
    healthcheck:
      test: ["CMD", "influx", "ping"]
      interval: 30s
      timeout: 10s
      retries: 5
    logging:
      driver: json-file
      options:
        max-size: "50m"
        max-file: "3"
    networks:
      - monitoring-net

  # Grafana - visualization and dashboards
  grafana:
    image: grafana/grafana:10.2.0
    container_name: grafana
    restart: always
    ports:
      - "3000:3000"
    depends_on:
      influxdb:
        condition: service_healthy
    volumes:
      # Persist Grafana data (dashboards, users, settings)
      - grafana-data:/var/lib/grafana
      # Auto-provision datasources and dashboards
      - grafana-provisioning:/etc/grafana/provisioning
    environment:
      - GF_SECURITY_ADMIN_USER=${GRAFANA_ADMIN_USER:-admin}
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_SERVER_DOMAIN=${GRAFANA_DOMAIN:-localhost}
      - GF_SERVER_ROOT_URL=http://${GRAFANA_DOMAIN:-localhost}:3000
      # Plugin auto-install
      - GF_INSTALL_PLUGINS=grafana-clock-panel,grafana-worldmap-panel,grafana-piechart-panel
      # SMTP for alerts
      - GF_SMTP_ENABLED=${GRAFANA_SMTP_ENABLED:-false}
      - GF_SMTP_HOST=${GRAFANA_SMTP_HOST}
      - GF_SMTP_FROM_ADDRESS=${GRAFANA_FROM_EMAIL}
      # InfluxDB connection (for provisioning)
      - INFLUXDB_TOKEN=${INFLUXDB_TOKEN}
      - INFLUXDB_ORG=${INFLUXDB_ORG:-iotorg}
      - INFLUXDB_BUCKET=${INFLUXDB_BUCKET:-iot-sensors}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    logging:
      driver: json-file
      options:
        max-size: "50m"
        max-file: "3"
    networks:
      - monitoring-net

volumes:
  influxdb-data:
  influxdb-config:
  influxdb-backups:
  grafana-data:
  grafana-provisioning:

networks:
  monitoring-net:
    driver: bridge
```

## Step 2: Configure Grafana Datasource Provisioning

After deployment, configure the InfluxDB datasource by adding a provisioning file to the Grafana provisioning volume through Portainer, then restart the Grafana container so it loads the new datasource:

```yaml
# /etc/grafana/provisioning/datasources/influxdb.yaml
apiVersion: 1

datasources:
  - name: InfluxDB-IoT
    type: influxdb
    access: proxy
    url: http://influxdb:8086
    jsonData:
      version: Flux
      organization: ${INFLUXDB_ORG}
      defaultBucket: ${INFLUXDB_BUCKET}
      tlsSkipVerify: false
    secureJsonData:
      token: ${INFLUXDB_TOKEN}
    isDefault: true
```

## Step 3: Create IoT Dashboard

Write IoT sensor dashboard queries using InfluxDB Flux language:

```flux
// Real-time temperature dashboard query
from(bucket: "iot-sensors")
  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)
  |> filter(fn: (r) => r._measurement == "sensor_data")
  |> filter(fn: (r) => r._field == "temperature")
  |> filter(fn: (r) => r.device_id =~ /^factory-/)
  |> aggregateWindow(
      every: v.windowPeriod,
      fn: mean,
      createEmpty: false
  )
  |> yield(name: "mean_temperature")
```

```flux
// Active device count - readings in the last 5 minutes
from(bucket: "iot-sensors")
  |> range(start: -5m)
  |> filter(fn: (r) => r._measurement == "sensor_data")
  |> filter(fn: (r) => r._field == "temperature")
  |> group(columns: ["device_id"])
  |> last()
  |> group()
  |> count(column: "_value")
  |> rename(columns: {_value: "active_devices"})
```

## Step 4: Write Sensor Data to InfluxDB

Use the InfluxDB Line Protocol to write data from sensors:

```bash
# Write data using curl
curl -X POST "http://localhost:8086/api/v2/write?org=iotorg&bucket=iot-sensors&precision=s" \
  -H "Authorization: Token ${INFLUXDB_TOKEN}" \
  -H "Content-Type: text/plain; charset=utf-8" \
  --data-raw "sensor_data,device_id=factory-001,location=line-1 temperature=23.5,humidity=65.2,pressure=1013.25 $(date +%s)"
```

Python example:

```python
# sensor_writer.py
from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS
import time

client = InfluxDBClient(
    url="http://localhost:8086",
    token="your-token",
    org="iotorg"
)

write_api = client.write_api(write_options=SYNCHRONOUS)

# Write sensor reading
point = (Point("sensor_data")
    .tag("device_id", "factory-001")
    .tag("location", "line-1")
    .field("temperature", 23.5)
    .field("humidity", 65.2)
    .field("pressure", 1013.25))

write_api.write(bucket="iot-sensors", record=point)
print("Data written to InfluxDB")
```

## Step 5: Configure Data Retention and Downsampling

Set up retention policies to manage storage efficiently. First create the `iot-sensors-hourly` bucket in InfluxDB with a 1-year retention period, then save the following as an InfluxDB task:

```flux
// Save this as an InfluxDB task after creating the iot-sensors-hourly bucket.
// Hourly averages for long-term storage (1 year)
option task = {
    name: "hourly-downsample",
    every: 1h
}

from(bucket: "iot-sensors")
  |> range(start: -task.every)
  |> filter(fn: (r) => r._measurement == "sensor_data")
  |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)
  |> to(bucket: "iot-sensors-hourly", org: "iotorg")
```

## Step 6: Set Up Grafana Alerting

Configure alerts for sensor anomalies:

1. Go to Grafana > Alerting > Alert Rules
2. Create rule with Flux query:

```flux
// Alert when temperature exceeds threshold
from(bucket: "iot-sensors")
  |> range(start: -5m)
  |> filter(fn: (r) => r._measurement == "sensor_data" and r._field == "temperature")
  |> mean()
  |> map(fn: (r) => ({r with _value: if r._value > 35.0 then 1.0 else 0.0}))
```

## Conclusion

InfluxDB and Grafana deployed via Portainer create a purpose-built IoT observability platform for storing and visualizing high-volume sensor data while providing beautiful real-time dashboards. InfluxDB tasks and bucket retention policies make it cost-effective for long-term sensor data storage, while Grafana's alerting capabilities ensure that anomalies are detected and teams are notified promptly. Portainer simplifies the ongoing management of both services through a unified interface.
