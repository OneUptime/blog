# How to Set Up Portainer for Manufacturing OT Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Manufacturing, OT, ICS, Edge Computing, Automation

Description: Configure Portainer to manage containerized OPC-UA servers, MES integration services, and quality control applications in manufacturing OT environments with edge agent connectivity.

---

Modern manufacturing plants run a mix of OT (Operational Technology) systems - PLCs, SCADA, MES - and increasingly containerized middleware that bridges these systems to IT analytics platforms. Portainer manages these containerized workloads at the edge while respecting the isolation requirements of manufacturing OT networks.

## Manufacturing Container Use Cases

| Application | Container Role |
|---|---|
| OPC-UA Server | Expose PLC data over OPC-UA |
| MES Integration | Bridge SAP/Oracle MES to shop floor |
| Quality Vision | Run inference containers for vision QC |
| Energy Monitoring | Collect and forward energy meter data |
| Machine Learning | Edge inference for predictive maintenance |

## Step 1: Set Up Edge Groups by Production Line

Organize manufacturing equipment into Portainer Edge Groups by line or cell. Edge Groups require Portainer Edge Compute features to be enabled:

```text
Edge Group: line-1-assembly
Edge Group: line-2-painting
Edge Group: line-3-testing
Edge Group: utilities-monitoring
```

This enables targeted deployments - update only the assembly line containers without touching painting or testing.

## Step 2: Deploy OPC-UA Gateway Stack

```yaml
# opcua-gateway-stack.yml

services:
  opcua-server:
    image: industrial-registry.internal/opcua-bridge:2.4.1
    environment:
      - PLC_IP=192.168.100.10
      - PLC_RACK=0
      - PLC_SLOT=1
      - OPCUA_PORT=4840
    devices:
      # Profibus adapter if needed
      - /dev/ttyUSB0:/dev/ttyUSB0
    restart: unless-stopped
    network_mode: host

  data-forwarder:
    image: industrial-registry.internal/mqtt-forwarder:1.1.0
    environment:
      - OPCUA_ENDPOINT=opc.tcp://localhost:4840
      - MQTT_BROKER=mqtt://192.168.1.50:1883
      - PUBLISH_INTERVAL=1000
    depends_on:
      - opcua-server
    restart: unless-stopped
    network_mode: host
```

## Step 3: Edge Jobs for Maintenance Windows

Manufacturing plants often have weekly maintenance windows. Edge Jobs are host-level scheduled jobs in Portainer Edge Compute and are currently available on Docker Standalone environments that use `/etc/cron.d`. After updating the approved image tags in the stack definition, use an Edge Job to redeploy during the maintenance window:

```bash
#!/bin/bash
# Maintenance job - run during planned downtime
# Pull the image tags referenced by the compose file
docker compose -f /opt/stacks/opcua-gateway/opcua-gateway-stack.yml pull

# Recreate containers with the updated stack definition
docker compose -f /opt/stacks/opcua-gateway/opcua-gateway-stack.yml up -d --force-recreate --wait
```

Schedule the recurring Edge Job using the host's local time during the approved maintenance window (for example, Saturday 02:00-04:00).

## Step 4: Integrate with MES and SCADA

Pass environment variables for MES connectivity without hardcoding them in stack files:

```yaml
services:
  mes-integration:
    image: industrial-registry.internal/mes-bridge:3.0.0
    environment:
      - SAP_HOST=${SAP_HOST}
      - SAP_CLIENT=${SAP_CLIENT}
      - SAP_USER=${SAP_USER}
      - SAP_PASS=${SAP_PASS}
```

On Portainer Business Edition Docker Edge Stack deployments, store these variables in the stack's Environment Variables section, not in the stack file.

## Step 5: Container Health for Production Uptime

Configure health checks so Portainer surfaces unhealthy containers before they cause production issues:

```yaml
services:
  opcua-server:
    healthcheck:
      test: ["CMD", "nc", "-z", "127.0.0.1", "4840"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 15s
```

This example assumes the image includes `nc`; if it does not, use the image's own healthcheck command or script instead.

Set up monitoring integration (Prometheus + Alertmanager, or OneUptime) to alert the maintenance team when containers become unhealthy.

## Summary

Portainer Edge Agent enables centralized management of containerized OT applications across manufacturing cells without requiring Portainer to open inbound connections into the plant floor network. Edge Groups, scheduled jobs, and health checks give production teams the visibility and control they need while supporting the network segmentation practices commonly used in IEC 62443-aligned architectures.
