# How to Filter Resources in the Rancher API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, API, REST API

Description: Learn how to use query parameters and field selectors to filter resources in the Rancher API for efficient data retrieval.

Filtering resources server-side in the Rancher API is much more efficient than fetching everything and filtering locally. This guide covers the different filtering mechanisms available across the Rancher v3 and v1 APIs with practical examples.

## Filtering in the v3 API

The Rancher v3 API supports filtering by supported fields directly in query parameters.

### Basic Field Filtering

Filter by supported top-level fields by adding them as query parameters:

```bash
export RANCHER_URL="https://rancher.example.com"
export RANCHER_TOKEN="token-xxxxx:yyyyyyyyyyyyyyyy"

# Filter clusters by state

curl -s -k \
  -u "${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/clusters?state=active" | jq '.data[] | {name, state}'

# Filter nodes by cluster
curl -s -k \
  -u "${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/nodes?clusterId=c-m-abc12345" | jq '.data[] | {nodeName, state}'

# Filter users by enabled status
curl -s -k \
  -u "${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/users?enabled=true" | jq '.data[] | {username, enabled}'
```

### Multiple Filters

Combine multiple filters with `&`. All conditions must be met (AND logic):

```bash
# Active nodes in a specific cluster
curl -s -k \
  -u "${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/nodes?clusterId=c-m-abc12345&state=active" | jq '.data | length'

# Worker nodes only
curl -s -k \
  -u "${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/nodes?clusterId=c-m-abc12345&worker=true" | jq '.data[] | {nodeName, worker}'
```

### Filtering by Name

```bash
# Find a cluster by name
curl -s -k \
  -u "${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/clusters?name=production" | jq '.data[0]'

# Find a user by username
curl -s -k \
  -u "${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/users?username=jdoe" | jq '.data[0]'
```

### Using Comparison Modifiers

The v3 API supports modifier suffixes for comparison operators:

```bash
# Not equal: find clusters NOT in active state
curl -s -k \
  -u "${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/clusters?state_ne=active" | jq '.data[] | {name, state}'

# Prefix match: find resources with names starting with "prod"
curl -s -k \
  -u "${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/clusters?name_prefix=prod" | jq '.data[] | {name}'

# Null check: find resources without a description
curl -s -k \
  -u "${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/clusters?description_null=true" | jq '.data[] | {name, description}'

# Not null: find resources with a description
curl -s -k \
  -u "${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/clusters?description_notnull=true" | jq '.data[] | {name, description}'
```

## Filtering in the v1 (Steve) API

The v1 API supports Kubernetes-style field selectors and label selectors.

### Field Selectors

```bash
CLUSTER_ID="c-m-abc12345"

# Filter pods by status
curl -s -k \
  -u "${RANCHER_TOKEN}" \
  "${RANCHER_URL}/k8s/clusters/${CLUSTER_ID}/v1/pods?fieldSelector=status.phase=Running" | jq '.data | length'

# Filter pods by namespace
curl -s -k \
  -u "${RANCHER_TOKEN}" \
  "${RANCHER_URL}/k8s/clusters/${CLUSTER_ID}/v1/pods?fieldSelector=metadata.namespace=kube-system" | jq '.data[] | {name: .metadata.name}'

# Multiple field selectors (comma-separated for AND)
curl -s -k \
  -u "${RANCHER_TOKEN}" \
  "${RANCHER_URL}/k8s/clusters/${CLUSTER_ID}/v1/pods?fieldSelector=status.phase=Running,metadata.namespace=default" | jq '.data | length'
```

### Not-Equal Field Selectors

```bash
# Pods NOT in Running state
curl -s -k \
  -u "${RANCHER_TOKEN}" \
  "${RANCHER_URL}/k8s/clusters/${CLUSTER_ID}/v1/pods?fieldSelector=status.phase!=Running" | jq '.data[] | {name: .metadata.name, phase: .status.phase}'
```

### Label Selectors

Label selectors are powerful for filtering Kubernetes resources:

```bash
# Filter by exact label match
curl -s -k \
  -u "${RANCHER_TOKEN}" \
  "${RANCHER_URL}/k8s/clusters/${CLUSTER_ID}/v1/pods?labelSelector=app=nginx" | jq '.data[] | {name: .metadata.name}'

# Filter by multiple labels (AND)
curl -s -k \
  -u "${RANCHER_TOKEN}" \
  "${RANCHER_URL}/k8s/clusters/${CLUSTER_ID}/v1/pods?labelSelector=app=nginx,environment=production" | jq '.data | length'

# Label existence check
curl -s -k \
  -u "${RANCHER_TOKEN}" \
  "${RANCHER_URL}/k8s/clusters/${CLUSTER_ID}/v1/pods?labelSelector=app" | jq '.data | length'

# Label non-existence check
curl -s -k \
  -u "${RANCHER_TOKEN}" \
  "${RANCHER_URL}/k8s/clusters/${CLUSTER_ID}/v1/pods?labelSelector=!experimental" | jq '.data | length'

# Set-based selectors (in)
curl -s -k \
  -u "${RANCHER_TOKEN}" \
  "${RANCHER_URL}/k8s/clusters/${CLUSTER_ID}/v1/pods?labelSelector=environment+in+(production,staging)" | jq '.data | length'

# Set-based selectors (notin)
curl -s -k \
  -u "${RANCHER_TOKEN}" \
  "${RANCHER_URL}/k8s/clusters/${CLUSTER_ID}/v1/pods?labelSelector=environment+notin+(development,test)" | jq '.data | length'
```

