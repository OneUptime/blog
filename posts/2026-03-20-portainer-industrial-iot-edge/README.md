# How to Set Up Portainer for Industrial IoT Edge Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Edge Computing, IoT, Industrial

Description: Learn how to configure Portainer for managing containerized workloads on industrial IoT edge devices including PLCs, gateways, and HMI systems.

## Introduction

Industrial IoT (IIoT) environments present unique challenges: constrained hardware, unreliable connectivity, strict uptime requirements, and the need to run OT (Operational Technology) protocols alongside modern containerized apps. Portainer's Edge Compute capabilities are well-suited for managing these environments from a central control plane.

## Prerequisites

- Portainer Business Edition (BE) installed on a central server
- Linux-based edge devices (e.g., industrial PCs, Raspberry Pi 4, NVIDIA Jetson, or x86 gateways)
- Docker Engine installed on edge devices
- Network connectivity (even intermittent) from edge devices to the Portainer server on ports `9443` and `8000`

## IIoT Edge Architecture Overview

A typical IIoT edge setup with Portainer looks like this:

- **Portainer Server**: Runs in your data center or cloud.
- **Edge Gateways**: Industrial PCs running Docker + Portainer Edge Agent.
- **Containers on Gateways**:
  - OPC-UA server/client
  - MQTT broker
  - Data preprocessing containers
  - Time-series database (InfluxDB, TimescaleDB)
  - Visualization (Grafana)

## Step 1: Install Docker on Edge Hardware

For Debian/Ubuntu-based industrial Linux:

```bash
#!/bin/bash
# Install Docker Engine on an industrial Linux gateway

# Update package index

apt-get update

# Install prerequisites
apt-get install -y \
    ca-certificates \
    curl

# Create the keyring directory
install -m 0755 -d /etc/apt/keyrings

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

# Add Docker repository
cat <<EOF > /etc/apt/sources.list.d/docker.sources
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

# Install Docker
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Enable and start Docker
systemctl enable docker
systemctl start docker
```

## Step 2: Deploy the Portainer Edge Agent

In Portainer, create a new Edge environment and copy the generated Edge ID and Edge Key. If your Portainer server uses a self-signed certificate, also add `-e EDGE_INSECURE_POLL=1` to the command below. Then on each device:

```bash
#!/bin/bash
# Deploy Portainer Edge Agent on IIoT gateway
# Designed for intermittent connectivity environments

EDGE_ID="your-edge-id-from-portainer"
EDGE_KEY="your-edge-key-from-portainer"
PORTAINER_AGENT_IMAGE="portainer/agent:lts"  # Match this to your Portainer Server release

docker run -d \
  --name portainer_edge_agent \
  --restart always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  -v /:/host \
  -v portainer_agent_data:/data \
  -e EDGE=1 \
  -e EDGE_ID="${EDGE_ID}" \
  -e EDGE_KEY="${EDGE_KEY}" \
  "${PORTAINER_AGENT_IMAGE}"
```

## Step 3: Deploy a Standard IIoT Edge Stack

Create this as an Edge Stack in Portainer and deploy it to your `IIoT-Gateways` group:

```yaml
# iiot-gateway-stack.yml
# Standard stack for industrial IoT edge gateways

services:
  # MQTT broker for device communication
  mosquitto:
    image: eclipse-mosquitto:2.0
    restart: always
    ports:
      - "1883:1883"   # MQTT
      - "8883:8883"   # MQTT over TLS
    volumes:
      - mosquitto_data:/mosquitto/data
      - mosquitto_logs:/mosquitto/log
      - /etc/edge-configs/mosquitto.conf:/mosquitto/config/mosquitto.conf:ro

  # Azure OPC Publisher for OPC-UA data collection
  opcua-publisher:
    image: mcr.microsoft.com/iotedge/opc-publisher:latest
    restart: always
    command: ["--pf=/appdata/pn.json"]
    environment:
      - PCS_IOTHUB_CONNSTRING=${IOT_HUB_CONNECTION_STRING}
    volumes:
      - /etc/edge-configs/pn.json:/appdata/pn.json:ro

  # Time-series database for local data storage
  influxdb:
    image: influxdb:2.7-alpine
    restart: always
    ports:
      - "8086:8086"
    environment:
      - DOCKER_INFLUXDB_INIT_MODE=setup
      - DOCKER_INFLUXDB_INIT_USERNAME=admin
      - DOCKER_INFLUXDB_INIT_PASSWORD=${INFLUXDB_PASSWORD}
      - DOCKER_INFLUXDB_INIT_ORG=myorg
      - DOCKER_INFLUXDB_INIT_BUCKET=sensors
    volumes:
      - influxdb_data:/var/lib/influxdb2
      - influxdb_config:/etc/influxdb2

  # Visualization dashboard
  grafana:
    image: grafana/grafana:latest
    restart: always
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
      - GF_PATHS_DATA=/var/lib/grafana
    volumes:
      - grafana_data:/var/lib/grafana
    depends_on:
      - influxdb

volumes:
  mosquitto_data:
  mosquitto_logs:
  influxdb_data:
  influxdb_config:
  grafana_data:
```

## Step 4: Handle Device Permissions for Hardware Access

Industrial devices often need container access to serial ports, USB devices, or GPIOs:

```yaml
# Add to your service definition for hardware access
services:
  plc-connector:
    image: myorg/plc-connector:1.0
    restart: always
    # Map serial ports for PLC communication
    devices:
      - /dev/ttyS0:/dev/ttyS0   # RS-232 serial port
      - /dev/ttyUSB0:/dev/ttyUSB0  # USB-serial adapter
    group_add:
      - dialout  # Add container user to dialout group for serial access
```

## Step 5: Configure Resilient Operation

IIoT devices must continue operating even when disconnected from Portainer:

```yaml
# All containers should use restart: always
# Also configure healthchecks for automatic recovery

services:
  data-collector:
    image: myorg/collector:2.0
    restart: always
    healthcheck:
      # Verify the collector is publishing data
      test: ["CMD", "curl", "-f", "http://localhost:9090/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 20s
```

## Best Practices for IIoT Edge

- **Design for offline-first**: Every container should work without cloud connectivity.
- **Use local persistence**: Store time-series data locally with forward sync.
- **Secure device access**: Use TLS for MQTT, restrict container capabilities.
- **Monitor resource usage**: Industrial gateways often have limited RAM (2-4 GB).
- **Stage deployments**: Test firmware/stack updates on a test gateway before fleet rollout.

## Conclusion

Portainer provides a reliable management layer for IIoT edge deployments. By combining Docker's containerization benefits with Portainer's central management, you can deploy, update, and monitor industrial workloads - OPC-UA servers, MQTT brokers, time-series databases - across your entire factory floor from a single pane of glass.
