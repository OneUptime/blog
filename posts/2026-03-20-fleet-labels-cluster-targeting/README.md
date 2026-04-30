# How to Use Fleet Labels for Cluster Targeting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fleet, GitOps, Rancher, Kubernetes, Labels

Description: Learn how to use Kubernetes labels on Fleet clusters to create dynamic targeting rules that control which applications are deployed to which clusters.

## Introduction

Labels are the primary mechanism Fleet uses to dynamically target clusters for application deployments. Rather than hardcoding cluster names in your configuration, labels allow you to create flexible, reusable targeting rules that automatically include new clusters as they are registered.

This guide explains how to apply labels to Fleet clusters, design a labeling strategy, and use those labels in your GitRepo targets or bundle target overrides.

## Prerequisites

- Fleet installed in Rancher
- Multiple clusters registered in Fleet
- `kubectl` access to Fleet manager
- Understanding of Kubernetes label selectors

## How Fleet Cluster Labels Work

When you register a cluster with Fleet (or Rancher), Fleet creates a `Cluster` custom resource in the Fleet manager. You can add labels to these `Cluster` resources, and Fleet's targeting system uses those labels when evaluating `clusterSelector` rules.

```bash
# List all Fleet cluster resources across namespaces

kubectl get clusters.fleet.cattle.io -A

# View a specific cluster with its labels
kubectl get cluster my-cluster -n fleet-default --show-labels
```

## Designing a Cluster Labeling Strategy

A good labeling strategy should cover the dimensions you need for deployment targeting:

### Recommended Label Dimensions

```text
# Environment labels
env: dev | staging | production

# Region/geography labels
region: us-east-1 | us-west-2 | eu-central-1 | ap-southeast-1

# Tier/size labels
tier: small | medium | large

# Team ownership
team: platform | frontend | backend | data

# Cloud provider
cloud: aws | gcp | azure | on-premise

# Cluster purpose
purpose: general | edge | gpu | database
```

## Applying Labels to Fleet Clusters

### Via kubectl

```bash
# Apply multiple labels to a Fleet cluster at once
kubectl label cluster my-cluster \
  env=production \
  region=us-west-2 \
  tier=large \
  team=platform \
  cloud=aws \
  -n fleet-default

# Update an existing label
kubectl label cluster my-cluster \
  env=staging \
  --overwrite \
  -n fleet-default

# Remove a label from a cluster
kubectl label cluster my-cluster \
  region- \
  -n fleet-default

# Verify applied labels
kubectl get cluster my-cluster -n fleet-default -o jsonpath='{.metadata.labels}'
```

### Via Rancher UI

1. Navigate to **Continuous Delivery > Clusters**
2. Select your cluster
3. Click the **Edit Config** button (three-dot menu)
4. Under **Labels**, add key-value pairs
5. Click **Save**

### Via Cluster Resource YAML

For manager-initiated registration, you can pre-configure labels directly on the `Cluster` resource:

```yaml
# cluster.yaml
apiVersion: fleet.cattle.io/v1alpha1
kind: Cluster
metadata:
  name: edge-cluster-001
  namespace: fleet-default
  labels:
    # Pre-configure labels at registration time
    env: production
    region: eu-west-1
    purpose: edge
    tier: small
spec:
  kubeConfigSecret: edge-cluster-001-kubeconfig
```

## Using Labels in Bundle Targets

### Basic Label Matching

```yaml
# fleet.yaml - Simple label-based targeting
overrideTargets:
  # Match all clusters with env=production label
  - name: production
    clusterSelector:
      matchLabels:
        env: production
```

### Multi-Label Matching (AND logic)

```yaml
# fleet.yaml - Multiple labels must ALL match (AND)
overrideTargets:
  - name: us-production
    clusterSelector:
      matchLabels:
        # Cluster must have BOTH of these labels
        env: production
        region: us-west-2
```

### Using matchExpressions for Complex Logic

```yaml
# fleet.yaml - Advanced expressions
overrideTargets:
  - name: multi-region-prod
    clusterSelector:
      matchLabels:
        env: production
      matchExpressions:
        # Region must be one of these values (OR logic within values)
        - key: region
          operator: In
          values:
            - us-east-1
            - us-west-2
            - eu-central-1

        # Cluster must be large or medium tier
        - key: tier
          operator: In
          values:
            - large
            - medium

        # Must NOT have the decommissioned label
        - key: decommissioned
          operator: DoesNotExist
```

### Environment-Based Targeting

```yaml
# fleet.yaml - Define separate targets for each environment
overrideTargets:
  # Development target
  - name: dev
    clusterSelector:
      matchLabels:
        env: dev

  # Staging target
  - name: staging
    clusterSelector:
      matchLabels:
        env: staging

  # Production target
  - name: production
    clusterSelector:
      matchLabels:
        env: production

  # Catch-all for any remaining clusters
  - name: default
    clusterSelector: {}
```

## Bulk Labeling Multiple Clusters

```bash
# Label all clusters in a namespace
for cluster in $(kubectl get clusters.fleet.cattle.io -n fleet-default \
  -o jsonpath='{.items[*].metadata.name}'); do
  echo "Labeling cluster: $cluster"
  kubectl label cluster "$cluster" \
    managed-by=fleet \
    -n fleet-default \
    --overwrite
done
```

## Verifying Label-Based Targeting

```bash
# Find all clusters matching a specific label
kubectl get clusters.fleet.cattle.io -n fleet-default \
  -l env=production

# See BundleDeployments for a specific cluster
CLUSTER_NS=$(kubectl get cluster my-cluster -n fleet-default -o jsonpath='{.status.namespace}')
kubectl get bundledeployments.fleet.cattle.io -n "$CLUSTER_NS"

# Check targeting in a specific bundle
kubectl describe bundle my-app -n fleet-default
```

## Conclusion

Labels are the most powerful and flexible targeting mechanism in Fleet. A well-designed labeling strategy allows you to create deployment rules that automatically adapt as your cluster fleet grows and evolves. By consistently applying meaningful labels to your clusters - covering environment, region, team, and purpose - you can write targeting rules once and trust that they will correctly route deployments to the right clusters indefinitely.
