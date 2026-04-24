# How to Manage Cluster Groups in Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Cluster Groups, Fleet, Management

Description: Organize and manage clusters at scale using Rancher Fleet Cluster Groups to apply policies, deploy workloads, and monitor groups of related clusters.

## Introduction

As the number of Rancher-managed clusters grows, managing them individually becomes impractical. Cluster Groups in Rancher Fleet let you define logical sets of clusters and target GitOps deployments, policies, and monitoring configurations at the group level rather than individual clusters. This guide covers creating, managing, and leveraging Cluster Groups effectively.

## What are Cluster Groups?

A `ClusterGroup` is a Fleet resource that dynamically selects clusters based on label selectors. When you target a deployment at a ClusterGroup, Fleet automatically deploys to all current and future clusters that match the selector - no manual cluster enumeration required.

## Step 1: Label Your Clusters

Labels are the foundation for all ClusterGroup selectors:

```bash
# Apply consistent labels to Fleet cluster resources as you register them

# Production clusters in AWS

kubectl label -n fleet-default clusters.fleet.cattle.io c-aws-prod-1 \
  environment=production cloud=aws region=us-east-1 tier=1

kubectl label -n fleet-default clusters.fleet.cattle.io c-aws-prod-2 \
  environment=production cloud=aws region=eu-west-1 tier=1

# Development clusters
kubectl label -n fleet-default clusters.fleet.cattle.io c-gcp-dev-1 \
  environment=development cloud=gcp region=us-central1 tier=3

# Edge clusters
kubectl label -n fleet-default clusters.fleet.cattle.io c-edge-retail-1 \
  environment=production cloud=on-premises type=edge location=store-001

kubectl label -n fleet-default clusters.fleet.cattle.io c-edge-retail-2 \
  environment=production cloud=on-premises type=edge location=store-002
```

## Step 2: Create Cluster Groups

```yaml
# cluster-groups.yaml
---
# All production clusters
apiVersion: fleet.cattle.io/v1alpha1
kind: ClusterGroup
metadata:
  name: production
  namespace: fleet-default
spec:
  selector:
    matchLabels:
      environment: production
---
# All AWS clusters
apiVersion: fleet.cattle.io/v1alpha1
kind: ClusterGroup
metadata:
  name: aws-clusters
  namespace: fleet-default
spec:
  selector:
    matchLabels:
      cloud: aws
---
# Edge clusters (using expression selector)
apiVersion: fleet.cattle.io/v1alpha1
kind: ClusterGroup
metadata:
  name: edge-clusters
  namespace: fleet-default
spec:
  selector:
    matchExpressions:
      - key: type
        operator: In
        values: [edge]
      - key: environment
        operator: In
        values: [production, staging]
---
# Tier 1 (critical) clusters
apiVersion: fleet.cattle.io/v1alpha1
kind: ClusterGroup
metadata:
  name: tier1-critical
  namespace: fleet-default
spec:
  selector:
    matchLabels:
      tier: "1"
```

```bash
kubectl apply -f cluster-groups.yaml
kubectl get clustergroups.fleet.cattle.io -n fleet-default
```

## Step 3: Deploy to Cluster Groups

Target GitRepo deployments at a ClusterGroup. Use `fleet.yaml` inside the repo for per-target Helm values:

```yaml
# gitrepo-security-policies.yaml
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: security-policies
  namespace: fleet-default
spec:
  repo: https://github.com/my-org/security-policies
  branch: main
  targets:
    # Apply base policies to ALL clusters
    - name: all-clusters
      clusterSelector: {}
---
# gitrepo-monitoring.yaml
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: monitoring-stack
  namespace: fleet-default
spec:
  repo: https://github.com/my-org/monitoring
  branch: main
  targets:
    - name: production-monitoring
      clusterGroup: tier1-critical

    - name: edge-monitoring
      clusterGroup: edge-clusters
```

```yaml
# security-policies/fleet.yaml
targetCustomizations:
  - name: production-hardening
    clusterGroup: production
    helm:
      values:
        strictMode: true
        auditLevel: RequestResponse
```

```yaml
# monitoring/fleet.yaml
targetCustomizations:
  - name: production-monitoring
    clusterGroup: tier1-critical
    helm:
      values:
        retention: 30d
        storage: 100Gi

  - name: edge-monitoring
    clusterGroup: edge-clusters
    helm:
      values:
        retention: 3d
        storage: 10Gi    # Smaller storage for edge nodes
```

