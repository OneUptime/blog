# How to Configure Fleet with Branch-Based Deployments - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Fleet, GitOps, Branches, Kubernetes

Description: Guide to configuring Rancher Fleet to deploy from different Git branches to different environments.

## Introduction

Rancher Fleet is a GitOps continuous delivery solution built into Rancher. It enables deploying applications to hundreds of clusters from a single Git repository, making it ideal for large-scale Kubernetes fleet management.

## Prerequisites

- Rancher v2.6+ with Fleet installed (built-in)
- Git repository (GitHub, GitLab, or any Git server)
- kubectl access to the Rancher management cluster and any downstream clusters you want to inspect

## Step 1: Verify Fleet is Running

```bash
# Check Fleet controller pods in the Rancher management cluster

kubectl get pods -n cattle-fleet-system

# If the local cluster is also managed by Fleet, check the local agent
kubectl get pods -n cattle-local-fleet-system

# Expected pods:
# cattle-fleet-system: fleet-controller, gitjob
# cattle-local-fleet-system: fleet-agent (local cluster only)

# Check CRDs
kubectl get crds | grep fleet
```

## Step 2: Create GitRepo Resources

```yaml
# branch-gitrepos.yaml - Deploy different branches to different environments
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: my-app-staging
  namespace: fleet-default
spec:
  # Git repository URL
  repo: https://github.com/your-org/kubernetes-manifests
  branch: staging
  
  # Path within the repository
  paths:
  - apps/my-app
  
  # Target staging clusters
  targets:
  - name: staging
    clusterSelector:
      matchLabels:
        env: staging
  
  # Poll interval
  pollingInterval: 30s
---
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: my-app-production
  namespace: fleet-default
spec:
  repo: https://github.com/your-org/kubernetes-manifests
  branch: main
  paths:
  - apps/my-app
  targets:
  - name: production
    clusterSelector:
      matchLabels:
        env: production
  pollingInterval: 30s
```

```bash
kubectl apply -f branch-gitrepos.yaml
kubectl get gitrepo -n fleet-default
```

## Step 3: Repository Structure

```text
kubernetes-manifests/
└── apps/
    └── my-app/
        ├── fleet.yaml      # Fleet configuration for this bundle
        └── chart/
            ├── Chart.yaml
            ├── values.yaml
            └── templates/
                ├── deployment.yaml
                └── service.yaml
```

## Step 4: Configure fleet.yaml

```yaml
# apps/my-app/fleet.yaml
namespace: my-app

# Helm chart deployment
helm:
  chart: ./chart              # Relative path to Helm chart
  releaseName: my-app
  
  # Per-cluster value overrides
  values:
    replicaCount: 2
    image:
      tag: latest

# Kustomize configuration
# kustomize:
#   dir: ./kustomize

# Target-specific configurations
targetCustomizations:
- name: production
  clusterSelector:
    matchLabels:
      env: production
  helm:
    values:
      replicaCount: 5
      resources:
        limits:
          cpu: "2"
          memory: "2Gi"

- name: staging
  clusterSelector:
    matchLabels:
      env: staging
  helm:
    values:
      replicaCount: 1
      resources:
        limits:
          cpu: "500m"
          memory: "512Mi"
```

## Step 5: Monitor Deployment Status

```bash
# Check GitRepo sync status
kubectl get gitrepo -n fleet-default

# View bundle status (Fleet unit of deployment)
kubectl get bundles -n fleet-default

# Detailed bundle status
kubectl describe bundle <bundle-name> -n fleet-default

# Check per-cluster deployment status
kubectl get bundledeployments -A

# View Fleet agent logs on a downstream cluster
kubectl logs -n cattle-fleet-system   -l app=fleet-agent   --follow

# For the Rancher local cluster, use:
# kubectl logs -n cattle-local-fleet-system -l app=fleet-agent --follow
```

## Step 6: Configure Private Git Repository Authentication

```bash
# For HTTPS authentication
kubectl create secret generic git-auth   --namespace fleet-default   --type=kubernetes.io/basic-auth   --from-literal=username=your-username   --from-literal=password=your-personal-access-token

# For SSH authentication
kubectl create secret generic git-ssh   --namespace fleet-default   --type=kubernetes.io/ssh-auth   --from-file=ssh-privatekey=/path/to/private-key   --from-literal=known_hosts="$(ssh-keyscan github.com)"
```

```yaml
# Reference auth in GitRepo
spec:
  repo: https://github.com/your-org/private-repo
  clientSecretName: git-auth    # For HTTPS
  # Or for SSH:
  # repo: git@github.com:your-org/private-repo.git
  # clientSecretName: git-ssh
```

## Step 7: Configure Cluster Groups

```yaml
# cluster-group.yaml - Group clusters for bulk operations
apiVersion: fleet.cattle.io/v1alpha1
kind: ClusterGroup
metadata:
  name: production-clusters
  namespace: fleet-default
spec:
  selector:
    matchLabels:
      env: production
      region: us-east
```

```yaml
# Target cluster group in GitRepo
spec:
  targets:
  - name: all-production
    clusterGroup: production-clusters
```

## Troubleshooting

```bash
# GitRepo not syncing
kubectl describe gitrepo my-app-staging -n fleet-default
# Check Events section for errors

# Bundle in Modified/NotReady state
kubectl get bundledeployments -A -o custom-columns='NAME:.metadata.name,CLUSTER:.metadata.namespace,STATE:.status.display.state'

# Force re-sync by incrementing forceSyncGeneration
kubectl patch gitrepo my-app-staging   -n fleet-default   --type=merge   -p '{"spec":{"forceSyncGeneration":1}}'
# Use a higher number for subsequent manual re-syncs
```

## Conclusion

Rancher Fleet provides a scalable GitOps platform that works at the scale of hundreds or thousands of clusters. Its declarative model ensures cluster state always matches the Git repository, providing audit trails and easy rollbacks. Start with a simple single-cluster setup and scale to fleet-wide deployment as your organization grows.
