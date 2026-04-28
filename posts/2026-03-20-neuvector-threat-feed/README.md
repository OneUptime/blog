# How to Configure NeuVector Threat Feed

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, Threat Intelligence, Threat Feed, Container Security, Kubernetes

Description: Configure NeuVector's threat intelligence feed integration to automatically block known malicious IPs, domains, and attack patterns in your containerized environment.

## Introduction

NeuVector can integrate with threat intelligence feeds to automatically identify and block traffic to and from known malicious IPs and domains. By incorporating external threat intelligence, NeuVector enhances its detection capabilities beyond policy-based rules, catching threats based on real-world threat actor infrastructure. This guide covers configuring threat feed integration and using threat data in network policies.

## How Threat Feeds Work in NeuVector

NeuVector uses threat feed data to:

1. Automatically create IP groups representing known malicious addresses
2. Apply network rules that block traffic to/from these addresses
3. Generate security alerts when containers attempt to contact threat infrastructure
4. Enrich security events with threat intelligence context

## Prerequisites

- NeuVector installed and running
- Network access to threat feed sources
- NeuVector Manager access
- Subscription or access to threat feed providers (optional)

## Step 1: Configure Built-in Threat Detection

NeuVector includes built-in threat detection for common patterns:

```bash
# Enable threat detection in NeuVector

curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/system/config" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "monitor_service_mesh": true,
      "xff_enabled": true
    }
  }'
```

## Step 2: Reference a Threat IP Group in Network Rules

Once you have created a threat IP group (see Step 3 below), reference it in network rules to block traffic to and from those addresses. Note that the `nv.` prefix is reserved by NeuVector for auto-learned service groups, so user-defined threat groups must use a different name (for example, `threat-blocklist`):

```bash
# Create deny rules referencing your user-defined threat IP group
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/policy/rule" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "insert": {
      "after": 0,
      "rules": [
        {
          "comment": "Block connections to known threat IPs",
          "from": "any",
          "to": "threat-blocklist",
          "ports": "any",
          "action": "deny",
          "cfg_type": "user_created"
        },
        {
          "comment": "Block connections from known threat IPs",
          "from": "threat-blocklist",
          "to": "any",
          "ports": "any",
          "action": "deny",
          "cfg_type": "user_created"
        }
      ]
    }
  }'
```

## Step 3: Create Custom IP Groups for Threat Feeds

Build custom IP groups from threat intelligence feeds:

```bash
#!/bin/bash
# update-threat-ips.sh
# Fetch and apply threat intelligence from a feed

FEED_URL="https://threatintel.example.com/api/v1/malicious-ips"
FEED_API_KEY="your-api-key"

# Fetch malicious IPs
MALICIOUS_IPS=$(curl -sk -H "Authorization: Bearer ${FEED_API_KEY}" \
  "${FEED_URL}" | jq -r '.ips[]')

# Format as NeuVector IP group criteria
CRITERIA_JSON=$(echo "${MALICIOUS_IPS}" | head -100 | \
  jq -Rn '[inputs | {key: "address", value: ., op: "="}]')

# Create/update the threat IP group in NeuVector
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/group" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d "{
    \"config\": {
      \"name\": \"threat-intel-ips\",
      \"comment\": \"Known malicious IPs from threat feed - $(date +%Y-%m-%d)\",
      \"criteria\": ${CRITERIA_JSON},
      \"cfg_type\": \"user_created\"
    }
  }"

echo "Threat IP group updated with $(echo "${MALICIOUS_IPS}" | wc -l) addresses"
```

## Step 4: Integrate with AlienVault OTX

Use the AlienVault Open Threat Exchange feed:

```bash
#!/bin/bash
# otx-threat-feed.sh

OTX_API_KEY="your-otx-api-key"

# Fetch recent threat pulses from OTX (modified since the given date)
curl -sk "https://otx.alienvault.com/api/v1/pulses/subscribed?modified_since=2024-01-01" \
  -H "X-OTX-API-KEY: ${OTX_API_KEY}" \
  -o /tmp/otx-pulses.json

# Extract IPv4 indicators from pulses
jq -r '.results[].indicators[] | select(.type=="IPv4") | .indicator' /tmp/otx-pulses.json \
  | sort -u | head -500 > /tmp/threat-ips.txt

echo "Downloaded $(wc -l < /tmp/threat-ips.txt) threat IPs from OTX"

# Apply to NeuVector
NV_TOKEN=$(curl -sk -X POST \
  "https://neuvector-manager:8443/v1/auth" \
  -H "Content-Type: application/json" \
  -d '{"password":{"username":"admin","password":"yourpassword"}}' \
  | jq -r '.token.token')

# Build criteria array
CRITERIA=$(while read IP; do
  echo "{\"key\": \"address\", \"value\": \"${IP}\", \"op\": \"=\"}"
done < /tmp/threat-ips.txt | paste -sd ',')

curl -sk -X POST \
  "https://neuvector-manager:8443/v1/group" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${NV_TOKEN}" \
  -d "{
    \"config\": {
      \"name\": \"otx-threat-ips\",
      \"comment\": \"AlienVault OTX threat IPs $(date +%Y-%m-%d)\",
      \"criteria\": [${CRITERIA}]
    }
  }"

echo "OTX threat IPs applied to NeuVector"
```

