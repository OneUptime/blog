# How to Deploy IoT Applications on Raspberry Pi with Portainer - Part 2

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Raspberry Pi, IoT, MQTT, Node-RED, Home Automation, Docker

Description: Use Portainer on Raspberry Pi to deploy and manage IoT application stacks including MQTT brokers, Node-RED flows, InfluxDB time-series storage, and Grafana dashboards.

## Introduction

Raspberry Pi is one of the most popular platforms for IoT edge computing. Combining it with Portainer, you can manage a complete IoT stack - from MQTT message brokers to time-series databases and visualization - through a clean web interface. This guide builds an IoT data pipeline using Docker containers managed by Portainer.

## IoT Stack Architecture

The typical IoT data pipeline:

```text
IoT Sensors → MQTT Broker → Node-RED → InfluxDB → Grafana
                                ↓
                         Home Assistant
```

## Prerequisites

- Raspberry Pi 4 with Docker and Portainer installed
- IoT sensors or simulated data sources
- Basic MQTT knowledge

## Step 1: Deploy the IoT Stack

In Portainer, create a stack named `iot-platform`:

```yaml
version: "3.8"

services:
  # Eclipse Mosquitto - lightweight MQTT broker
  mosquitto:
    image: eclipse-mosquitto:2
    container_name: mosquitto
    ports:
      - "1883:1883"    # MQTT
      - "9001:9001"    # MQTT over WebSockets
    volumes:
      - mosquitto_config:/mosquitto/config
      - mosquitto_data:/mosquitto/data
      - mosquitto_log:/mosquitto/log
    restart: unless-stopped

  # Node-RED - visual IoT flow programming
  nodered:
    image: nodered/node-red:latest
    container_name: nodered
    ports:
      - "1880:1880"
    environment:
      - TZ=America/New_York
    volumes:
      - nodered_data:/data
    depends_on:
      - mosquitto
    restart: unless-stopped

  # InfluxDB - time-series database for sensor data
  influxdb:
    image: influxdb:2.7
    container_name: influxdb
    ports:
      - "8086:8086"
    environment:
      - DOCKER_INFLUXDB_INIT_MODE=setup
      - DOCKER_INFLUXDB_INIT_USERNAME=admin
      - DOCKER_INFLUXDB_INIT_PASSWORD=iotpassword123
      - DOCKER_INFLUXDB_INIT_ORG=homelab
      - DOCKER_INFLUXDB_INIT_BUCKET=iot_sensors
      - DOCKER_INFLUXDB_INIT_RETENTION=30d
    volumes:
      - influxdb_data:/var/lib/influxdb2
      - influxdb_config:/etc/influxdb2
    restart: unless-stopped

  # Grafana - IoT dashboard visualization
  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=grafana_password
      - GF_PLUGINS_PREINSTALL=grafana-clock-panel
    volumes:
      - grafana_data:/var/lib/grafana
    depends_on:
      - influxdb
    restart: unless-stopped

volumes:
  mosquitto_config:
  mosquitto_data:
  mosquitto_log:
  nodered_data:
  influxdb_data:
  influxdb_config:
  grafana_data:
```

## Step 2: Configure Mosquitto

After deploying the stack, configure Mosquitto authentication:

```bash
# Access the Mosquitto container via Portainer Console or:

docker exec -it mosquitto sh

# Create password file
mosquitto_passwd -c /mosquitto/config/passwd iot_user

# Create config file
cat > /mosquitto/config/mosquitto.conf << 'EOF'
persistence true
persistence_location /mosquitto/data/
log_dest file /mosquitto/log/mosquitto.log

# Require authentication
allow_anonymous false
password_file /mosquitto/config/passwd

listener 1883
listener 9001
protocol websockets
EOF

exit

# Restart Mosquitto to apply config
docker restart mosquitto
```

## Step 3: Configure Node-RED for MQTT

Access Node-RED at `http://<pi-ip>:1880`, install `node-red-contrib-influxdb` from **Menu** → **Manage palette** → **Install**, and create an MQTT flow:

1. Drag an **mqtt in** node onto the canvas
2. Double-click it and set:
   - Server: `mosquitto` (container name)
   - Port: `1883`
   - Topic: `sensors/#`
3. Add a **function** node to parse JSON:

```javascript
// Parse sensor data
const payload = JSON.parse(msg.payload);
msg.payload = [
  {
    temperature: payload.temperature,
    humidity: payload.humidity
  },
  {
    device: payload.device_id
  }
];
return msg;
```

4. Add an **influxdb out** node to write to InfluxDB and set its measurement to `environment`
5. Deploy the flow

## Step 4: Configure Grafana Dashboard

Access Grafana at `http://<pi-ip>:3000`:

1. Add InfluxDB data source:
   - URL: `http://influxdb:8086`
   - Query language: `Flux`
   - Organization: `homelab`
   - Default Bucket: `iot_sensors`
   - Token: (create or copy an API token from the InfluxDB UI)

2. Create a dashboard with time-series panels for your sensors

## Step 5: Simulate IoT Data

Test the pipeline with a simulated sensor:

```bash
# Install mosquitto clients on the Pi
sudo apt install -y mosquitto-clients

# Send test sensor data
mosquitto_pub \
  -h localhost \
  -p 1883 \
  -u iot_user \
  -P your_password \
  -t sensors/temperature/room1 \
  -m '{"device_id":"room1","temperature":22.5,"humidity":45.2}'
```

## Step 6: Add Hardware Sensors

For real sensors connected to the Pi's I2C bus:

```yaml
# Add to your iot-platform stack
services:
  # Container with I2C access for sensor reading
  sensor-reader:
    image: python:3.11-slim
    devices:
      - /dev/i2c-1:/dev/i2c-1  # I2C bus for sensors
    volumes:
      - /home/pi/sensor-scripts:/app
    command: python3 /app/read_sensors.py
    restart: unless-stopped
```

## Updating IoT Containers

Use Portainer's **Pull and redeploy** feature on the `iot-platform` stack to update all containers while preserving data volumes.

## Conclusion

Portainer on Raspberry Pi provides an excellent management platform for IoT applications. The containerized architecture makes it easy to update individual components, add new data sources, or swap out components (e.g., replace Node-RED with a custom Python service). With InfluxDB retaining data and Grafana visualizing it, you have a complete IoT analytics platform on a $70 computer.