### Filtering by Namespace

The v1 API lets you filter by namespace in the URL path:

```bash
# All pods in the default namespace
curl -s -k \
  -u "${RANCHER_TOKEN}" \
  "${RANCHER_URL}/k8s/clusters/${CLUSTER_ID}/v1/pods/default" | jq '.data | length'

# All services in kube-system
curl -s -k \
  -u "${RANCHER_TOKEN}" \
  "${RANCHER_URL}/k8s/clusters/${CLUSTER_ID}/v1/services/kube-system" | jq '.data[] | {name: .metadata.name}'
```

## Combining Filters with Sorting and Pagination

```bash
# Active clusters, sorted by name, 10 per page
curl -s -k \
  -u "${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/clusters?state=active&sort=name&order=asc&limit=10" | jq '.data[] | {name, state}'

# Running pods with app=nginx label, sorted by creation time
curl -s -k \
  -u "${RANCHER_TOKEN}" \
  "${RANCHER_URL}/k8s/clusters/${CLUSTER_ID}/v1/pods?labelSelector=app=nginx&fieldSelector=status.phase=Running&sort=metadata.creationTimestamp&pagesize=50" | jq '.data[] | {name: .metadata.name, created: .metadata.creationTimestamp}'
```

## Practical Filtering Scripts

### Find Problem Pods Across All Clusters

```bash
#!/bin/bash

RANCHER_URL="https://rancher.example.com"
RANCHER_TOKEN="token-xxxxx:yyyyyyyyyyyyyyyy"

clusters=$(curl -s -k \
  -u "${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/clusters?state=active" | jq -r '.data[] | "\(.id)|\(.name)"')

while IFS='|' read -r id name; do
  echo "=== Cluster: ${name} ==="

  # Failed pods
  failed=$(curl -s -k \
    -u "${RANCHER_TOKEN}" \
    "${RANCHER_URL}/k8s/clusters/${id}/v1/pods?fieldSelector=status.phase=Failed" | jq '.data | length')
  echo "  Failed pods: ${failed}"

  # Pending pods
  pending=$(curl -s -k \
    -u "${RANCHER_TOKEN}" \
    "${RANCHER_URL}/k8s/clusters/${id}/v1/pods?fieldSelector=status.phase=Pending" | jq '.data | length')
  echo "  Pending pods: ${pending}"
done <<< "$clusters"
```

### List All Resources with a Specific Label

```bash
#!/bin/bash

CLUSTER_ID="c-m-abc12345"
LABEL="team=platform"

echo "Resources with label: ${LABEL}"
echo ""

for resource in pods deployments services configmaps; do
  count=$(curl -s -k \
    -u "${RANCHER_TOKEN}" \
    "${RANCHER_URL}/k8s/clusters/${CLUSTER_ID}/v1/${resource}?labelSelector=${LABEL}" | jq '.data | length')
  echo "  ${resource}: ${count}"
done
```

### Find Nodes by Resource Capacity

```bash
# Find nodes with more than 8 CPUs (requires local filtering since v3 doesn't support numeric comparisons)
curl -s -k \
  -u "${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/nodes?clusterId=${CLUSTER_ID}" | jq '.data[] | select((.allocatable.cpu | tonumber) > 8) | {
    name: .nodeName,
    cpu: .allocatable.cpu,
    memory: .allocatable.memory
  }'
```

## URL Encoding Tips

When using special characters in filters, URL-encode them:

```bash
# URL-encode selector characters such as "="
curl -s -k \
  -u "${RANCHER_TOKEN}" \
  "${RANCHER_URL}/k8s/clusters/${CLUSTER_ID}/v1/pods?labelSelector=app%3Dmy-app"

# Using Python for URL encoding
label="environment in (prod,staging)"
encoded=$(python3 -c "import urllib.parse; print(urllib.parse.quote('${label}'))")
curl -s -k \
  -u "${RANCHER_TOKEN}" \
  "${RANCHER_URL}/k8s/clusters/${CLUSTER_ID}/v1/pods?labelSelector=${encoded}"
```

## Summary

The Rancher API provides multiple filtering mechanisms. The v3 API uses query parameter matching on supported fields, with modifier suffixes for comparisons. The v1 API supports Kubernetes-native field selectors and label selectors including set-based operations. Always prefer server-side filtering over fetching all resources and filtering locally, especially in large environments. Combine filtering with pagination and sorting for efficient data retrieval.