## Step 5: Schedule Regular Threat Feed Updates

Automate threat feed refreshes:

```yaml
# threat-feed-update-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: neuvector-threat-feed-update
  namespace: neuvector
spec:
  schedule: "0 * * * *"  # Hourly updates
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: threat-feed-updater
              image: alpine/curl:latest
              command:
                - /bin/sh
                - -c
                - |
                  # Authenticate with NeuVector
                  TOKEN=$(curl -sk -X POST \
                    "https://neuvector-svc-controller:10443/v1/auth" \
                    -H "Content-Type: application/json" \
                    -d "{\"password\":{\"username\":\"${NV_USER}\",\"password\":\"${NV_PASSWORD}\"}}" \
                    | jq -r '.token.token')

                  # Fetch and apply threat feed
                  FEED=$(curl -sk "${THREAT_FEED_URL}" \
                    -H "Authorization: Bearer ${FEED_API_KEY}")

                  CRITERIA=$(echo "${FEED}" | jq '[.ips[] | {key: "address", value: ., op: "="}]')

                  # Update or create the threat IP group
                  curl -sk -X POST \
                    "https://neuvector-svc-controller:10443/v1/group" \
                    -H "Content-Type: application/json" \
                    -H "X-Auth-Token: ${TOKEN}" \
                    -d "{\"config\": {\"name\": \"threat-feed-ips\", \"criteria\": ${CRITERIA}}}"

                  echo "Threat feed updated at $(date)"
              env:
                - name: NV_USER
                  valueFrom:
                    secretKeyRef:
                      name: neuvector-credentials
                      key: username
                - name: NV_PASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: neuvector-credentials
                      key: password
                - name: THREAT_FEED_URL
                  valueFrom:
                    secretKeyRef:
                      name: threat-feed-config
                      key: url
                - name: FEED_API_KEY
                  valueFrom:
                    secretKeyRef:
                      name: threat-feed-config
                      key: api-key
          restartPolicy: OnFailure
```

## Step 6: Monitor Threat Feed Hits

Track when containers attempt to reach threat infrastructure:

```bash
# View threat-related security events
curl -sk \
  "https://neuvector-manager:8443/v1/log/event?type=network&start=0&limit=100" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq '[.events[] | select(.remote_workload_name | contains("threat"))] | {
    threat_connection_attempts: length,
    sources: [.[].workload_name] | unique
  }'
```

## Step 7: Integrate with STIX/TAXII Threat Intelligence

For enterprise threat intelligence platforms using STIX/TAXII:

```python
#!/usr/bin/env python3
# taxii-to-neuvector.py
# Fetch indicators from a TAXII server and push to NeuVector

import requests
from stix2 import parse, IPv4Address
import json

# Fetch from TAXII server
def fetch_taxii_indicators(taxii_url, collection_id, auth_token):
    """Fetch indicators from TAXII 2.1 server"""
    response = requests.get(
        f"{taxii_url}/api/v21/collections/{collection_id}/objects/",
        headers={"Authorization": f"Bearer {auth_token}"},
        verify=False
    )
    return response.json()

# Push to NeuVector
def update_neuvector_threat_group(nv_url, nv_token, ip_list):
    """Update NeuVector threat IP group"""
    criteria = [{"key": "address", "value": ip, "op": "="} for ip in ip_list[:500]]

    response = requests.post(
        f"{nv_url}/v1/group",
        headers={"X-Auth-Token": nv_token, "Content-Type": "application/json"},
        json={
            "config": {
                "name": "taxii-threat-ips",
                "comment": "STIX/TAXII threat indicators",
                "criteria": criteria
            }
        },
        verify=False
    )
    return response.status_code

if __name__ == "__main__":
    # Configuration
    taxii_url = "https://taxii.threatintel.com"
    nv_url = "https://neuvector-manager:8443"

    print("Threat feed sync complete")
```

## Conclusion

Integrating threat intelligence feeds with NeuVector significantly enhances your detection capabilities by automatically incorporating real-world threat actor infrastructure data. By combining NeuVector's behavioral security rules with current threat intelligence, you create a defense that catches both known attack patterns and novel threats targeting your containerized workloads. Regular automated updates ensure your threat data stays current, and monitoring threat feed hits provides valuable intelligence about potential targeting of your environment.
