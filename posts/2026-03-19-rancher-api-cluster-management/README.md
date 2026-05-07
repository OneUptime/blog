# How to Use the Rancher API for Cluster Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, API, REST API, Cluster Management

Description: Learn how to use the Rancher API to manage Kubernetes clusters programmatically, including listing, inspecting, updating, and deleting clusters.

Managing Kubernetes clusters through the Rancher UI works well for small-scale operations, but when you need to automate cluster management or integrate it into your CI/CD pipeline, the Rancher API becomes essential. This guide walks you through using the Rancher API for common cluster management tasks.

## Prerequisites

Before you begin, make sure you have:

- A running Rancher installation (v2.6 or later)
- An API key with sufficient permissions (see our guide on generating API keys)
- curl and jq installed, or another HTTP/JSON client
- Basic familiarity with REST APIs

## Understanding the Rancher API Structure

The examples in this guide use Rancher's previous v3 API, which remains available at your Rancher server URL under the `/v3` path. Cluster resources are listed under `/v3/clusters`, and related node, namespace, and action URLs are exposed through each cluster's `links` and `actions` maps.

```plaintext
https://your-rancher-server/v3/clusters
```

Every API request requires authentication using an API key. You can send it as a Bearer token or use Basic authentication with your API key credentials.

## Setting Up Authentication

First, export your Rancher server URL and API token as environment variables:

```bash
export RANCHER_URL="https://rancher.example.com"
export RANCHER_TOKEN="token-xxxxx:yyyyyyyyyyyyyyyyyyyyyyyy"
```

The examples below use `-k` to allow self-signed or otherwise untrusted certificates. Omit it when your Rancher server presents a trusted certificate.

You can verify your authentication by hitting the API root:

```bash
curl -s -k \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3"
```

A successful response returns the API root with links to available resource types.

## Listing All Clusters

To retrieve all clusters managed by your Rancher instance:

```bash
curl -s -k \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/clusters" | jq '.data[] | {id, name, state, provider: .provider}'
```

This returns each cluster's ID, name, current state, and provider. The output looks like:

```json
{
  "id": "c-m-abc12345",
  "name": "production",
  "state": "active",
  "provider": "rke2"
}
```

## Inspecting a Specific Cluster

To get detailed information about a single cluster, use its ID:

```bash
CLUSTER_ID="c-m-abc12345"

curl -s -k \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/clusters/${CLUSTER_ID}" | jq '{
    name: .name,
    state: .state,
    kubernetesVersion: .version.gitVersion,
    nodeCount: .nodeCount,
    provider: .provider,
    created: .created
  }'
```

## Checking Cluster Conditions

Cluster conditions give you the cluster's high-level lifecycle and readiness state:

```bash
curl -s -k \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/clusters/${CLUSTER_ID}" | jq '(.conditions // [])[] | {type, status, message}'
```

This helps you diagnose whether the cluster is ready, pending, waiting, or otherwise unhealthy.

## Updating Cluster Configuration

You can update cluster settings by sending a PUT request. For example, to update the cluster description:

```bash
curl -s -k -X PUT \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Production cluster - updated via API"
  }' \
  "${RANCHER_URL}/v3/clusters/${CLUSTER_ID}"
```

In Rancher v2.6+ and current releases, monitoring is deployed as the `rancher-monitoring` application (Monitoring V2) rather than through a cluster-level `enableMonitoring` action in the `/v3/clusters` API.

## Listing Cluster Nodes

To see all nodes in a cluster:

```bash
curl -s -k \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/clusters/${CLUSTER_ID}/nodes" | jq '.data[] | {
    name: .nodeName,
    state: .state,
    roles: [if .controlPlane then "controlplane" else empty end, if .etcd then "etcd" else empty end, if .worker then "worker" else empty end],
    ip: .ipAddress,
    cpu: .allocatable.cpu,
    memory: .allocatable.memory
  }'
```

## Listing Cluster Namespaces

To retrieve all namespaces within a cluster:

```bash
curl -s -k \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/clusters/${CLUSTER_ID}/namespaces" | jq '.data[] | {id, name: .name, projectId, state}'
```

## Rotating Certificates

For Rancher-launched Kubernetes clusters, you can rotate cluster certificates:

```bash
curl -s -k -X POST \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{}' \
  "${RANCHER_URL}/v3/clusters/${CLUSTER_ID}?action=rotateCertificates"
```

You can also rotate certificates for specific services:

```bash
curl -s -k -X POST \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"services": "etcd"}' \
  "${RANCHER_URL}/v3/clusters/${CLUSTER_ID}?action=rotateCertificates"
```

## Deleting a Cluster

To delete a cluster through the API:

```bash
curl -s -k -X DELETE \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/clusters/${CLUSTER_ID}"
```

Be cautious with this operation. It removes the cluster from Rancher management, and depending on the cluster type, it may also destroy the underlying infrastructure.

## Building a Cluster Health Check Script

Here is a practical script that checks the health of all your clusters:

```bash
#!/bin/bash

RANCHER_URL="https://rancher.example.com"
RANCHER_TOKEN="token-xxxxx:yyyyyyyyyyyyyyyyyyyyyyyy"

echo "=== Cluster Health Report ==="
echo ""

clusters=$(curl -s -k \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/clusters" | jq -r '.data[] | "\(.id)|\(.name)|\(.state)"')

while IFS='|' read -r id name state; do
  echo "Cluster: ${name} (${id})"
  echo "  State: ${state}"

  node_count=$(curl -s -k \
    -H "Authorization: Bearer ${RANCHER_TOKEN}" \
    "${RANCHER_URL}/v3/clusters/${id}/nodes" | jq '.data | length')
  echo "  Nodes: ${node_count}"

  unhealthy=$(curl -s -k \
    -H "Authorization: Bearer ${RANCHER_TOKEN}" \
    "${RANCHER_URL}/v3/clusters/${id}" | jq '[(.conditions // [])[] | select(.status != "True")] | length')
  echo "  Unhealthy conditions: ${unhealthy}"
  echo ""
done <<< "${clusters}"
```

## Error Handling

The Rancher API returns standard HTTP status codes. Common ones include:

- **200**: Success
- **201**: Resource created
- **401**: Unauthorized (check your API token)
- **403**: Forbidden (insufficient permissions)
- **404**: Resource not found
- **409**: Conflict (resource already exists or version mismatch)
- **422**: Validation error (check your request body)

Always check the response status and parse error messages:

```bash
response=$(curl -s -k -w "\n%{http_code}" \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/clusters/${CLUSTER_ID}")

http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -n -1)

if [ "$http_code" -ne 200 ]; then
  echo "Error: HTTP ${http_code}"
  echo "$body" | jq '.message'
fi
```

## Summary

The Rancher API provides full control over your cluster lifecycle. You can list and inspect clusters, update configurations, manage nodes and namespaces, rotate certificates, and delete clusters, all programmatically. This makes it straightforward to build automation scripts, integrate with CI/CD systems, and manage large numbers of clusters efficiently.