## Step 4: Check ClusterGroup Status

```bash
# View group membership
kubectl get clustergroups.fleet.cattle.io -n fleet-default -o json \
  | jq '.items[] | {name: .metadata.name, clusterCount: .status.clusterCount}'

# Detailed group status
kubectl describe clustergroups.fleet.cattle.io -n fleet-default production

# List which clusters match the production group's selector
kubectl get clusters.fleet.cattle.io -n fleet-default \
  -l environment=production \
  -o custom-columns="NAME:.metadata.name,REGION:.metadata.labels.region,CLOUD:.metadata.labels.cloud"
```

## Step 5: Apply RBAC for Clusters Matched by a Group

Cluster Groups help Fleet target deployments, but Rancher permissions are still assigned per cluster or project rather than on the `ClusterGroup` object itself.

In Rancher UI: `Cluster Management` → `<cluster>` → `⋮` → `Edit Config` → `Member Roles`

Assign the same external group or user to each cluster that matches the ClusterGroup. If you automate this, use Rancher's `ClusterRoleTemplateBinding` API for each target cluster. Do not use `GlobalRoleBinding` for cluster-scoped access, because it grants permissions across Rancher.

## Step 6: Monitor Cluster Group Health

```bash
# Check aggregated status for the production ClusterGroup
kubectl get clustergroups.fleet.cattle.io -n fleet-default production -o json \
  | jq '{name: .metadata.name, clusterCount: .status.clusterCount, nonReadyClusterCount: .status.nonReadyClusterCount, readyClusters: (.status.display.readyClusters // "0/0"), state: (.status.display.state // "Ready")}'

# Get a summary of ready vs not-ready clusters per group
kubectl get clustergroups.fleet.cattle.io -n fleet-default -o json | jq -r '
  .items[] |
  "\(.metadata.name): \(.status.display.readyClusters // \"0/0\") clusters ready"
'
```

## Step 7: Automate Group-Level Operations

```bash
#!/usr/bin/env bash
# drain-group.sh - Cordon all nodes in every cluster matched by a Fleet ClusterGroup
# Assumes you already have kubeconfig files at ./kubeconfigs/<cluster-name>.yaml

set -euo pipefail

GROUP_NAME="${1:?Usage: drain-group.sh <group-name>}"
KUBECONFIG_DIR="${KUBECONFIG_DIR:-./kubeconfigs}"

# Convert the ClusterGroup selector to a standard Kubernetes label selector string
SELECTOR=$(kubectl get clustergroups.fleet.cattle.io -n fleet-default "${GROUP_NAME}" -o json | jq -r '
  [
    (.spec.selector.matchLabels // {} | to_entries[] | "\(.key)=\(.value)"),
    (.spec.selector.matchExpressions // [] | .[] |
      if .operator == "In" then "\(.key) in (\(.values | join(",")))"
      elif .operator == "NotIn" then "\(.key) notin (\(.values | join(",")))"
      elif .operator == "Exists" then .key
      elif .operator == "DoesNotExist" then "!\(.key)"
      else empty
      end)
  ] | join(",")
')

# Get all clusters in the group
CLUSTERS=$(kubectl get clusters.fleet.cattle.io -n fleet-default \
  -l "${SELECTOR}" \
  -o jsonpath='{.items[*].metadata.name}')

for cluster in ${CLUSTERS}; do
  echo "Processing cluster: ${cluster}"
  kubeconfig="${KUBECONFIG_DIR}/${cluster}.yaml"

  if [[ ! -f "${kubeconfig}" ]]; then
    echo "Skipping ${cluster}: kubeconfig not found at ${kubeconfig}" >&2
    continue
  fi

  # Cordon all nodes
  kubectl --kubeconfig="${kubeconfig}" get nodes -o name \
    | xargs -r -n1 kubectl --kubeconfig="${kubeconfig}" cordon

  echo "All nodes in ${cluster} cordoned"
done
```

## Conclusion

Cluster Groups transform Rancher from a per-cluster management tool into a true fleet management platform. By defining groups based on environment, cloud provider, tier, or any other attribute, and targeting GitRepo deployments and policies at these groups, you achieve consistent configuration across all members without touching each cluster individually. As your cluster estate evolves, newly registered clusters automatically inherit the correct policies and workloads as soon as their labels match a ClusterGroup selector.
