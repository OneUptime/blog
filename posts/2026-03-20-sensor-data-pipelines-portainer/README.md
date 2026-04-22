# How to Deploy Sensor Data Collection Pipelines with Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, IoT, Sensor Data, Docker, Data Pipeline

Description: Build and deploy end-to-end sensor data collection pipelines using Portainer, combining MQTT, Telegraf, InfluxDB, and Grafana.

## Introduction

Sensor data collection pipelines are the backbone of IoT and industrial monitoring systems. A well-designed pipeline collects raw sensor readings, processes and enriches them, stores them efficiently, and makes them available for visualization and alerting. This guide shows you how to deploy a complete sensor data pipeline using Portainer stacks.

## Pipeline Architecture

```text
Sensors -> MQTT Broker -> Telegraf -> InfluxDB -> Grafana
              |
          Node-RED (Optional processing)
```

## Prerequisites

- Portainer installed with a Docker Standalone environment
- At least 4 GB RAM for the full pipeline
- Network access to IoT sensors (or simulated sensors)

## Step 1: Deploy the Complete Pipeline Stack

Create a Portainer stack with all pipeline components:

```yaml
# sensor-pipeline-stack.yaml

services:
  # MQTT Broker - receives sensor data
  mosquitto:
    image: eclipse-mosquitto:2.0
    container_name: mosquitto
    restart: always
    ports:
      - "1883:1883"    # MQTT plain
    volumes:
      - mosquitto-data:/mosquitto/data
      - mosquitto-log:/mosquitto/log
    configs:
      - source: mosquitto-config
        target: /mosquitto/config/mosquitto.conf
    networks:
      - pipeline-net

  # Telegraf - ingests from MQTT, writes to InfluxDB
  telegraf:
    image: telegraf:1.29-alpine
    container_name: telegraf
    restart: always
    depends_on:
      - mosquitto
      - influxdb
    volumes:
      - telegraf-config:/etc/telegraf
    configs:
      - source: telegraf-config
        target: /etc/telegraf/telegraf.conf
    environment:
      - INFLUXDB_TOKEN=${INFLUXDB_TOKEN}
      - INFLUXDB_ORG=${INFLUXDB_ORG}
      - INFLUXDB_BUCKET=${INFLUXDB_BUCKET}
    networks:
      - pipeline-net

  # InfluxDB v2 - time-series data storage
  influxdb:
    image: influxdb:2.7-alpine
    container_name: influxdb
    restart: always
    ports:
      - "8086:8086"
    volumes:
      - influxdb-data:/var/lib/influxdb2
      - influxdb-config:/etc/influxdb2
    environment:
      - DOCKER_INFLUXDB_INIT_MODE=setup
      - DOCKER_INFLUXDB_INIT_USERNAME=${INFLUXDB_ADMIN_USER}
      - DOCKER_INFLUXDB_INIT_PASSWORD=${INFLUXDB_ADMIN_PASSWORD}
      - DOCKER_INFLUXDB_INIT_ORG=${INFLUXDB_ORG}
      - DOCKER_INFLUXDB_INIT_BUCKET=${INFLUXDB_BUCKET}
      - DOCKER_INFLUXDB_INIT_ADMIN_TOKEN=${INFLUXDB_TOKEN}
      - DOCKER_INFLUXDB_INIT_RETENTION=30d
    networks:
      - pipeline-net

  # Grafana - visualization
  grafana:
    image: grafana/grafana:10.2.0
    container_name: grafana
    restart: always
    ports:
      - "3000:3000"
    depends_on:
      - influxdb
    volumes:
      - grafana-data:/var/lib/grafana
      - grafana-provisioning:/etc/grafana/provisioning
    environment:
      - GF_SECURITY_ADMIN_USER=${GRAFANA_ADMIN_USER}
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_SERVER_DOMAIN=${DOMAIN}
      - INFLUXDB_TOKEN=${INFLUXDB_TOKEN}
      - INFLUXDB_ORG=${INFLUXDB_ORG}
      - INFLUXDB_BUCKET=${INFLUXDB_BUCKET}
    networks:
      - pipeline-net

  # Sensor simulator for testing
  sensor-simulator:
    image: python:3.11-slim
    container_name: sensor-simulator
    restart: unless-stopped
    depends_on:
      - mosquitto
    command:
      - sh
      - -c
      - |
        pip install paho-mqtt &&
        python3 - <<'PY'
        import paho.mqtt.client as mqtt
        import time, random, json, math

        client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
        client.connect('mosquitto', 1883)
        client.loop_start()

        i = 0
        while True:
            # Simulate temperature, humidity, and pressure sensors
            data = {
                'temperature': 22.5 + 5*math.sin(i/100) + random.gauss(0, 0.2),
                'humidity': 65 + 10*math.cos(i/80) + random.gauss(0, 0.5),
                'pressure': 1013.25 + random.gauss(0, 0.1),
                'device_id': 'sensor-001',
                'timestamp': int(time.time())
            }
            client.publish('sensors/environment', json.dumps(data))
            print(f'Published: {data}')
            time.sleep(5)
            i += 1
        PY
    networks:
      - pipeline-net

configs:
  mosquitto-config:
    content: |
      listener 1883
      allow_anonymous true
      persistence true
      persistence_location /mosquitto/data/
      log_dest file /mosquitto/log/mosquitto.log
      log_dest stdout

  telegraf-config:
    content: |
      # Telegraf Configuration
      
      [agent]
        interval = "10s"
        round_interval = true
        metric_batch_size = 1000
        metric_buffer_limit = 10000
        collection_jitter = "0s"
        flush_interval = "10s"
        flush_jitter = "0s"
        precision = ""
        hostname = ""
        omit_hostname = false
      
      # Output to InfluxDB v2
      [[outputs.influxdb_v2]]
        urls = ["http://influxdb:8086"]
        token = "${INFLUXDB_TOKEN}"
        organization = "${INFLUXDB_ORG}"
        bucket = "${INFLUXDB_BUCKET}"
      
      # Subscribe to MQTT topics
      [[inputs.mqtt_consumer]]
        servers = ["tcp://mosquitto:1883"]
        topics = [
          "sensors/#"
        ]
        data_format = "json"
        json_time_key = "timestamp"
        json_time_format = "unix"
        json_name_key = "measurement"
        tag_keys = ["device_id"]

volumes:
  mosquitto-data:
  mosquitto-log:
  telegraf-config:
  influxdb-data:
  influxdb-config:
  grafana-data:
  grafana-provisioning:

networks:
  pipeline-net:
    driver: bridge
```

