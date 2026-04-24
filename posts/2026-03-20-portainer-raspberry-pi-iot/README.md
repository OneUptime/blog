# How to Deploy IoT Applications on Raspberry Pi with Portainer - Part 3

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Raspberry Pi, IoT, MQTT, Edge Computing

Description: Learn how to use Portainer on Raspberry Pi to deploy and manage IoT applications including MQTT brokers, Node-RED flows, InfluxDB time-series storage, and Grafana dashboards.

## IoT Stack Architecture

```text
IoT Sensors/Devices
    ↓ MQTT
Mosquitto Broker (MQTT)
    ↓
Node-RED (flow processing)
    ↓
InfluxDB (time-series data)
    ↓
Grafana (visualization)
```

## Prerequisites

- Raspberry Pi 4 with 4GB RAM minimum and a 64-bit OS
- Docker installed
- Portainer installed (see portainer-raspberry-pi-homelab)

## Deploy the Full IoT Stack

In Portainer: **Stacks → Add Stack → iot-stack**

```yaml
services:
  mosquitto:
    image: eclipse-mosquitto:latest
    restart: unless-stopped
    ports:
      - "1883:1883"     # MQTT
    volumes:
      - mosquitto_data:/mosquitto/data
      - mosquitto_config:/mosquitto/config
      - mosquitto_log:/mosquitto/log

  nodered:
    image: nodered/node-red:latest
    restart: unless-stopped
    ports:
      - "1880:1880"
    environment:
      - TZ=America/New_York
    volumes:
      - nodered_data:/data
    user: "1000:1000"    # Run as non-root

  influxdb:
    image: influxdb:2.7
    restart: unless-stopped
    ports:
      - "8086:8086"
    environment:
      - DOCKER_INFLUXDB_INIT_MODE=setup
      - DOCKER_INFLUXDB_INIT_USERNAME=admin
      - DOCKER_INFLUXDB_INIT_PASSWORD=${INFLUXDB_PASSWORD}
      - DOCKER_INFLUXDB_INIT_ORG=homelab
      - DOCKER_INFLUXDB_INIT_BUCKET=iot
    volumes:
      - influxdb_data:/var/lib/influxdb2

  grafana:
    image: grafana/grafana:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
    depends_on:
      - influxdb

volumes:
  mosquitto_data:
  mosquitto_config:
  mosquitto_log:
  nodered_data:
  influxdb_data:
  grafana_data:
```

## Configure Mosquitto MQTT Broker

After deploying, create the config via Portainer console:

```bash
# In Portainer: Containers > mosquitto > Console

cat > /mosquitto/config/mosquitto.conf << 'EOF'
listener 1883
allow_anonymous false
password_file /mosquitto/config/passwd
persistence true
persistence_location /mosquitto/data/
log_dest file /mosquitto/log/mosquitto.log
EOF

# Create user credentials
mosquitto_passwd -c /mosquitto/config/passwd iot-user
# Enter password when prompted
```

Then restart the mosquitto container (or the full stack) in Portainer so the broker loads the new configuration file.

## Node-RED IoT Flow Example

In Node-RED (`http://pi:1880`), install `node-red-contrib-influxdb` from **Menu → Manage palette → Install**, then create this flow:

```text
MQTT In (topic: sensors/temperature)
    ↓
JSON Parse
    ↓
Function (transform data)
    ↓
InfluxDB Out (bucket: iot, measurement: temperature)
```

Node-RED flow imports are complete JSON exports rather than short two-node snippets. After you configure the MQTT broker and InfluxDB server nodes in the editor, use **Menu → Export** to save the full flow JSON and **Menu → Import** to reuse it. For InfluxDB 2.x, configure the InfluxDB node with the server URL (`http://influxdb:8086` inside the stack), organization (`homelab`), bucket (`iot`), and an API token from InfluxDB.

## Enabling GPIO Access for Pi

For containers that need GPIO pin access:

```yaml
services:
  gpio-app:
    image: myapp:latest
    devices:
      - /dev/gpiomem:/dev/gpiomem
    group_add:
      - gpio
```

## Accessing Services

| Service | URL | Default Credentials |
|---------|-----|---------------------|
| Portainer | `https://pi:9443` | Set on first run |
| Node-RED | `http://pi:1880` | None (secure it!) |
| InfluxDB | `http://pi:8086` | admin / INFLUXDB_PASSWORD |
| Grafana | `http://pi:3000` | admin / GRAFANA_PASSWORD |

## Conclusion

Portainer on a Raspberry Pi creates a practical IoT gateway that can receive sensor data via MQTT, process it through Node-RED, store it in InfluxDB, and visualize it in Grafana. Managing all four services through Portainer simplifies updates, log viewing, and stack-level restarts when developing IoT applications.
