# How to Set Up Edge Compute for Manufacturing Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Edge Computing, Manufacturing, Industrial

Description: Learn how to design and deploy a Portainer-based edge compute architecture for manufacturing environments including production lines and factory floors.

## Introduction

Manufacturing environments require edge compute for real-time data acquisition, quality control, predictive maintenance, and operational dashboards. Portainer provides the management layer to deploy and maintain containerized workloads on factory floor hardware - from ruggedized industrial PCs to DIN-rail-mounted edge gateways.

## Prerequisites

- Portainer Business Edition on a central server with Edge Compute enabled
- Linux-based edge devices with Docker and the Portainer Edge Agent (x86 or ARM)
- Outbound network access from factory floor devices to the Portainer server
- Understanding of industrial protocols (OPC-UA, Modbus, MQTT)

## Manufacturing Edge Reference Architecture

A typical manufacturing edge deployment includes:

- **Level 0-1** (Field Devices): PLCs, sensors, actuators (not containerized)
- **Level 2** (Control Layer): SCADA/HMI systems
- **Level 3** (Edge Layer): Edge gateways running Docker + Portainer Edge Agent
- **Level 4** (Enterprise Layer): Portainer server, data lake, analytics

## Step 1: Configure Edge Devices for Factory Use

Industrial gateways often need specific OS-level configuration:

```bash
#!/bin/bash
# factory-edge-setup.sh

# Prepare an industrial Linux device for edge computing

# Disable swap for deterministic latency on these hosts
swapoff -a
sed -i '/swap/d' /etc/fstab

# Set CPU governor to performance mode
for cpu in /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor; do
    [ -f "${cpu}" ] || continue
    echo performance > "${cpu}"
done

# Configure Docker daemon for industrial use
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "5"
  },
  "live-restore": true,
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 64000,
      "Soft": 64000
    }
  }
}
EOF

systemctl restart docker
```

## Step 2: Deploy the Manufacturing Edge Stack

Create this as an Edge Stack in Portainer targeting your `Manufacturing` edge group:

```yaml
# manufacturing-edge-stack.yml

services:
  # OPC-UA client: reads data from PLCs
  opcua-client:
    image: myorg/opcua-client:1.5
    restart: always
    environment:
      - OPCUA_SERVER_URL=opc.tcp://192.168.10.5:4840  # PLC address
      - MQTT_HOST=mosquitto
      - POLL_INTERVAL_MS=500  # Read PLC data every 500ms
    networks:
      - factory-net

  # MQTT broker: local message bus
  mosquitto:
    image: eclipse-mosquitto:2.0
    restart: always
    ports:
      - "1883:1883"
    volumes:
      - mosquitto_data:/mosquitto/data
      - /etc/edge-configs/mosquitto.conf:/mosquitto/config/mosquitto.conf:ro
    networks:
      - factory-net

  # Edge analytics: process data before sending to cloud
  edge-analytics:
    image: myorg/edge-analytics:2.0
    restart: always
    environment:
      - MQTT_HOST=mosquitto
      - ANOMALY_THRESHOLD=${ANOMALY_THRESHOLD:-3.0}
      - UPSTREAM_INFLUX=${INFLUX_UPSTREAM_URL}
    networks:
      - factory-net
    deploy:
      resources:
        limits:
          # Limit analytics container to 1 CPU and 512MB RAM
          cpus: '1.0'
          memory: 512M

  # Local time-series storage
  influxdb:
    image: influxdb:2.7-alpine
    restart: always
    ports:
      - "8086:8086"
    environment:
      - DOCKER_INFLUXDB_INIT_MODE=setup
      - DOCKER_INFLUXDB_INIT_USERNAME=admin
      - DOCKER_INFLUXDB_INIT_PASSWORD=${INFLUXDB_PASSWORD}
      - DOCKER_INFLUXDB_INIT_ADMIN_TOKEN=${INFLUXDB_ADMIN_TOKEN}
      - DOCKER_INFLUXDB_INIT_ORG=factory
      - DOCKER_INFLUXDB_INIT_BUCKET=production
    volumes:
      - influxdb_data:/var/lib/influxdb2
    networks:
      - factory-net

  # HMI dashboard (local operator view)
  grafana:
    image: grafana/grafana:10.3.0
    restart: always
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
      - GF_SERVER_DOMAIN=${DEVICE_HOSTNAME:-localhost}
    volumes:
      - grafana_data:/var/lib/grafana
      - /etc/edge-configs/grafana-dashboards:/etc/grafana/provisioning/dashboards:ro
    networks:
      - factory-net

networks:
  factory-net:
    driver: bridge

volumes:
  mosquitto_data:
  influxdb_data:
  grafana_data:
```

## Step 3: Integrate Modbus Devices

Many factory devices use Modbus TCP/RTU. Deploy a Modbus-to-MQTT bridge:

```yaml
# Add to your stack for Modbus integration
  modbus-bridge:
    image: myorg/modbus-mqtt-bridge:1.2
    restart: always
    environment:
      - MODBUS_HOST=192.168.10.10  # Modbus device IP
      - MODBUS_PORT=502
      - MQTT_HOST=mosquitto
      - MODBUS_REGISTERS=40001,40002,40003  # Holding registers to read
      - POLL_INTERVAL=1000  # ms
    devices:
      # For Modbus RTU (serial)
      - /dev/ttyS0:/dev/ttyS0
    networks:
      - factory-net
```

## Step 4: Configure Network Isolation

Factory networks often require strict segmentation:

```yaml
# Use separate Docker networks for different zones
networks:
  # OT network: PLC-facing containers only
  ot-net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/24

  # IT network: containers that communicate with enterprise systems
  it-net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.21.0.0/24

services:
  opcua-client:
    networks:
      - ot-net   # Only on OT network

  edge-analytics:
    networks:
      - ot-net   # Receives from OT
      - it-net   # Sends to enterprise
```

## Step 5: Handle Production Shifts and Maintenance Windows

Use Edge Jobs to trigger tasks on shift changes:

```bash
#!/bin/sh
# shift-change-job.sh
# Runs at shift change to record a shift-change event

set -eu

: "${DEVICE_ID:?Set DEVICE_ID before running this job}"
: "${INFLUXDB_ADMIN_TOKEN:?Set INFLUXDB_ADMIN_TOKEN before running this job}"

EVENT_TIME_UNIX=$(date +%s)
EVENT_TIME_UTC=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Edge Jobs run on the host, so use the published InfluxDB port
curl -fsS --request POST "http://localhost:8086/api/v2/write?org=factory&bucket=production&precision=s" \
  -H "Authorization: Token ${INFLUXDB_ADMIN_TOKEN}" \
  -H "Content-Type: text/plain; charset=utf-8" \
  --data-raw "shift_event,device=${DEVICE_ID} type=\"shift_change\" ${EVENT_TIME_UNIX}"

echo "Shift change recorded: ${DEVICE_ID} at ${EVENT_TIME_UTC}"
```

## Best Practices

- **Separate OT and IT networks** using Docker network segmentation.
- **Never expose PLC-facing containers to the internet** - use a DMZ architecture.
- **Use hardware watchdog timers** on gateways for automatic recovery.
- **Test stack updates during maintenance windows** to avoid production disruption.
- **Keep edge analytics local** - reduce latency by processing at the edge, not the cloud.

## Conclusion

Portainer enables a modern, containerized approach to manufacturing edge compute without abandoning the reliability requirements of the factory floor. By combining Docker's workload isolation with Portainer's central management and Edge Stacks, you can deploy and manage complex industrial applications across your factory network with the same tools used in modern cloud environments.
