# How to Use the Edge Environment Waiting Room in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Edge Agent, Waiting Room, Onboarding, Security

Description: Manage the Portainer Edge Waiting Room to review and approve new edge devices before they become active managed environments.

## Introduction

The Waiting Room in Portainer Business Edition is a security gate for edge auto-onboarding. When new edge devices connect using the auto-onboarding (pre-deploy) script and the waiting room is enabled, they enter the waiting room instead of immediately becoming active environments. An administrator reviews and associates each device, preventing unauthorized devices from joining your management plane. Manually added environments and edge devices bypass the waiting room.

## Accessing the Waiting Room

The Waiting Room menu item appears under **Edge compute** when Edge Compute features are enabled and the waiting room is turned on.

1. Go to **Edge compute** in Portainer's left menu
2. Click **Waiting Room**
3. Review pending devices

## What Appears in the Waiting Room

For each pending device:
- **Name**: The environment name
- **Edge ID**: The device's identifier
- **Edge Groups**: Any associated Edge Groups
- **Group**: The assigned environment group, if any
- **Tags**: Any associated tags
- **Last Check-in**: Most recent check-in time

## Associating Devices via UI

1. Check the checkbox next to one or more devices
2. Click **Associate Device** to activate them as managed environments
3. The environment appears in the Environments list
4. Configure access policies after association

## Bulk Operations via API

```bash
API_KEY="your-portainer-api-key"
PORTAINER_URL="https://portainer.example.com"

# List waiting room devices (untrusted Edge environments only; types 4 and 7 are Edge Agent environments)

curl -s \
  -H "X-API-Key: $API_KEY" \
  "${PORTAINER_URL}/api/endpoints?edgeDeviceUntrusted=true&types=4,7&excludeSnapshots=true" \
  | python3 -c "
import sys, json
from datetime import datetime, timezone

devices = json.load(sys.stdin)
print(f'Waiting devices: {len(devices)}')
for d in devices:
    last = d.get('LastCheckInDate')
    last = datetime.fromtimestamp(last, tz=timezone.utc).isoformat() if last else 'unknown'
    print(f'  ID: {d[\"Id\"]} | Name: {d.get(\"Name\", \"unnamed\")} | Edge ID: {d.get(\"EdgeID\", \"unknown\")} | Last check-in: {last}')
"

# Associate specific devices
curl -X POST \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/endpoints/edge/trust" \
  -d '{"EndpointIDs":[1,2,3]}'

# Associate all waiting devices (use carefully)
WAITING_PAYLOAD=$(curl -s \
  -H "X-API-Key: $API_KEY" \
  "${PORTAINER_URL}/api/endpoints?edgeDeviceUntrusted=true&types=4,7&excludeSnapshots=true" \
  | python3 -c "
import sys, json
devices = json.load(sys.stdin)
print(json.dumps({'EndpointIDs': [d['Id'] for d in devices]}))
")

curl -X POST \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/endpoints/edge/trust" \
  -d "$WAITING_PAYLOAD"

# Remove (hide) a device from the waiting room until the Edge Agent starts again
ENDPOINT_ID=5
curl -X DELETE \
  -H "X-API-Key: $API_KEY" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}"
```

## Automated Association Based on Device Attributes

For trusted device fleets, associate programmatically based on criteria such as an expected Edge ID naming convention:

```bash
#!/bin/bash
# auto-associate-trusted-devices.sh

API_KEY="your-portainer-api-key"
PORTAINER_URL="https://portainer.example.com"

# Get all waiting devices
WAITING=$(curl -s \
  -H "X-API-Key: $API_KEY" \
  "${PORTAINER_URL}/api/endpoints?edgeDeviceUntrusted=true&types=4,7&excludeSnapshots=true")

# Filter and associate devices with a trusted Edge ID prefix
TRUST_PAYLOAD=$(printf '%s' "$WAITING" | python3 -c "
import sys, json
devices = json.load(sys.stdin)
approved = [
    d['Id'] for d in devices
    if d.get('EdgeID', '').startswith('factory-a-')  # Trusted Edge ID prefix
]
print(json.dumps({'EndpointIDs': approved}, separators=(',', ':')))
")

if [ "$TRUST_PAYLOAD" != '{"EndpointIDs":[]}' ]; then
  echo "Associating devices: $TRUST_PAYLOAD"
  curl -s -X POST \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    "${PORTAINER_URL}/api/endpoints/edge/trust" \
    -d "$TRUST_PAYLOAD"
fi
```

## Skipping the Waiting Room

For fully automated, trusted deployments, skip the waiting room entirely:

1. Settings → Edge Compute → disable **Enable Edge Environment Waiting Room**
2. Click **Save settings**

This immediately associates all devices requesting association without waiting room review.

## Conclusion

The Waiting Room provides a human review gate between device provisioning and management access. It's the right balance for most organizations: automated provisioning (devices self-register) with human oversight (admin associates the device). For fully automated deployment pipelines, the API-based association and skip-waiting-room options provide the necessary flexibility.
