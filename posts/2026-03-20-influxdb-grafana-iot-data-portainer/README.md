# How to Deploy InfluxDB + Grafana for IoT Data via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: InfluxDB, Grafana, IoT, Portainer, Time Series, Dashboard, Docker

Description: Deploy InfluxDB and Grafana together using a Portainer stack to store and visualize IoT time-series sensor data with rich dashboards and alerting.

---

InfluxDB is the go-to time-series database for IoT workloads, and Grafana is the standard visualization layer. Together they form the backbone of most IoT analytics platforms. This guide shows how to run both as a single Portainer stack.

## Step 1: Deploy the Stack

In Portainer, go to **Stacks > Add Stack**:

```yaml
# influxdb-grafana-iot.yml

version: "3.8"

services:
  influxdb:
    image: influxdb:2.7
    environment:
      # Auto-setup InfluxDB on first run
      - DOCKER_INFLUXDB_INIT_MODE=setup
      - DOCKER_INFLUXDB_INIT_USERNAME=admin
      - DOCKER_INFLUXDB_INIT_PASSWORD=iot_secure_password
      - DOCKER_INFLUXDB_INIT_ORG=iot-org
      - DOCKER_INFLUXDB_INIT_BUCKET=iot-sensors
      - DOCKER_INFLUXDB_INIT_ADMIN_TOKEN=my-super-secret-token
      - DOCKER_INFLUXDB_INIT_RETENTION=90d
    volumes:
      - influxdb-data:/var/lib/influxdb2
      - influxdb-config:/etc/influxdb2
    ports:
      - "8086:8086"
    restart: unless-stopped
    networks:
      - iot-analytics

  grafana:
    image: grafana/grafana:10.3.0
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=grafana_password
      # Provision the InfluxDB data source automatically
      - GF_PATHS_PROVISIONING=/etc/grafana/provisioning
    volumes:
      - grafana-data:/var/lib/grafana
      - /opt/grafana/provisioning:/etc/grafana/provisioning:ro
    ports:
      - "3000:3000"
    depends_on:
      - influxdb
    restart: unless-stopped
    networks:
      - iot-analytics

volumes:
  influxdb-data:
  influxdb-config:
  grafana-data:

networks:
  iot-analytics:
    driver: bridge
```

## Step 2: Auto-Provision Grafana Data Source

Create the following provisioning file on the Docker host so Grafana automatically connects to InfluxDB on startup. If Grafana is already running, restart or redeploy it after adding the file:

```yaml
# /opt/grafana/provisioning/datasources/influxdb.yaml
apiVersion: 1

datasources:
  - name: InfluxDB-IoT
    type: influxdb
    access: proxy
    url: http://influxdb:8086
    # Use Flux query language for InfluxDB 2.x
    jsonData:
      version: Flux
      organization: iot-org
      defaultBucket: iot-sensors
    secureJsonData:
      token: my-super-secret-token
    isDefault: true
```

## Step 3: Write Sensor Data to InfluxDB

Use the InfluxDB client library to write sensor data from your applications:

```python
# sensor_writer.py
from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS
import time

# Connect to InfluxDB
client = InfluxDBClient(
    url="http://localhost:8086",
    token="my-super-secret-token",
    org="iot-org"
)
write_api = client.write_api(write_options=SYNCHRONOUS)

def write_sensor_reading(device_id, temperature, humidity):
    """Write a sensor reading to InfluxDB."""
    point = (
        Point("sensor_readings")
        .tag("device_id", device_id)
        .tag("location", "building-a")
        .field("temperature", temperature)
        .field("humidity", humidity)
    )
    write_api.write(bucket="iot-sensors", org="iot-org", record=point)

# Example usage
while True:
    write_sensor_reading("sensor-001", 22.5, 65.0)
    time.sleep(10)
```

## Step 4: Query Data with Flux

In Grafana, use Flux to build IoT dashboards:

```flux
// Query average temperature per device over the last hour
from(bucket: "iot-sensors")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "sensor_readings")
  |> filter(fn: (r) => r._field == "temperature")
  |> aggregateWindow(every: 5m, fn: mean, createEmpty: false)
  |> yield(name: "mean_temperature")
```

## Step 5: Set Up Grafana Alerts

Configure alerts for sensor threshold violations:

1. In Grafana, open a dashboard panel, click the panel menu, then select **More... > New alert rule**
2. Define a query and condition that alerts when `temperature` is above `35`, then set a pending period of `5m`
3. Configure contact points for notifications (email, Slack, PagerDuty)

## Summary

InfluxDB and Grafana form a powerful IoT analytics stack. With Portainer, you can deploy and manage both services as a single unit, making it easy to update, scale, and monitor your IoT data infrastructure.
