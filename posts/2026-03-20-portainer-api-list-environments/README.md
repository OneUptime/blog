# How to List and Manage Environments via the Portainer API - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, API, Environment, Management, Automation

Description: Learn how to list, create, update, and delete Portainer environments (endpoints) via the REST API for automated infrastructure management.

## Introduction

Portainer environments represent managed infrastructure - Docker hosts, Kubernetes clusters, ACI instances, and Edge agents. The Portainer API lets you automate full environment lifecycle management: adding new environments when new infrastructure is provisioned, updating settings, and decommissioning environments when infrastructure is retired.

## Prerequisites

- Portainer CE or BE with admin access
- Valid admin JWT token for the `Authorization: Bearer ...` examples below, or an API access token used via the `X-API-Key` header
- `curl` and `jq` installed

## Step 1: List All Environments

```bash
PORTAINER_URL="https://portainer.example.com"
JWT_TOKEN="your-admin-jwt"

# List all environments

curl -s -H "Authorization: Bearer $JWT_TOKEN" \
  "${PORTAINER_URL}/api/endpoints" | jq .

# Get a compact summary
curl -s -H "Authorization: Bearer $JWT_TOKEN" \
  "${PORTAINER_URL}/api/endpoints" | \
  jq '[.[] | {id: .Id, name: .Name, type: .Type, status: .Status, url: .URL}]'

# Count total environments
curl -s -H "Authorization: Bearer $JWT_TOKEN" \
  "${PORTAINER_URL}/api/endpoints" | jq 'length'
```

## Step 2: Get a Specific Environment

```bash
ENDPOINT_ID=1

# Get environment details
curl -s -H "Authorization: Bearer $JWT_TOKEN" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}" | jq .

# Get just the essential fields
curl -s -H "Authorization: Bearer $JWT_TOKEN" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}" | jq '{
    id: .Id,
    name: .Name,
    type: .Type,
    url: .URL,
    status: .Status,
    groupId: .GroupId,
    tags: .TagIds
  }'
```

## Step 3: Add a Docker Standalone Environment

```bash
# Add a Docker environment with TLS
curl -s -X POST \
  -H "Authorization: Bearer $JWT_TOKEN" \
  "${PORTAINER_URL}/api/endpoints" \
  -F "Name=production-docker" \
  -F "EndpointCreationType=1" \
  -F "URL=tcp://192.168.1.100:2376" \
  -F "TLS=true" \
  -F "TLSSkipVerify=false" \
  -F "TLSCACertFile=@/path/to/ca.pem" \
  -F "TLSCertFile=@/path/to/cert.pem" \
  -F "TLSKeyFile=@/path/to/key.pem" \
  -F "GroupID=1" | jq .

# Add a Docker environment over the local socket
curl -s -X POST \
  -H "Authorization: Bearer $JWT_TOKEN" \
  "${PORTAINER_URL}/api/endpoints" \
  -F "Name=local-docker" \
  -F "EndpointCreationType=1" | jq .
```

## Step 4: Add a Kubernetes Environment

Importing an existing Kubernetes environment via `kubeconfig` is a legacy workflow that is only available in Portainer Business Edition. Portainer's published API examples do not document a corresponding `curl` request for this flow, so verify the exact payload against your Portainer edition and version before automating Kubernetes environment creation.

## Step 5: Update an Environment

```bash
ENDPOINT_ID=1

# Update environment name
curl -s -X PUT \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}" \
  -d '{
    "Name": "production-docker-v2",
    "PublicURL": "https://docker.example.com"
  }' | jq .

# Update environment tags
curl -s -X PUT \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}" \
  -d '{"TagIDs": [1, 3, 5]}' | jq .

# Move environment to a different group
curl -s -X PUT \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}" \
  -d '{"GroupID": 2}' | jq .
```

## Step 6: Manage Environment Groups

```bash
# List all environment groups
curl -s -H "Authorization: Bearer $JWT_TOKEN" \
  "${PORTAINER_URL}/api/endpoint_groups" | jq .

# Create a new environment group
curl -s -X POST \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/endpoint_groups" \
  -d '{
    "Name": "Cloud Environments",
    "Description": "AWS, Azure, and GCP environments",
    "AssociatedEndpoints": [1, 2, 3]
  }' | jq .

# Update a group
GROUP_ID=2
curl -s -X PUT \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/endpoint_groups/${GROUP_ID}" \
  -d '{
    "Name": "Cloud Environments - Production",
    "Description": "Production cloud infrastructure"
  }' | jq .
```

## Step 7: Delete an Environment

```bash
ENDPOINT_ID=5

# Delete an environment (does NOT affect running containers/services)
if curl -fsS -X DELETE \
  -H "Authorization: Bearer $JWT_TOKEN" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}"; then
  echo "Environment $ENDPOINT_ID removed from Portainer."
fi
```

## Step 8: Sync Environment Status

```bash
#!/bin/bash
# check-environment-health.sh

PORTAINER_URL="https://portainer.example.com"
JWT_TOKEN="your-admin-jwt"

ENVIRONMENTS=$(curl -s -H "Authorization: Bearer $JWT_TOKEN" \
  "${PORTAINER_URL}/api/endpoints")

echo "=== Environment Health Report ==="
echo ""

echo "$ENVIRONMENTS" | jq -c '.[]' | while IFS= read -r ENV; do
  ID=$(jq -r '.Id' <<<"$ENV")
  NAME=$(jq -r '.Name' <<<"$ENV")
  STATUS=$(jq -r '.Status' <<<"$ENV")

  if [ "$STATUS" -eq 1 ]; then
    echo "UP    [$ID] $NAME"
  else
    echo "DOWN  [$ID] $NAME  *** ALERT ***"
  fi
done
```

## Conclusion

Managing Portainer environments via the API enables full automation of infrastructure registration and decommissioning. As you provision new Docker hosts, add them to Portainer automatically using CI/CD pipelines or Terraform. Use environment groups and tags to organize your infrastructure, and monitor environment health through regular API status checks integrated with your alerting systems. For Kubernetes environment imports, verify the exact workflow against your Portainer edition and version before automating it.
