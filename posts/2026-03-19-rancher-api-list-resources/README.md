# How to List Resources Using the Rancher API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, API, REST API

Description: Learn how to list and query clusters, nodes, namespaces, workloads, and other resources using the Rancher API.

The Rancher API provides endpoints for listing common resources managed by your Rancher instance. This guide covers how to list common resources, work with the response format, and extract the information you need.

## Understanding the API Response Format

The previous Rancher v3 API and the Kubernetes proxy endpoints return different list formats.

v3 list endpoints return a collection object like this:

```json
{
  "type": "collection",
  "resourceType": "cluster",
  "data": [...],
  "pagination": {
    "limit": 100,
    "total": 5
  },
  "sort": {
    "order": "asc",
    "reverse": "..."
  }
}
```

Kubernetes proxy endpoints return standard Kubernetes list objects like this:

```json
{
  "apiVersion": "v1",
  "kind": "PodList",
  "items": [...],
  "metadata": {
    "continue": "...",
    "resourceVersion": "..."
  }
}
```

Use `.data[]` for `/v3/...` responses and `.items[]` for `/k8s/clusters/...` Kubernetes API responses. Pagination details are exposed through `pagination` in the v3 API and `metadata.continue` in Kubernetes list responses.

## Setup

Set your environment variables:

```bash
export RANCHER_URL="https://rancher.example.com"
export RANCHER_TOKEN="token-xxxxx:yyyyyyyyyyyyyyyy"
```

Create a reusable function for API calls:

```bash
rancher_api() {
  curl -s -k \
    -H "Authorization: Bearer ${RANCHER_TOKEN}" \
    "${RANCHER_URL}${1}"
}
```

## Listing Clusters

```bash
rancher_api "/v3/clusters" | jq '.data[] | {
  id,
  name,
  state,
  provider,
  kubernetesVersion: .version.gitVersion,
  nodeCount,
  created
}'
```

To get cluster IDs, names, and state:

```bash
rancher_api "/v3/clusters" | jq -r '.data[] | "\(.id)\t\(.name)\t\(.state)"'
```

## Listing Nodes

### All Nodes Across All Clusters

```bash
rancher_api "/v3/nodes" | jq '.data[] | {
  name: .nodeName,
  clusterId,
  state,
  ip: .ipAddress,
  roles: [if .controlPlane then "cp" else empty end, if .etcd then "etcd" else empty end, if .worker then "worker" else empty end],
  cpu: .allocatable.cpu,
  memory: .allocatable.memory
}'
```

### Nodes in a Specific Cluster

```bash
CLUSTER_ID="c-m-abc12345"

rancher_api "/v3/nodes?clusterId=${CLUSTER_ID}" | jq '.data[] | {
  name: .nodeName,
  state,
  ip: .ipAddress
}'
```

## Listing Projects

```bash
rancher_api "/v3/projects" | jq '.data[] | {
  id,
  name,
  clusterId,
  state,
  description
}'
```

To list projects in a specific cluster:

```bash
rancher_api "/v3/projects?clusterId=${CLUSTER_ID}" | jq '.data[] | {id, name}'
```

## Listing Namespaces

### All Namespaces in a Cluster

```bash
rancher_api "/k8s/clusters/${CLUSTER_ID}/api/v1/namespaces" | jq '.items[] | {
  name: .metadata.name,
  projectId: .metadata.annotations["field.cattle.io/projectId"],
  status: .status.phase
}'
```

### Using the Core v1 API for Namespace Details

```bash
rancher_api "/k8s/clusters/${CLUSTER_ID}/api/v1/namespaces" | jq '.items[] | {
  name: .metadata.name,
  status: .status.phase,
  labels: .metadata.labels
}'
```

## Listing Workloads

### Deployments

```bash
rancher_api "/k8s/clusters/${CLUSTER_ID}/apis/apps/v1/deployments" | jq '.items[] | {
  name: .metadata.name,
  namespace: .metadata.namespace,
  replicas: .spec.replicas,
  ready: .status.readyReplicas,
  image: .spec.template.spec.containers[0].image
}'
```

### DaemonSets

```bash
rancher_api "/k8s/clusters/${CLUSTER_ID}/apis/apps/v1/daemonsets" | jq '.items[] | {
  name: .metadata.name,
  namespace: .metadata.namespace,
  desired: .status.desiredNumberScheduled,
  ready: .status.numberReady
}'
```

### StatefulSets

```bash
rancher_api "/k8s/clusters/${CLUSTER_ID}/apis/apps/v1/statefulsets" | jq '.items[] | {
  name: .metadata.name,
  namespace: .metadata.namespace,
  replicas: .spec.replicas,
  ready: .status.readyReplicas
}'
```

## Listing Pods

