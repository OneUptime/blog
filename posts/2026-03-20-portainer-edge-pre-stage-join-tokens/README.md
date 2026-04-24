# How to Pre-Stage Edge Agents with Join Tokens

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Edge Agent, Join Token, Pre-Staging, IoT, Mass Deployment

Description: Pre-configure edge agents with join tokens during device manufacturing or provisioning for zero-touch onboarding when devices first connect to the network.

## Introduction

Pre-staging edge agents means embedding the Portainer Edge Key and configuration into a device's provisioning image before deployment. When the device powers on and connects to the network, it automatically registers with Portainer without any on-site configuration. This is essential for mass deployments to retail stores, branch offices, or IoT deployments.

## Understanding the Edge Key (Join Token)

- **Edge Key / Join Token**: In Portainer, the value passed as `EDGE_KEY` is the join token. It is a base64-encoded string containing the Portainer API URL, tunnel server address, tunnel server fingerprint, and environment identifier.

## Generating an Edge Key

```bash
TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# The Edge key is generated when you create an edge environment in Portainer.
# It is shown in the deployment command and returned in the API response.
EDGE_ENV=$(curl -s -X POST \
  https://portainer.example.com/api/endpoints \
  -H "Authorization: Bearer $TOKEN" \
  -F "Name=Pre-Staged Device Template" \
  -F "EndpointCreationType=4" \
  -F "ContainerEngine=docker" \
  -F "URL=https://portainer.example.com:9443" \
  -F "EdgeTunnelServerAddress=portainer.example.com:8000")

echo "Environment ID: $(echo "$EDGE_ENV" | python3 -c 'import sys,json; print(json.load(sys.stdin)["Id"])')"
echo "Edge Key: $(echo "$EDGE_ENV" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("EdgeKey",""))')"
```

## Device Provisioning Script

Create a provisioning script to embed in your device image:

```bash
#!/bin/bash
# /opt/device-provision.sh
# This script runs on first boot to register the device with Portainer

# Configuration baked into the image.
# The Portainer URL and tunnel settings are already embedded in EDGE_KEY.
EDGE_KEY="xxxxxx-base64-encoded-edge-key-xxxxxx"
PORTAINER_AGENT_IMAGE="portainer/agent:<matching-portainer-version>"
EDGE_INSECURE_POLL="0" # Set to 1 only if Portainer uses a self-signed certificate

# Generate device-unique ID from hardware
SERIAL=$({ cat /sys/class/dmi/id/product_serial 2>/dev/null || hostname; } | tr -cd '[:alnum:]-')
MAC=$(ip link | awk '/link\\/ether/ {print $2; exit}' | tr -d ':')
DEVICE_ID="device-${MAC:-$SERIAL}"

echo "Provisioning device: $DEVICE_ID"

# Install Docker if not present
command -v docker >/dev/null 2>&1 || curl -fsSL https://get.docker.com | sh

# Deploy Portainer Edge Agent
docker run -d \
  --name portainer_edge_agent \
  --restart always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  -v /:/host \
  -v portainer_agent_data:/data \
  -e EDGE=1 \
  -e EDGE_ID="${DEVICE_ID}" \
  -e EDGE_KEY="${EDGE_KEY}" \
  -e EDGE_INSECURE_POLL="${EDGE_INSECURE_POLL}" \
  "${PORTAINER_AGENT_IMAGE}"

echo "Device $DEVICE_ID registered with Portainer"

# Create provisioning marker so this script doesn't run again
touch /opt/.portainer-provisioned
```

## Systemd Service for Auto-Start

```bash
# /etc/systemd/system/portainer-provision.service
cat > /etc/systemd/system/portainer-provision.service << 'EOF'
[Unit]
Description=Portainer Edge Agent Provisioning
After=network-online.target docker.service
Wants=network-online.target
ConditionPathExists=!/opt/.portainer-provisioned

[Service]
Type=oneshot
ExecStart=/opt/device-provision.sh
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

systemctl enable portainer-provision.service
```

## Using Auto Onboarding for Multiple Devices

In Portainer Business Edition, use the Auto onboarding feature when you want multiple devices to share one onboarding key and appear in the Waiting Room for association:

1. Generate the deployment script and edge key from the Auto onboarding page
2. Use that shared auto-onboarding edge key for all devices
3. Each device registers with a unique `EDGE_ID`
4. Devices appear in the Waiting Room for association
5. Associated devices are added to Portainer as separate Edge environments

```bash
# All devices use the same auto-onboarding EDGE_KEY, but unique EDGE_ID
# Device 1:
docker run -d \
  --name portainer_edge_agent \
  --restart always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  -v /:/host \
  -v portainer_agent_data:/data \
  -e EDGE=1 \
  -e EDGE_ID=device-aabbccdd \
  -e EDGE_KEY=shared-auto-onboarding-key \
  -e EDGE_INSECURE_POLL=0 \
  portainer/agent:<matching-portainer-version>

# Device 2:
docker run -d \
  --name portainer_edge_agent \
  --restart always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  -v /:/host \
  -v portainer_agent_data:/data \
  -e EDGE=1 \
  -e EDGE_ID=device-11223344 \
  -e EDGE_KEY=shared-auto-onboarding-key \
  -e EDGE_INSECURE_POLL=0 \
  portainer/agent:<matching-portainer-version>
```

## Conclusion

Pre-staging edge agents with the Portainer Edge key (the join token passed as `EDGE_KEY`) enables zero-touch deployment at scale. Bake the edge key and provisioning script into your device image during manufacturing or initial setup, and devices self-register with Portainer on first power-on. Combined with Auto onboarding and the Waiting Room in Portainer Business Edition, this approach scales to thousands of devices with minimal operational overhead.
