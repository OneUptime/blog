# How to Configure Fleet Cluster Groups

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fleet, GitOps, Rancher, Kubernetes, ClusterGroups

Description: Learn how to create and manage Fleet ClusterGroup resources to organize clusters into logical groups for simplified and consistent multi-cluster deployments.

## Introduction

Fleet ClusterGroups allow you to organize your registered Kubernetes clusters into named logical groups. Instead of repeatedly writing the same label selectors in every bundle target, you define a ClusterGroup once and reference it by name in your targets. This makes fleet.yaml files cleaner, easier to maintain, and less error-prone.

This guide covers how to create ClusterGroups, manage their membership, and use them effectively in bundle targets.

## Prerequisites

- Fleet installed in Rancher or standalone Kubernetes
- Multiple clusters registered in Fleet with labels applied
- `kubectl` access to the Fleet manager cluster
- Appropriate RBAC permissions

## Understanding ClusterGroup Resources

A `ClusterGroup` is a Fleet custom resource that acts as a named collection of clusters. Membership is defined using label selectors, so as clusters are added or labeled, they automatically become part of the appropriate groups.

## Creating a ClusterGroup

### Basic ClusterGroup with Label Selector

```yaml
# clustergroup-production.yaml

apiVersion: fleet.cattle.io/v1alpha1
kind: ClusterGroup
metadata:
  # Name referenced in bundle targets
  name: production
  namespace: fleet-default
spec:
  # Select clusters with the env=production label
  selector:
    matchLabels:
      env: production
```

```bash
# Create the ClusterGroup
kubectl apply -f clustergroup-production.yaml

# Verify the ClusterGroup and see how many clusters match
kubectl get clustergroup production -n fleet-default -o wide
```

### ClusterGroup with Multiple Label Selectors

```yaml
# clustergroup-us-production.yaml
apiVersion: fleet.cattle.io/v1alpha1
kind: ClusterGroup
metadata:
  name: us-production
  namespace: fleet-default
spec:
  selector:
    # All labels must match (AND logic)
    matchLabels:
      env: production
      cloud: aws
    matchExpressions:
      # Only clusters in US regions
      - key: region
        operator: In
        values:
          - us-east-1
          - us-west-2
```

### Creating Multiple ClusterGroups

```bash
# Create groups for each environment
cat <<EOF | kubectl apply -f -
---
apiVersion: fleet.cattle.io/v1alpha1
kind: ClusterGroup
metadata:
  name: development
  namespace: fleet-default
spec:
  selector:
    matchLabels:
      env: dev
---
apiVersion: fleet.cattle.io/v1alpha1
kind: ClusterGroup
metadata:
  name: staging
  namespace: fleet-default
spec:
  selector:
    matchLabels:
      env: staging
---
apiVersion: fleet.cattle.io/v1alpha1
kind: ClusterGroup
metadata:
  name: production
  namespace: fleet-default
spec:
  selector:
    matchLabels:
      env: production
EOF
```

## Listing and Inspecting ClusterGroups

```bash
# List all ClusterGroups in a namespace
kubectl get clustergroups -n fleet-default

# Get ClusterGroup details including member count
kubectl get clustergroup production -n fleet-default -o yaml

# For this example selector, list the matching clusters
kubectl get clusters.fleet.cattle.io -n fleet-default \
  -l env=production
```

Expected output:
```text
NAME         CLUSTERS-READY   CLUSTERS-DESIRED   AGE
production   5                5                  2d
staging      3                3                  2d
development  8                8                  2d
```

## Using ClusterGroups in Bundle Targets

Reference ClusterGroups by name in your `fleet.yaml` using `overrideTargets` and `targetCustomizations`:

```yaml
# fleet.yaml - Using ClusterGroup references
namespace: my-app

overrideTargets:
  # Target the staging ClusterGroup
  - clusterGroup: staging
  # Target the production ClusterGroup
  - clusterGroup: production

targetCustomizations:
  # Apply staging-specific values to clusters in the staging group
  - name: staging-deployment
    clusterGroup: staging
    helm:
      values:
        replicaCount: 1
        debug: true

  # Apply production-specific values to clusters in the production group
  - name: production-deployment
    clusterGroup: production
    helm:
      values:
        replicaCount: 3
        debug: false
```

### Using clusterGroupSelector

Instead of referencing a group by name, use a selector in `overrideTargets` to target groups dynamically:

```yaml
# fleet.yaml - ClusterGroup selector targeting
overrideTargets:
  - name: all-prod-groups
    clusterGroupSelector:
      matchLabels:
        # Target any ClusterGroup with this label
        tier: production
```

First, label your ClusterGroups:

```bash
# Add labels to ClusterGroups themselves
kubectl label clustergroup production \
  tier=production \
  -n fleet-default

kubectl label clustergroup production-eu \
  tier=production \
  geographic-zone=eu \
  -n fleet-default
```

## Creating Regional ClusterGroups

A practical example for a multi-region setup:

```yaml
# regional-clustergroups.yaml
---
apiVersion: fleet.cattle.io/v1alpha1
kind: ClusterGroup
metadata:
  name: us-east
  namespace: fleet-default
  labels:
    geographic-zone: us
spec:
  selector:
    matchLabels:
      env: production
      region: us-east-1
---
apiVersion: fleet.cattle.io/v1alpha1
kind: ClusterGroup
metadata:
  name: us-west
  namespace: fleet-default
  labels:
    geographic-zone: us
spec:
  selector:
    matchLabels:
      env: production
      region: us-west-2
---
apiVersion: fleet.cattle.io/v1alpha1
kind: ClusterGroup
metadata:
  name: eu-central
  namespace: fleet-default
  labels:
    geographic-zone: eu
spec:
  selector:
    matchLabels:
      env: production
      region: eu-central-1
```

```bash
kubectl apply -f regional-clustergroups.yaml

# Target all US production clusters using group selector
# In fleet.yaml:
# overrideTargets:
#   - name: us-production
#     clusterGroupSelector:
#       matchLabels:
#         geographic-zone: us
```

## Monitoring ClusterGroup Status

```bash
# Check health of all ClusterGroups
kubectl get clustergroups -A

# Get detailed status for a specific group
kubectl describe clustergroup production -n fleet-default

# Check the ClusterGroup's aggregated deployment summary
kubectl get clustergroup production -n fleet-default \
  -o jsonpath='{.status.display.readyBundles}{" bundles ready, "}{.status.display.readyClusters}{" clusters ready\n"}'
```

## Updating ClusterGroup Membership

ClusterGroup membership is dynamic - update the selector to change which clusters belong:

```bash
# Update the selector to add a new label requirement
kubectl patch clustergroup production -n fleet-default \
  --type=merge \
  -p '{"spec":{"selector":{"matchLabels":{"env":"production","approved":"true"}}}}'
```

## Conclusion

Fleet ClusterGroups are an essential organizational tool for managing large numbers of clusters. By defining named groups with label selectors, you reduce repetition in your fleet.yaml files and create a clear separation between cluster topology management and application deployment configuration. As your infrastructure grows, ClusterGroups make it simple to add new clusters to the right groups automatically, keeping your deployment configurations clean and maintainable.
