# How to Set Up Fleet for Multi-Cluster Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fleet, GitOps, Rancher, Kubernetes, Multi-Cluster

Description: A comprehensive guide to configuring Fleet for deploying and managing applications across multiple Kubernetes clusters using GitOps principles.

## Introduction

One of Fleet's primary use cases is managing deployments across tens, hundreds, or even thousands of Kubernetes clusters simultaneously. Whether you're running a multi-region production environment, managing edge deployments, or maintaining clusters for different teams, Fleet provides a unified GitOps control plane that scales to meet your needs.

This guide covers the complete setup for multi-cluster deployments, from cluster registration to coordinated application rollouts.

## Prerequisites

- Rancher with Fleet installed
- Multiple Kubernetes clusters to register
- Outbound connectivity from downstream clusters to Rancher/Fleet
- `kubectl` access to the Rancher local cluster
- `helm` 3 if you plan to use agent-initiated registration via the Fleet API
- Git repository with application manifests

## Architecture Overview

In a Fleet multi-cluster setup:

- **Fleet Manager** (runs in Rancher local cluster): Monitors Git repos, creates bundles, manages cluster registrations
- **Fleet Agents** (runs in each downstream cluster): Receive bundle instructions and apply resources locally
- **Git Repository**: Single source of truth for all cluster configurations

## Step 1: Register Downstream Clusters

### Via Rancher UI

1. In Rancher, navigate to **Cluster Management**
2. Click **Import Existing** or **Create** cluster
3. For importing: copy the `kubectl apply` command shown and run it on the downstream cluster
4. The cluster will appear in Fleet once the agent connects

### Via Fleet API (agent-initiated registration)

This flow is different from Rancher's **Import Existing** command. With the Fleet API, you create a `ClusterRegistrationToken`, retrieve the generated `values.yaml`, and install the Fleet agent on the downstream cluster with Helm.

```yaml
# cluster-registration-token.yaml

apiVersion: fleet.cattle.io/v1alpha1
kind: ClusterRegistrationToken
metadata:
  name: my-token
  namespace: fleet-default
spec:
  # Token expires after 24 hours (<= 0 or unset = never expires)
  ttl: 24h
```

```bash
# Create the registration token
kubectl apply -f cluster-registration-token.yaml

# Wait for Fleet to create the registration secret
while ! kubectl get secret my-token -n fleet-default; do sleep 5; done

# Retrieve the generated agent values
kubectl get secret my-token \
  -n fleet-default \
  -o 'jsonpath={.data.values}' | base64 --decode > values.yaml

# Install the Fleet agent using the downstream cluster context
helm repo add fleet https://rancher.github.io/fleet-helm-charts/
helm -n cattle-fleet-system install --create-namespace --wait \
  --values values.yaml \
  fleet-agent fleet/fleet-agent
```

## Step 2: Label Clusters for Targeting

```bash
# Label all registered clusters appropriately
# Production US clusters
kubectl label clusters.fleet.cattle.io prod-us-east-1 \
  env=production region=us-east-1 tier=large \
  -n fleet-default

kubectl label clusters.fleet.cattle.io prod-us-west-2 \
  env=production region=us-west-2 tier=large \
  -n fleet-default

# Staging clusters
kubectl label clusters.fleet.cattle.io staging-us \
  env=staging region=us-east-1 tier=medium \
  -n fleet-default

# Development clusters
kubectl label clusters.fleet.cattle.io dev-01 \
  env=dev region=us-east-1 tier=small \
  -n fleet-default
```

## Step 3: Create ClusterGroups

```yaml
# clustergroups.yaml
---
apiVersion: fleet.cattle.io/v1alpha1
kind: ClusterGroup
metadata:
  name: all-production
  namespace: fleet-default
spec:
  selector:
    matchLabels:
      env: production
---
apiVersion: fleet.cattle.io/v1alpha1
kind: ClusterGroup
metadata:
  name: all-staging
  namespace: fleet-default
spec:
  selector:
    matchLabels:
      env: staging
---
apiVersion: fleet.cattle.io/v1alpha1
kind: ClusterGroup
metadata:
  name: us-production
  namespace: fleet-default
spec:
  selector:
    matchLabels:
      env: production
    matchExpressions:
      - key: region
        operator: In
        values: [us-east-1, us-west-2]
```

```bash
kubectl apply -f clustergroups.yaml
```

## Step 4: Structure Your Git Repository

```text
platform-configs/
├── infrastructure/
│   ├── fleet.yaml           # Targets: all clusters
│   ├── namespaces.yaml
│   └── rbac.yaml
├── monitoring/
│   ├── fleet.yaml           # Targets: all clusters
│   └── prometheus.yaml
├── apps/
│   ├── frontend/
│   │   ├── fleet.yaml       # Targets: production only
│   │   └── manifests/
│   └── backend/
│       ├── fleet.yaml       # Targets: production + staging
│       └── manifests/
└── edge-configs/
    ├── fleet.yaml           # Targets: edge clusters
    └── manifests/
```

## Step 5: Configure Multi-Cluster GitRepos

```yaml
# gitrepo-platform.yaml
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: platform-configs
  namespace: fleet-default
spec:
  repo: https://github.com/my-org/platform-configs
  branch: main

  # Deploy infrastructure to all clusters
  paths:
    - infrastructure
    - monitoring

  targets:
    # All registered clusters get infrastructure
    - clusterSelector: {}
---
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: app-configs
  namespace: fleet-default
spec:
  repo: https://github.com/my-org/platform-configs
  branch: main

  # Deploy app bundles to production and staging;
  # nested fleet.yaml files can still narrow targets per path
  paths:
    - apps/frontend
    - apps/backend

  targets:
    - clusterGroup: all-production
    - clusterGroup: all-staging
```

## Step 6: Implement Progressive Rollouts

Use separate GitRepo resources for a simple staged promotion flow:

```yaml
# gitrepo-canary.yaml - Deploy to canary cluster first
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: app-canary
  namespace: fleet-default
spec:
  repo: https://github.com/my-org/app
  # Deploy from canary branch
  branch: canary
  targets:
    - clusterSelector:
        matchLabels:
          role: canary
---
# gitrepo-production.yaml - Deploy stable version to production
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: app-production
  namespace: fleet-default
spec:
  repo: https://github.com/my-org/app
  branch: main
  targets:
    - clusterGroup: all-production
```

## Monitoring Multi-Cluster Deployments

```bash
# Overview of all cluster statuses
kubectl get clusters.fleet.cattle.io -A

# Check all GitRepo sync statuses
kubectl get gitrepos.fleet.cattle.io -A

# View bundle deployment status across all clusters
kubectl get bundledeployments.fleet.cattle.io -A

# Find any failing deployments
kubectl get bundledeployments.fleet.cattle.io -A \
  -o jsonpath='{range .items[?(@.status.ready==false)]}{.metadata.name}{" "}{.metadata.namespace}{"\n"}{end}'

# Get a summary of bundle health
kubectl get bundles.fleet.cattle.io -A
```

## Conclusion

Fleet's multi-cluster deployment capabilities enable organizations to manage hundreds of clusters from a single Git repository with minimal operational overhead. By combining cluster registration, label-based targeting, ClusterGroups, and multiple GitRepo resources, you can implement sophisticated deployment topologies - from simple all-cluster deployments to complex progressive rollouts. The key to success is a thoughtful labeling strategy and well-organized repository structure that scales as your infrastructure grows.
