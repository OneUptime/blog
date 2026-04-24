# How to List All Endpoints via the Portainer API - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, API, Endpoint, Automation, DevOps

Description: Learn how to list and filter all environments (endpoints) in Portainer via the REST API, including environment type filtering, pagination, and extracting endpoint IDs for further operations.

## Introduction

Portainer calls managed infrastructure "endpoints" (also referred to as "environments" in the UI). The API lets you list all endpoints, filter them by type (Docker, Kubernetes, ACI), and retrieve the endpoint IDs needed for scoped API operations. This is typically the first step in any Portainer automation script.

## Prerequisites

- Portainer CE or BE with at least one environment configured
- Valid JWT token or API access token
- `curl` and `jq` installed

## Step 1: List All Endpoints

```bash
PORTAINER_URL="https://portainer.example.com"
TOKEN="your-jwt-or-api-key"

# List all endpoints (using JWT)

curl -s -H "Authorization: Bearer $TOKEN" \
  "${PORTAINER_URL}/api/endpoints" | jq .

# List all endpoints (using API access token)
curl -s -H "X-API-Key: $TOKEN" \
  "${PORTAINER_URL}/api/endpoints" | jq .
```

## Step 2: Parse Endpoint Information

Extract useful fields from the response:

```bash
# Get a summary of all endpoints
curl -s -H "Authorization: Bearer $TOKEN" \
  "${PORTAINER_URL}/api/endpoints" | \
  jq '.[] | {
    id: .Id,
    name: .Name,
    type: .Type,
    url: .URL,
    status: .Status,
    group: .GroupId
  }'
```

Endpoint types:
- `1` - Docker environment
- `2` - Agent on Docker environment
- `3` - Azure environment
- `4` - Edge Agent on Docker environment
- `5` - Local Kubernetes environment
- `6` - Agent on Kubernetes environment
- `7` - Edge Agent on Kubernetes environment

## Step 3: Filter by Environment Type

```bash
# List only Docker Standalone environments (Type 1)
curl -s -H "Authorization: Bearer $TOKEN" \
  "${PORTAINER_URL}/api/endpoints" | \
  jq '[.[] | select(.Type == 1)] | .[] | {id: .Id, name: .Name}'

# List only Kubernetes environments (Type 5, 6, or 7)
curl -s -H "Authorization: Bearer $TOKEN" \
  "${PORTAINER_URL}/api/endpoints" | \
  jq '[.[] | select(.Type >= 5 and .Type <= 7)] | .[] | {id: .Id, name: .Name}'

# List active endpoints (Status 1 = up)
curl -s -H "Authorization: Bearer $TOKEN" \
  "${PORTAINER_URL}/api/endpoints" | \
  jq '[.[] | select(.Status == 1)] | .[] | {id: .Id, name: .Name, status: .Status}'
```

## Step 4: Get a Specific Endpoint by ID

```bash
ENDPOINT_ID=1

# Get details for endpoint ID 1
curl -s -H "Authorization: Bearer $TOKEN" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}" | jq .

# Get just the name and URL
curl -s -H "Authorization: Bearer $TOKEN" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}" | \
  jq '{name: .Name, url: .URL, type: .Type}'
```

## Step 5: Find an Endpoint by Name

```bash
ENDPOINT_NAME="production"

# Search for endpoint by name
ENDPOINT=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "${PORTAINER_URL}/api/endpoints" | \
  jq --arg name "$ENDPOINT_NAME" '.[] | select(.Name == $name)')

ENDPOINT_ID=$(printf '%s\n' "$ENDPOINT" | jq -r '.Id')
echo "Found endpoint '${ENDPOINT_NAME}' with ID: $ENDPOINT_ID"
```

## Step 6: Paginate Results for Large Deployments

The `/api/endpoints` endpoint supports pagination:

```bash
# Get first 10 endpoints
curl -s -H "Authorization: Bearer $TOKEN" \
  "${PORTAINER_URL}/api/endpoints?start=1&limit=10" | jq '.[] | .Name'

# Get endpoints 11-20
curl -s -H "Authorization: Bearer $TOKEN" \
  "${PORTAINER_URL}/api/endpoints?start=11&limit=10" | jq '.[] | .Name'

# Get all endpoints with search
curl -s -H "Authorization: Bearer $TOKEN" \
  "${PORTAINER_URL}/api/endpoints?search=production" | jq '.[] | {id: .Id, name: .Name}'
```

## Step 7: Full Example - Iterate Over All Endpoints

```bash
#!/bin/bash
# iterate-endpoints.sh - Perform an action on all endpoints

PORTAINER_URL="https://portainer.example.com"
TOKEN=$(curl -s -X POST "${PORTAINER_URL}/api/auth" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' | jq -r '.jwt')

echo "=== Portainer Environments ==="

# Get all endpoints
ENDPOINTS=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "${PORTAINER_URL}/api/endpoints")

TOTAL=$(printf '%s\n' "$ENDPOINTS" | jq 'length')
echo "Total environments: $TOTAL"
echo ""

# Iterate and display details
printf '%s\n' "$ENDPOINTS" | jq -c '.[]' | while read -r ENDPOINT; do
  ID=$(printf '%s\n' "$ENDPOINT" | jq -r '.Id')
  NAME=$(printf '%s\n' "$ENDPOINT" | jq -r '.Name')
  TYPE=$(printf '%s\n' "$ENDPOINT" | jq -r '.Type')
  STATUS=$(printf '%s\n' "$ENDPOINT" | jq -r '.Status')

  TYPE_NAME="Unknown"
  case $TYPE in
    1) TYPE_NAME="Docker environment" ;;
    2) TYPE_NAME="Agent on Docker environment" ;;
    3) TYPE_NAME="Azure environment" ;;
    4) TYPE_NAME="Edge Agent on Docker environment" ;;
    5) TYPE_NAME="Local Kubernetes environment" ;;
    6) TYPE_NAME="Agent on Kubernetes environment" ;;
    7) TYPE_NAME="Edge Agent on Kubernetes environment" ;;
  esac

  STATUS_NAME="Unknown"
  case $STATUS in
    1) STATUS_NAME="Up" ;;
    2) STATUS_NAME="Down" ;;
  esac

  echo "  [$ID] $NAME - Type: $TYPE_NAME - Status: $STATUS_NAME"

  # Get container count for Docker environments
  if [ "$TYPE" -eq 1 ] || [ "$TYPE" -eq 2 ]; then
    CONTAINER_COUNT=$(curl -s -H "Authorization: Bearer $TOKEN" \
      "${PORTAINER_URL}/api/endpoints/${ID}/docker/containers/json?all=true" 2>/dev/null | \
      jq 'length' 2>/dev/null || echo "N/A")
    echo "      Containers: $CONTAINER_COUNT"
  fi
done
```

## Conclusion

Listing endpoints via the Portainer API is the foundation of any automation script. Use endpoint IDs to scope subsequent API calls to specific environments, filter by type to work with only Docker or Kubernetes environments, and implement pagination for large deployments. Always store endpoint IDs dynamically by looking them up by name rather than hardcoding IDs, since they can change between deployments.
