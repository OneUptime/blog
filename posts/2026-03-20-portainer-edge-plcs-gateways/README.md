# How to Manage PLCs and Gateways with Portainer Edge

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Edge Computing, Industrial, PLC

Description: Learn how to use Portainer Edge to manage containerized applications that interface with PLCs and industrial gateways in OT environments.

## Introduction

Programmable Logic Controllers (PLCs) and industrial gateways are the backbone of operational technology (OT) environments. While you cannot containerize a PLC itself, you can containerize the software that communicates with it - protocol converters, data collectors, and SCADA connectors - and manage these containers centrally with Portainer Edge.

## Prerequisites

- Portainer Business Edition with Edge Compute features enabled
- Linux-based edge gateway (x86 or ARM) with Docker
- PLCs or industrial devices accessible on the local network
- Familiarity with industrial protocols (OPC-UA, Modbus, MQTT)

## Common PLC Integration Patterns

When managing PLCs with Portainer Edge, containers typically fulfill these roles:

1. **Protocol Converter**: Translates PLC protocols (OPC-UA, Modbus, EtherNet/IP) to MQTT or HTTP.
2. **Data Historian**: Stores time-series data from PLCs locally.
3. **Remote Access Proxy**: Provides secure remote access to PLC programming interfaces.
4. **Alarm Manager**: Processes PLC alarms and sends notifications.

## Step 1: Deploy a Protocol Converter Container

The most common pattern is OPC-UA → MQTT conversion. The example below shows the surrounding stack layout; replace the protocol-bridge images and environment variables with the ones documented by your chosen connector:

```yaml
# plc-integration-stack.yml

services:
  # OPC-UA to MQTT bridge
  # Reads PLC data via OPC-UA and publishes to MQTT
  opcua-mqtt-bridge:
    image: ict-industrials/node-opcua-mqtt:latest
    restart: always
    environment:
      # OPC-UA server on the PLC
      - OPC_UA_ENDPOINT=opc.tcp://192.168.1.100:4840
      # Polling interval in ms
      - POLL_INTERVAL=1000
      # MQTT broker address
      - MQTT_BROKER=mqtt://mosquitto:1883
      # Topic prefix for published data
      - TOPIC_PREFIX=factory/line1
    networks:
      - plc-net
    depends_on:
      - mosquitto

  # Modbus TCP to MQTT bridge
  # Reads holding registers from Modbus device
  modbus-mqtt:
    image: myorg/modbus-bridge:1.0
    restart: always
    environment:
      - MODBUS_HOST=192.168.1.200
      - MODBUS_PORT=502
      - MODBUS_SLAVE_ID=1
      - REGISTERS=40001-40020  # Read registers 40001-40020
      - MQTT_BROKER=mqtt://mosquitto:1883
      - POLL_INTERVAL_MS=500
    networks:
      - plc-net

  # MQTT broker
  mosquitto:
    image: eclipse-mosquitto:2.0
    restart: always
    ports:
      - "1883:1883"
    volumes:
      - mosquitto_data:/mosquitto/data
    networks:
      - plc-net

  # Data historian
  influxdb:
    image: influxdb:2.7-alpine
    restart: always
    ports:
      - "8086:8086"
    environment:
      - DOCKER_INFLUXDB_INIT_MODE=setup
      - DOCKER_INFLUXDB_INIT_USERNAME=admin
      - DOCKER_INFLUXDB_INIT_PASSWORD=${INFLUX_PASSWORD}
      - DOCKER_INFLUXDB_INIT_ORG=plant
      - DOCKER_INFLUXDB_INIT_BUCKET=plc_data
      - DOCKER_INFLUXDB_INIT_RETENTION=30d
      - DOCKER_INFLUXDB_INIT_ADMIN_TOKEN=${INFLUX_TOKEN}
    volumes:
      - influxdb_data:/var/lib/influxdb2
    networks:
      - plc-net

  # MQTT to InfluxDB writer
  telegraf:
    image: telegraf:1.30-alpine
    restart: always
    environment:
      - INFLUX_TOKEN=${INFLUX_TOKEN}
    volumes:
      - /etc/edge-configs/telegraf.conf:/etc/telegraf/telegraf.conf:ro
    networks:
      - plc-net
    depends_on:
      - mosquitto
      - influxdb

networks:
  plc-net:
    name: plc-net
    driver: bridge

volumes:
  mosquitto_data:
  influxdb_data:
```

