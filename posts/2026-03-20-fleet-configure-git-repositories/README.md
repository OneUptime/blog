# How to Configure Fleet Git Repositories

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fleet, GitOps, Rancher, Kubernetes, Git

Description: Learn how to configure Git repositories in Fleet to enable automated continuous delivery of Kubernetes resources across multiple clusters.

## Introduction

Fleet's GitRepo resource is the foundation of its GitOps model. A GitRepo object tells Fleet which Git repository to watch, what branches or tags to track, and which clusters to deploy to. Properly configuring Git repositories is essential for reliable continuous delivery.

This guide covers how to configure Git repositories in Fleet, including authentication, polling intervals, branch strategies, and targeting options.

## Prerequisites

- Fleet installed in your Rancher or Kubernetes cluster
- A Git repository containing Kubernetes manifests
- `kubectl` access to the Fleet manager cluster
- Appropriate namespace permissions

## Understanding Fleet GitRepo Resources

A `GitRepo` is a custom resource that Fleet monitors. When Fleet detects changes in the Git repository (new commits, tag updates), it automatically syncs those changes to the targeted clusters.

Key fields in a GitRepo:
- `repo`: The Git repository URL
- `branch`: The branch to track
- `paths`: Specific directories to deploy
- `targets`: Which clusters to deploy to

## Creating a Basic GitRepo Resource

### Step 1: Create the GitRepo Manifest

The examples below use the `fleet-default` workspace that Rancher creates for downstream clusters. If you are using Fleet in a single-cluster style, use `fleet-local` instead.

```yaml
# gitrepo-basic.yaml

apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  # Name of this GitRepo resource
  name: my-app-repo
  # Namespace determines which workspace this belongs to
  namespace: fleet-default
spec:
  # URL of the Git repository to watch
  repo: https://github.com/my-org/my-k8s-configs

  # Branch to track for changes
  branch: main

  # Paths within the repo to deploy (defaults to root if omitted)
  paths:
    - ./apps/production

  # Target all clusters in this workspace
  targets:
    - clusterSelector: {}
```

### Step 2: Apply the GitRepo

```bash
# Apply the GitRepo resource to Fleet
kubectl apply -f gitrepo-basic.yaml

# Verify the GitRepo was created
kubectl get gitrepo -n fleet-default

# Check the GitRepo status
kubectl describe gitrepo my-app-repo -n fleet-default
```

## Configuring Polling Intervals

By default, Fleet polls Git repositories every 15 seconds. You can customize this:

```yaml
# gitrepo-custom-polling.yaml
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: my-app-repo
  namespace: fleet-default
spec:
  repo: https://github.com/my-org/my-k8s-configs
  branch: main

  # Custom polling interval in seconds (e.g., 60 seconds)
  pollingInterval: 60s

  targets:
    - clusterSelector: {}
```

## Targeting Specific Branches and Tags

### Tracking a Specific Tag

```yaml
# gitrepo-tag.yaml
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: my-app-release
  namespace: fleet-default
spec:
  repo: https://github.com/my-org/my-k8s-configs

  # Track a specific tag instead of a branch
  revision: v1.2.0

  targets:
    - clusterSelector: {}
```

### Tracking a Commit SHA

```yaml
spec:
  repo: https://github.com/my-org/my-k8s-configs
  # Pin to an exact commit for immutable deployments
  revision: a3f7b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9
```

## Configuring Multiple Paths

Deploy from multiple directories in the same repository:

```yaml
# gitrepo-multiple-paths.yaml
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: platform-configs
  namespace: fleet-default
spec:
  repo: https://github.com/my-org/platform-configs
  branch: main

  # Deploy from multiple subdirectories
  paths:
    - ./networking
    - ./monitoring
    - ./security

  targets:
    - clusterSelector: {}
```

## Using the Rancher UI to Configure GitRepos

### Step 1: Navigate to Continuous Delivery

1. Open Rancher dashboard
2. Click **Continuous Delivery** in the left menu
3. Select **Git Repos**
4. Click **Add Repository**

### Step 2: Fill in Repository Details

- **Name**: Unique identifier for this GitRepo
- **Repository URL**: HTTPS or SSH URL
- **Branch Name**: The branch to track
- **Paths**: Subdirectories to deploy from
- **Authentication**: Secret containing credentials

### Step 3: Configure Targets

Select which clusters should receive deployments by:
- Choosing specific clusters by name
- Using cluster labels for dynamic targeting
- Selecting a cluster group

## Viewing GitRepo Status

Monitor the sync status of your Git repositories:

```bash
# List all GitRepos and their status
kubectl get gitrepo -n fleet-default -o wide

# Get detailed status including error messages
kubectl describe gitrepo my-app-repo -n fleet-default

# Watch for status changes in real-time
kubectl get gitrepo -n fleet-default -w
```

Status conditions to look for:
- `Ready: True` - Desired and current states match successfully
- `Stalled: True` - The controller encountered an error or failed to make progress
- `GitPolling: True` - Polling or initial cloning succeeded; this is also `True` when polling is disabled

## Deleting a GitRepo

By default, when you delete a GitRepo, Fleet removes the deployed resources from targeted clusters unless `keepResources: true` is set:

```bash
# Delete a GitRepo and trigger cleanup on clusters
kubectl delete gitrepo my-app-repo -n fleet-default
```

## Conclusion

Configuring Fleet Git repositories is the first step in establishing a GitOps workflow for your Kubernetes infrastructure. By creating GitRepo resources, you give Fleet the information it needs to continuously synchronize your desired state from Git to your clusters. With proper configuration of polling intervals, branch strategies, and target selectors, you can build a robust and automated delivery pipeline that scales across your entire fleet of clusters.