## Step 2: Configure Environment Variables

In Portainer's stack editor, set these environment variables:

```bash
INFLUXDB_ADMIN_USER=admin
INFLUXDB_ADMIN_PASSWORD=secure-influxdb-password
INFLUXDB_ORG=myorg
INFLUXDB_BUCKET=sensors
INFLUXDB_TOKEN=my-super-secret-token
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=secure-grafana-password
DOMAIN=monitoring.example.com
```

## Step 3: Configure Grafana Data Source

Configure InfluxDB as a data source in Grafana. For file provisioning, use a YAML file under `/etc/grafana/provisioning/datasources/`:

```yaml
# grafana-datasource.yaml - for provisioning
apiVersion: 1

datasources:
  - name: InfluxDB Sensors
    type: influxdb
    access: proxy
    url: http://influxdb:8086
    jsonData:
      version: Flux
      organization: $INFLUXDB_ORG
      defaultBucket: $INFLUXDB_BUCKET
      tlsSkipVerify: false
    secureJsonData:
      token: $INFLUXDB_TOKEN
```

## Step 4: Create a Grafana Dashboard Query

Example Flux query for sensor dashboard:

```flux
// Query last 1 hour of temperature data
from(bucket: "sensors")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "mqtt_consumer")
  |> filter(fn: (r) => r._field == "temperature")
  |> aggregateWindow(every: 1m, fn: mean, createEmpty: false)
  |> yield(name: "mean")
```

## Step 5: Add Alerting Rules

Configure Grafana alerting for sensor thresholds:

1. Go to Grafana > Alerting > Alert Rules
2. Create a new rule
3. Set condition: temperature > 30 for 5 minutes
4. Configure contact points and notification policies (email, Slack, PagerDuty)

## Monitoring the Pipeline Health

Check pipeline health from Portainer:

```bash
# View Telegraf metrics collection
docker logs telegraf --tail 50 -f

# Check InfluxDB health
curl http://localhost:8086/health

# View MQTT message flow
docker exec mosquitto mosquitto_sub -t "sensors/#" -v
```

## Conclusion

A sensor data collection pipeline deployed via Portainer provides a complete, containerized solution for IoT data management. The combination of MQTT for lightweight device communication, Telegraf for flexible metric collection, InfluxDB for efficient time-series storage, and Grafana for visualization creates a practical observability stack. Portainer's stack management makes it easy to deploy, update, and extend this pipeline as your IoT deployment grows.