## Step 2: Configure Telegraf for PLC Data Collection

Bundle this file in a ZIP package and distribute it as a Portainer Edge Configuration:

```toml
# telegraf.conf
# Subscribes to PLC data on MQTT and writes to InfluxDB

[agent]
  interval = "5s"
  flush_interval = "10s"

# Input: MQTT subscriber
[[inputs.mqtt_consumer]]
  servers = ["tcp://mosquitto:1883"]
  topics = [
    "factory/line1/#",
    "factory/line2/#"
  ]
  # Parse JSON payloads from the OPC-UA bridge
  data_format = "json"
  json_time_key = "timestamp"
  json_time_format = "unix_ms"

# Output: InfluxDB 2.x
[[outputs.influxdb_v2]]
  urls = ["http://influxdb:8086"]
  token = "${INFLUX_TOKEN}"
  organization = "plant"
  bucket = "plc_data"
```

## Step 3: Manage Multiple PLC Types via One Gateway

A single gateway can manage different PLCs by attaching protocol-specific connector containers to the same shared network as the broker:

```yaml
# multi-plc-stack.yml
# One gateway, multiple PLC integrations
services:
  # Siemens S7 PLC connector
  s7-connector:
    image: myorg/s7-connector:2.0
    restart: always
    environment:
      - PLC_IP=192.168.1.10
      - PLC_RACK=0
      - PLC_SLOT=1
      - MQTT_HOST=mosquitto
      - TOPIC=plc/siemens/s7-300
    networks:
      - plc-net

  # Allen-Bradley PLC connector (EtherNet/IP)
  ab-connector:
    image: myorg/ab-ethernetip:1.5
    restart: always
    environment:
      - PLC_IP=192.168.1.20
      - MQTT_HOST=mosquitto
      - TOPIC=plc/allen-bradley/controllogix
    networks:
      - plc-net

  # Generic Modbus TCP device
  modbus-device-1:
    image: myorg/modbus-bridge:1.0
    restart: always
    environment:
      - MODBUS_HOST=192.168.1.30
      - MQTT_HOST=mosquitto
      - TOPIC=sensors/temperature
    networks:
      - plc-net

networks:
  plc-net:
    external: true
    name: plc-net
```

## Step 4: Secure PLC Network Access

Use Docker network isolation to protect PLC networks:

```bash
# Create a macvlan network to bridge into the PLC network
docker network create \
  --driver macvlan \
  --subnet=192.168.1.0/24 \
  --gateway=192.168.1.1 \
  -o parent=eth1 \
  plc-macvlan

# Only PLC-facing containers should be on this network
# Containers on a macvlan network cannot communicate with the host directly
```

Or in compose:

```yaml
networks:
  plc-macvlan:
    driver: macvlan
    driver_opts:
      parent: eth1  # Dedicated PLC network interface
    ipam:
      config:
        - subnet: 192.168.1.0/24
          gateway: 192.168.1.1
```

## Step 5: Update PLC Connector Versions via Portainer

When a new version of a connector image is available:

1. Edit the Edge Stack in Portainer.
2. Update the image tag (e.g., `myorg/opcua-mqtt-bridge:1.5` → `1.6`).
3. Target the appropriate edge group.
4. Click **Update**.

Portainer rolls out the update to all gateways in the group without any SSH access.

## Best Practices

- **Never publish PLC-facing ports on untrusted networks** - keep PLC protocols on dedicated OT networks and expose only the northbound interfaces that need remote access.
- **Use dedicated network interfaces** for PLC communication (separate from management).
- **Log all PLC communication** for audit and troubleshooting purposes.
- **Test connector updates on a single gateway** before fleet-wide deployment.
- **Implement circuit breakers** in connector code to handle PLC communication failures gracefully.

## Conclusion

Portainer Edge makes managing the software layer around PLCs and industrial gateways as straightforward as managing any cloud application. By containerizing protocol converters, historians, and analytics engines - and managing them through Portainer Edge Stacks - you can apply modern DevOps practices to OT environments while preserving the reliability requirements of industrial operations.
