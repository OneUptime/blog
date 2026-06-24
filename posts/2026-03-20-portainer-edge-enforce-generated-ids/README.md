# How to Enforce Portainer-Generated Edge IDs - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Edge Agent, Edge ID, Security, Identity

Description: Configure Portainer to enforce server-generated Edge IDs for edge agents, preventing ID spoofing and ensuring each device has a unique verified identity.

## Introduction

By default, edge agents can self-report any Edge ID, which means two devices could claim the same ID causing conflicts, or a device could claim an existing device's ID. Portainer Business Edition can enforce server-generated Edge IDs for manually created edge agents, ensuring each ID is unique, verified, and authorized.

## Why Edge ID Management Matters

Without enforcement:
- Any agent can use any Edge ID
- ID collisions are possible
- Unauthorized devices could claim a legitimate device's ID

With enforcement:
- For manually created environments, Portainer generates and owns the Edge IDs
- Each ID is unique and authenticated
- Devices must be pre-registered before connecting

## Enabling Edge ID Enforcement

### Via Settings UI

1. Go to **Settings** → **Edge Compute**
2. Enable **Enforce use of Portainer-generated edge IDs**
3. Save settings

### Via API

```bash
PORTAINER_URL="https://portainer.example.com:9443"

TOKEN=$(curl -s -X POST \
  "${PORTAINER_URL}/api/auth" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/settings" \
  -d '{
    "EnforceEdgeID": true
  }'
```

## Pre-Registering Edge Devices

With enforcement enabled, create environments before deploying agents:

```bash
# Create edge environment (Portainer generates the Edge ID when enforcement is enabled)

NEW_ENV=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -F "Name=Store-Location-42" \
  -F "EndpointCreationType=4" \
  -F "URL=${PORTAINER_URL}" \
  -F "ContainerEngine=docker" \
  "${PORTAINER_URL}/api/endpoints")

# Get the Portainer-generated Edge ID and Key
ENV_ID=$(printf '%s' "$NEW_ENV" | python3 -c "import sys,json; print(json.load(sys.stdin)['Id'])")
EDGE_ID=$(printf '%s' "$NEW_ENV" | python3 -c "import sys,json; print(json.load(sys.stdin).get('EdgeID',''))")
EDGE_KEY=$(printf '%s' "$NEW_ENV" | python3 -c "import sys,json; print(json.load(sys.stdin).get('EdgeKey',''))")

echo "Environment ID: $ENV_ID"
echo "Edge ID (from Portainer): $EDGE_ID"
echo "Edge Key: $EDGE_KEY"
```

## Deploying with Portainer-Generated ID

Match the agent image tag to your Portainer Server version. For example:

```bash
# Use the Portainer-generated Edge ID (do NOT use a custom one)
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
  portainer/agent:lts
```

## Bulk Pre-Registration

Register multiple devices in advance:

```bash
#!/bin/bash
# pre-register-devices.sh

TOKEN="your-admin-token"
PORTAINER_URL="https://portainer.example.com:9443"

# Device names to pre-register
DEVICES=("Store-001" "Store-002" "Store-003" "Store-004" "Store-005")

> device-credentials.csv
echo "name,edge_id,edge_key" >> device-credentials.csv

for device in "${DEVICES[@]}"; do
  RESPONSE=$(curl -s -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -F "Name=${device}" \
    -F "EndpointCreationType=4" \
    -F "URL=${PORTAINER_URL}" \
    -F "ContainerEngine=docker" \
    "${PORTAINER_URL}/api/endpoints")

  EDGE_ID=$(printf '%s' "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('EdgeID',''))")
  EDGE_KEY=$(printf '%s' "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('EdgeKey',''))")

  echo "${device},${EDGE_ID},${EDGE_KEY}" >> device-credentials.csv
  echo "Registered: $device (ID: $EDGE_ID)"
done

echo "Credentials saved to device-credentials.csv"
```

## Impact on Auto-Onboarding

This setting only applies to manually created environments. Auto-onboarding still uses the auto-onboarding Edge key flow and an agent-generated Edge ID, so if you need Portainer-generated Edge IDs you should pre-register environments and deploy agents with the `EDGE_ID` and `EDGE_KEY` returned by Portainer.

## Conclusion

Enforcing Portainer-generated Edge IDs provides stronger identity guarantees for manually pre-registered edge deployments. Each device's identity is controlled by the Portainer server, not self-reported by the device. This is especially important in security-conscious deployments or when edge devices operate in shared or untrusted network environments.
