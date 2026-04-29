# How to List All Endpoints via the Portainer API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, API, Endpoint, Automation, REST API

Description: Learn how to list and filter all Portainer environments (endpoints) using the REST API for automation and scripting.

## Overview

In Portainer's API, "endpoints" refer to what the UI calls "environments" - your connected Docker, Kubernetes, and Swarm targets. The `/api/endpoints` endpoint lets you query them programmatically.

## Basic Listing

```bash
# List all endpoints

curl -s "https://portainer.mycompany.com/api/endpoints" \
  -H "X-API-Key: ${API_TOKEN}" | jq '.'
```

## Response Structure

```json
[
  {
    "Id": 1,
    "Name": "local-docker",
    "Type": 1,
    "URL": "unix:///var/run/docker.sock",
    "GroupId": 1,
    "Status": 1,
    "Snapshots": [...],
    "TagIds": []
  },
  {
    "Id": 2,
    "Name": "production-k8s",
    "Type": 5,
    "URL": "https://k8s-api.mycompany.com:6443",
    "GroupId": 2,
    "Status": 1
  }
]
```

## Endpoint Type Values

| Type | Description |
|------|-------------|
| 1 | Docker environment |
| 2 | Agent on Docker environment |
| 3 | Azure environment |
| 4 | Edge agent on Docker environment |
| 5 | Local Kubernetes environment |
| 6 | Agent on Kubernetes environment |
| 7 | Edge agent on Kubernetes environment |

## Filtering Endpoints

```bash
# Get only Kubernetes environments
curl -s "https://portainer.mycompany.com/api/endpoints" \
  -H "X-API-Key: ${API_TOKEN}" | \
  jq '[.[] | select(.Type == 5 or .Type == 6 or .Type == 7)]'

# Get endpoints by name
curl -s "https://portainer.mycompany.com/api/endpoints" \
  -H "X-API-Key: ${API_TOKEN}" | \
  jq '[.[] | select(.Name | contains("production"))]'

# Get only online endpoints (Status == 1)
curl -s "https://portainer.mycompany.com/api/endpoints" \
  -H "X-API-Key: ${API_TOKEN}" | \
  jq '[.[] | select(.Status == 1)] | {count: length, names: [.[].Name]}'
```

## Getting a Specific Endpoint by ID

```bash
# Get details of endpoint with ID 2
curl -s "https://portainer.mycompany.com/api/endpoints/2" \
  -H "X-API-Key: ${API_TOKEN}" | jq '.'
```

## Using Endpoint IDs in Other API Calls

Many Portainer API calls require an endpoint ID. Extract it for use in subsequent calls:

```bash
#!/bin/bash
# Get the ID of an endpoint by name

ENDPOINT_NAME="production-k8s"

ENDPOINT_ID=$(curl -s "https://portainer.mycompany.com/api/endpoints" \
  -H "X-API-Key: ${API_TOKEN}" | \
  jq --arg name "$ENDPOINT_NAME" '.[] | select(.Name == $name) | .Id')

echo "Endpoint ID for ${ENDPOINT_NAME}: ${ENDPOINT_ID}"

# Use in a subsequent API call (e.g., list stacks in that endpoint)
curl -s "https://portainer.mycompany.com/api/stacks?filters=%7B%22EndpointID%22:${ENDPOINT_ID}%7D" \
  -H "X-API-Key: ${API_TOKEN}" | jq '[.[] | .Name]'
```

## Pagination

For large Portainer installations:

```bash
# Use limit and start parameters for pagination
curl -s "https://portainer.mycompany.com/api/endpoints?start=1&limit=10" \
  -H "X-API-Key: ${API_TOKEN}" | jq '.'
```

## Conclusion

The `/api/endpoints` endpoint is the starting point for most Portainer API automation. Get the environment ID first, then use it in subsequent environment-specific calls for stack deployments, container management, and more.
