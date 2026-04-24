# How to Set Up Automatic Edge Environment Onboarding in Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Edge Agent, Auto-Onboarding, IoT, Automation, Business Edition

Description: Configure automatic onboarding of Edge environments in Portainer Business Edition to streamline deployment of edge devices at scale.

## Introduction

Automatic edge onboarding allows you to pre-configure edge agents and have them self-register with Portainer without manual intervention for each device. This is essential for large-scale edge deployments with dozens or hundreds of devices.

## Prerequisites

- Portainer Business Edition
- Edge computing features enabled
- Network access from devices to the Portainer API port and tunnel port (`9443` and `8000` by default)

## Step 1: Enable Automatic Edge Onboarding

1. Log in to Portainer Business Edition
2. Go to **Settings** → **Edge Compute**
3. Enable **Edge Compute features**
4. Set **Portainer API server URL** and **Portainer tunnel server address**
5. Save settings
6. Go to **Environment-related** → **Auto onboarding**

## Step 2: Create a Pre-Staged Edge Key

Generate a general edge key that multiple agents can use:

```bash
TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Generate a general Edge key for auto-onboarding
EDGE_KEY=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/endpoints/edge/generate-key \
  -d '{}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['edgeKey'])")
```

## Step 3: Pre-Stage Agent Deployment

Create a deployment script that all devices run during provisioning:

```bash
#!/bin/bash
# /opt/provision/install-portainer-agent.sh
# Run this during device initial setup/imaging

# Generate a unique device ID (use hardware identifier if possible)
DEVICE_ID=$(awk '/Serial/ {print $3; exit}' /proc/cpuinfo)
DEVICE_ID=${DEVICE_ID:-$(cat /etc/machine-id 2>/dev/null)}
DEVICE_ID=${DEVICE_ID:-$(hostname)}
DEVICE_ID=$(echo "$DEVICE_ID" | tr -d ' :')

# General Edge key from Portainer auto-onboarding
EDGE_KEY="pre-staged-edge-key"
# Match the agent image tag to your Portainer Server release.
AGENT_IMAGE="portainer/agent:lts"

echo "Installing Portainer Edge Agent for device: $DEVICE_ID"

# Set EDGE_INSECURE_POLL=1 if Portainer uses a self-signed certificate.
docker volume create portainer_agent_data >/dev/null

docker run -d \
  --name portainer_edge_agent \
  --restart always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  -v /:/host \
  -v portainer_agent_data:/data \
  -e EDGE=1 \
  -e EDGE_ID="$DEVICE_ID" \
  -e EDGE_KEY="$EDGE_KEY" \
  -e EDGE_INSECURE_POLL=0 \
  "$AGENT_IMAGE"

echo "Edge agent installed. Device will appear in Portainer as: $DEVICE_ID"
```

## Step 4: The Waiting Room

When the waiting room is enabled, new devices appear in the **Waiting Room** instead of being trusted immediately:

1. Go to **Edge Compute** → **Waiting Room**
2. Review new devices
3. Associate or reject each device
4. Associated devices become active environments

Or via API:

```bash
# List devices in waiting room
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "https://portainer.example.com/api/endpoints?edgeDeviceUntrusted=true" \
  | python3 -m json.tool

# Associate a device from the waiting room
ENDPOINT_ID=12
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/endpoints/edge/trust \
  -d "{\"EndpointIDs\":[${ENDPOINT_ID}]}"
```

## Fully Automated Onboarding (Skip Waiting Room)

For trusted environments, skip the waiting room:

1. Settings → Edge Compute
2. Disable **Enable Edge Environment Waiting Room**

Devices are immediately activated as environments when they connect.

## Conclusion

Automatic edge onboarding transforms device provisioning from a manual per-device process to an automated, scalable workflow. Pre-stage your edge key in device images, and new devices register themselves with Portainer on first boot. The Waiting Room provides a security checkpoint to review devices before granting full management access.
