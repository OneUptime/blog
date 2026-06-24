# How to Use Rancher API with curl

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, API, REST API, curl

Description: Practical guide to interacting with the Rancher API using curl, covering authentication, CRUD operations, error handling, and scripting patterns.

curl is the most widely available HTTP client and is perfect for quick API interactions, debugging, and shell scripts. This guide shows you how to use curl effectively with Rancher's previous `/v3` API for common operations. Rancher v2.8.0 introduced the newer Rancher Kubernetes API (RK-API), but the `/v3` API is still available.

## Setting Up

### Environment Variables

```bash
export RANCHER_URL="https://rancher.example.com"
export RANCHER_TOKEN="token-xxxxx:yyyyyyyyyyyyyyyy"
```

### Basic Request Structure

Every Rancher API request needs:
- The `-k` flag if using self-signed certificates (skip TLS verification)
- An `Authorization` header with your Bearer token
- A `Content-Type` header for requests with a body

```bash
curl -s -k \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/clusters"
```

## Authentication Methods

### Bearer Token

```bash
curl -s -k \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/clusters"
```

### Basic Authentication

You can also use the access key and secret key as username and password:

```bash
ACCESS_KEY="token-xxxxx"
SECRET_KEY="yyyyyyyyyyyyyyyy"

curl -s -k \
  -u "${ACCESS_KEY}:${SECRET_KEY}" \
  "${RANCHER_URL}/v3/clusters"
```

### Testing Authentication

```bash
curl -s -k -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3"
```

A `200` response means authentication is working.

## GET Requests: Reading Resources

### List All Clusters

```bash
curl -s -k \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/clusters" | jq '.data[] | {id, name, state}'
```

### Get a Single Resource

```bash
curl -s -k \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/clusters/c-m-abc12345" | jq '{name, state, provider}'
```

### Get a Specific Field

```bash
curl -s -k \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/clusters/c-m-abc12345" | jq '.version.gitVersion'
```

### Filter Results

```bash
curl -s -k \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/clusters?state=active" | jq '.data[] | .name'
```

## POST Requests: Creating Resources

### Create a Project

```bash
curl -s -k -X POST \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-project",
    "clusterId": "c-m-abc12345",
    "description": "Created via curl"
  }' \
  "${RANCHER_URL}/v3/projects" | jq '{id, name}'
```

### Create a User

```bash
curl -s -k -X POST \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "name": "New User",
    "password": "SecurePass123!",
    "mustChangePassword": true,
    "enabled": true
  }' \
  "${RANCHER_URL}/v3/users" | jq '{id, username}'
```

### Create a Namespace

If you want Rancher to associate the namespace with a project, include the `field.cattle.io/projectId` annotation.

```bash
CLUSTER_ID="c-m-abc12345"

curl -s -k -X POST \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "apiVersion": "v1",
    "kind": "Namespace",
    "metadata": {
      "name": "my-namespace",
      "annotations": {
        "field.cattle.io/projectId": "c-m-abc12345:p-xyz789"
      }
    }
  }' \
  "${RANCHER_URL}/k8s/clusters/${CLUSTER_ID}/v1/namespaces"
```

### Using Data from a File

```bash
# Save request body to a file

cat > /tmp/project.json <<EOF
{
  "name": "file-project",
  "clusterId": "c-m-abc12345",
  "description": "Created from file"
}
EOF

curl -s -k -X POST \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d @/tmp/project.json \
  "${RANCHER_URL}/v3/projects"
```

## PUT Requests: Updating Resources

### Update a Cluster Description

```bash
curl -s -k -X PUT \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"description": "Updated via curl"}' \
  "${RANCHER_URL}/v3/clusters/c-m-abc12345"
```

### Update User Properties

```bash
curl -s -k -X PUT \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name", "enabled": true}' \
  "${RANCHER_URL}/v3/users/user-xxxxx"
```

## DELETE Requests: Removing Resources

### Delete a Project

```bash
curl -s -k -X DELETE \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/projects/c-m-abc12345:p-xyz789"
```

### Delete a Namespace

```bash
curl -s -k -X DELETE \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/k8s/clusters/${CLUSTER_ID}/v1/namespaces/my-namespace"
```

## Action Endpoints

Rancher supports action endpoints for operations that do not fit standard CRUD:

### Generate Kubeconfig

```bash
curl -s -k -X POST \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/clusters/c-m-abc12345?action=generateKubeconfig" | jq -r '.config'
```

### Rotate Certificates

If the cluster exposes the action, you can call it directly:

```bash
curl -s -k -X POST \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{}' \
  "${RANCHER_URL}/v3/clusters/c-m-abc12345?action=rotateCertificates"
```

## Error Handling

### Capturing HTTP Status Codes

```bash
response=$(curl -s -k -w "\n%{http_code}" \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/clusters/nonexistent")

http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -n -1)

case $http_code in
  200) echo "Success" ;;
  401) echo "Unauthorized - check your token" ;;
  403) echo "Forbidden - insufficient permissions" ;;
  404) echo "Not found" ;;
  422) echo "Validation error: $(echo $body | jq -r '.message')" ;;
  *) echo "Error ${http_code}: $(echo $body | jq -r '.message // .error // .')" ;;
esac
```

### Verbose Output for Debugging

```bash
curl -v -k \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/clusters" 2>&1 | head -30
```

### Timing Requests

```bash
curl -s -k -o /dev/null -w "DNS: %{time_namelookup}s\nConnect: %{time_connect}s\nTLS: %{time_appconnect}s\nTotal: %{time_total}s\n" \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/clusters"
```

## Reusable Shell Functions

Create a script with helper functions:

```bash
#!/bin/bash
# rancher-curl.sh

RANCHER_URL="${RANCHER_URL:-https://rancher.example.com}"
RANCHER_TOKEN="${RANCHER_TOKEN}"

rget() {
  curl -s -k -H "Authorization: Bearer ${RANCHER_TOKEN}" "${RANCHER_URL}${1}"
}

rpost() {
  curl -s -k -X POST \
    -H "Authorization: Bearer ${RANCHER_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$2" "${RANCHER_URL}${1}"
}

rput() {
  curl -s -k -X PUT \
    -H "Authorization: Bearer ${RANCHER_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$2" "${RANCHER_URL}${1}"
}

rdel() {
  curl -s -k -X DELETE \
    -H "Authorization: Bearer ${RANCHER_TOKEN}" \
    "${RANCHER_URL}${1}"
}

# Usage examples:
# source rancher-curl.sh
# rget "/v3/clusters" | jq '.data[] | .name'
# rpost "/v3/projects" '{"name":"test","clusterId":"c-m-abc12345"}'
# rdel "/v3/projects/c-m-abc12345:p-test"
```

## Working with Large Responses

### Pipe to a Pager

```bash
curl -s -k \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/clusters" | jq '.' | less
```

### Save to File

```bash
curl -s -k \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/clusters" | jq '.' > clusters.json
```

### Count Results

```bash
curl -s -k \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/nodes" | jq '.data | length'
```

### Extract Specific Fields as CSV

```bash
curl -s -k \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/nodes" | jq -r '.data[] | [.nodeName, .state, .ipAddress] | @csv'
```

## Summary

curl is a versatile tool for working with the Rancher API. Use GET for reading, POST for creating, PUT for updating, and DELETE for removing resources. Always capture HTTP status codes for proper error handling. Build reusable shell functions to reduce repetition, and combine curl with jq for powerful data extraction and transformation. These patterns form the foundation for automation against Rancher's previous `/v3` API.