```bash
rancher_api "/k8s/clusters/${CLUSTER_ID}/api/v1/pods" | jq '.items[] | {
  name: .metadata.name,
  namespace: .metadata.namespace,
  phase: .status.phase,
  node: .spec.nodeName,
  containers: [.spec.containers[].name]
}'
```

To list pods in a specific namespace:

```bash
NAMESPACE="default"

rancher_api "/k8s/clusters/${CLUSTER_ID}/api/v1/namespaces/${NAMESPACE}/pods" | jq '.items[] | {
  name: .metadata.name,
  phase: .status.phase
}'
```

## Listing Services

```bash
rancher_api "/k8s/clusters/${CLUSTER_ID}/api/v1/services" | jq '.items[] | {
  name: .metadata.name,
  namespace: .metadata.namespace,
  type: .spec.type,
  clusterIP: .spec.clusterIP,
  ports: [.spec.ports[] | "\(.port)/\(.protocol)"]
}'
```

## Listing ConfigMaps and Secrets

### ConfigMaps

```bash
rancher_api "/k8s/clusters/${CLUSTER_ID}/api/v1/configmaps" | jq '.items[] | {
  name: .metadata.name,
  namespace: .metadata.namespace,
  keys: (.data // {} | keys)
}'
```

### Secrets (Metadata Only)

```bash
rancher_api "/k8s/clusters/${CLUSTER_ID}/api/v1/secrets" | jq '.items[] | {
  name: .metadata.name,
  namespace: .metadata.namespace,
  type: .type
}'
```

## Listing Users and Roles

### Users

```bash
rancher_api "/v3/users" | jq '.data[] | {
  id,
  username,
  name,
  enabled,
  principalIds
}'
```

### Global Role Bindings

```bash
rancher_api "/v3/globalRoleBindings" | jq '.data[] | {
  id,
  userId,
  globalRoleId: .globalRoleId
}'
```

### Cluster Role Bindings

```bash
rancher_api "/v3/clusterRoleTemplateBindings?clusterId=${CLUSTER_ID}" | jq '.data[] | {
  userPrincipalId: .userPrincipalId,
  roleTemplateId,
  clusterId
}'
```

## Listing Catalogs and Apps

### Helm Repositories

```bash
rancher_api "/apis/catalog.cattle.io/v1/clusterrepos" | jq '.items[] | {
  name: .metadata.name,
  url: .spec.url,
  downloaded: ([.status.conditions[]? | select(.type=="Downloaded") | .status] | first)
}'
```

### Installed Apps (Helm Releases)

```bash
rancher_api "/k8s/clusters/${CLUSTER_ID}/apis/catalog.cattle.io/v1/apps" | jq '.items[] | {
  name: .metadata.name,
  namespace: .metadata.namespace,
  version: .spec.chart.metadata.version,
  status: .status.summary.state
}'
```

## Building a Resource Inventory Script

Here is a script that generates a complete inventory of a cluster:

```bash
#!/bin/bash

RANCHER_URL="https://rancher.example.com"
RANCHER_TOKEN="token-xxxxx:yyyyyyyyyyyyyyyy"
CLUSTER_ID="c-m-abc12345"

api() {
  curl -s -k -H "Authorization: Bearer ${RANCHER_TOKEN}" "${RANCHER_URL}${1}"
}

echo "=== Cluster Resource Inventory ==="
echo ""

echo "Nodes:"
api "/v3/nodes?clusterId=${CLUSTER_ID}" | jq -r '.data[] | "  \(.nodeName) [\(.state)] - \(.ipAddress)"'

echo ""
echo "Namespaces:"
api "/k8s/clusters/${CLUSTER_ID}/api/v1/namespaces" | jq -r '.items[] | "  \(.metadata.name)"'

echo ""
echo "Deployments:"
api "/k8s/clusters/${CLUSTER_ID}/apis/apps/v1/deployments" | jq -r '.items[] | "  \(.metadata.namespace)/\(.metadata.name) [\(.status.readyReplicas // 0)/\(.spec.replicas)]"'

echo ""
echo "Services:"
api "/k8s/clusters/${CLUSTER_ID}/api/v1/services" | jq -r '.items[] | "  \(.metadata.namespace)/\(.metadata.name) [\(.spec.type)]"'

echo ""
echo "Pods:"
total=$(api "/k8s/clusters/${CLUSTER_ID}/api/v1/pods" | jq '.items | length')
running=$(api "/k8s/clusters/${CLUSTER_ID}/api/v1/pods" | jq '[.items[] | select(.status.phase=="Running")] | length')
echo "  Total: ${total}, Running: ${running}"
```

## Summary

The Rancher API provides access to a wide range of Rancher and Kubernetes resources. The previous v3 API is still available for Rancher-level resources such as clusters, nodes, projects, and users, while the Kubernetes proxy endpoints under `/k8s/clusters/${CLUSTER_ID}` expose the standard Kubernetes API for native resources such as namespaces, pods, deployments, and services.
