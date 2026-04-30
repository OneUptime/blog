# How to Create Fleet GitRepo Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fleet, GitOps, Rancher, Kubernetes, GitRepo

Description: Learn how to create and manage Fleet GitRepo custom resources to define which Git repositories Fleet should monitor and deploy from.

## Introduction

The `GitRepo` custom resource is the core building block of Fleet's GitOps workflow. Each GitRepo resource represents a connection between a Git repository and one or more Kubernetes clusters. Fleet continuously monitors these repositories and applies any changes to the target clusters.

This guide covers how to create GitRepo resources using `kubectl`, the Rancher UI, and advanced configurations including workspace selection, target namespace overrides, and cluster targeting.

## Prerequisites

- Fleet installed in Rancher or standalone Kubernetes
- `kubectl` configured with cluster access
- A Git repository with Kubernetes manifests
- A Fleet workspace namespace such as `fleet-local`, `fleet-default`, or a custom workspace namespace

## Understanding GitRepo Namespaces

Fleet uses namespaces as workspaces. The namespace where you create a GitRepo determines its workspace:

- `fleet-local`: Contains the local cluster by default
- `fleet-default`: Contains the downstream clusters registered through Rancher by default
- Custom namespaces: Provide workspace isolation and their own cluster and cluster group scope

## Creating a Minimal GitRepo

The simplest GitRepo requires only the repository URL:

```yaml
# minimal-gitrepo.yaml

apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: simple-app
  namespace: fleet-default
spec:
  # Public repository - no authentication needed
  repo: https://github.com/rancher/fleet-examples

  # Track the main branch
  branch: main
```

```bash
# Apply the minimal GitRepo
kubectl apply -f minimal-gitrepo.yaml
```

## Creating a GitRepo with Full Configuration

```yaml
# full-gitrepo.yaml
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: production-apps
  namespace: fleet-default
  # Labels help organize and select GitRepos
  labels:
    environment: production
    team: platform
spec:
  # Repository URL
  repo: https://github.com/my-org/k8s-configs

  # Branch to track
  branch: release

  # Specific paths to deploy from (empty means deploy all)
  paths:
    - apps/frontend
    - apps/backend
    - shared/configmaps

  # Secret containing Git credentials
  clientSecretName: git-auth-secret

  # How often to poll for changes
  pollingInterval: 30s

  # Optional: force all namespaced workloads into this namespace
  # If omitted, Fleet uses namespace settings from fleet.yaml and the manifests
  # targetNamespace: production-workloads

  # Targets define which clusters receive the deployments
  targets:
    - name: production-clusters
      clusterSelector:
        matchLabels:
          env: production
```

```bash
# Apply the full configuration
kubectl apply -f full-gitrepo.yaml

# Verify creation
kubectl get gitrepo production-apps -n fleet-default -o yaml
```

## Configuring the Target Namespace

By default, Fleet respects namespace settings from `fleet.yaml` and the manifests. You can override them with `targetNamespace`:

```yaml
# gitrepo-namespace-override.yaml
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: namespaced-app
  namespace: fleet-default
spec:
  repo: https://github.com/my-org/app-configs
  branch: main

  # Force all namespaced resources to deploy into this namespace
  # This overrides namespace settings from fleet.yaml and the manifests
  # If cluster-scoped resources are present, the deployment will fail
  targetNamespace: my-app-namespace
```

## Creating a GitRepo for the Local Cluster

To deploy resources to the Rancher local cluster:

```yaml
# gitrepo-local.yaml
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: local-cluster-apps
  # fleet-local contains the local cluster by default
  namespace: fleet-local
spec:
  repo: https://github.com/my-org/local-configs
  branch: main
  paths:
    - cluster-local

  # Target the local cluster
  targets:
    - clusterName: local
```

```bash
# Apply to the fleet-local namespace
kubectl apply -f gitrepo-local.yaml

# Check GitRepo in the local namespace
kubectl get gitrepo -n fleet-local
```

## Creating GitRepo Resources via Rancher UI

### Step 1: Access Continuous Delivery

1. Log into Rancher
2. Click ☰ > **Continuous Delivery**
3. Navigate to **Gitrepos**

### Step 2: Create New Repository

Create the GitRepo and provide:

- **Name**: `my-app` (must be unique within the namespace)
- **Repository URL**: `https://github.com/org/repo`
- **Watch**: Select **Branch** and enter `main`
- **Paths**: Add paths or leave blank for root

### Step 3: Set Up Authentication

If the repository is private:
1. Click **Add Authentication**
2. Create a new secret or reference an existing one
3. Select the appropriate authentication type

### Step 4: Define Targets

1. Click **Add Target**
2. Choose targeting method:
   - **Cluster Name**: Target a specific registered cluster
   - **Cluster Selector**: Match clusters by labels
   - **Cluster Group**: Use a predefined group

## Checking GitRepo Status

```bash
# Get the summary status of all GitRepos
kubectl get gitrepo -A

# Detailed status of a specific GitRepo
kubectl get gitrepo production-apps -n fleet-default -o jsonpath='{.status}'

# Check for errors in the GitRepo
kubectl describe gitrepo production-apps -n fleet-default | grep -A 10 "Conditions:"
```

## Updating a GitRepo

To update a GitRepo, simply edit the resource:

```bash
# Edit the GitRepo directly
kubectl edit gitrepo production-apps -n fleet-default

# Or apply an updated manifest
kubectl apply -f updated-gitrepo.yaml
```

## Forcing a GitRepo Resync

To force Fleet to re-pull and re-apply from Git, increment `spec.forceSyncGeneration`:

```bash
# Increment forceSyncGeneration to force an immediate sync
kubectl patch gitrepo production-apps \
  -n fleet-default \
  --type=merge \
  --patch '{"spec":{"forceSyncGeneration":1}}'
```

Increase the value again for each subsequent manual resync.

## Conclusion

GitRepo resources are the heart of Fleet's GitOps approach. By defining what to watch in Git, which paths to deploy, and which clusters to target, you establish the complete picture of your desired state delivery pipeline. With a solid understanding of GitRepo creation and management, you can scale your continuous delivery practice across any number of clusters and environments with minimal operational overhead.
