# How to Set Up Fleet with Canary Releases

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Fleet, Canary, Kubernetes, GitOps

Description: Guide to implementing canary release deployments using Rancher Fleet for gradual traffic shifting.

## Introduction

Rancher Fleet is a GitOps continuous delivery solution built into Rancher. It enables deploying applications to hundreds of clusters from a single Git repository, making it ideal for large-scale Kubernetes fleet management. For canary-style releases, Fleet uses `rolloutStrategy` partitions to phase deployments across clusters; it does not perform request-level traffic shifting by itself.

## Prerequisites

- Rancher v2.6+ with Fleet installed (built-in)
- Git repository (GitHub, GitLab, or any Git server)
- kubectl access to Rancher management cluster

## Step 1: Verify Fleet is Running

```bash
# Check Fleet pods in Rancher management cluster

kubectl get pods -n cattle-fleet-system

# Management cluster should include fleet-controller and gitjob.
# If the local cluster is also registered as a downstream cluster,
# you'll also see a fleet-agent pod in this namespace.

# Check CRDs
kubectl get crds | grep fleet.cattle.io
```

## Step 2: Create a GitRepo Resource

```yaml
# gitrepo.yaml - Connect Fleet to your Git repository
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: my-app-gitops
  namespace: fleet-default
spec:
  # Git repository URL
  repo: https://github.com/your-org/kubernetes-manifests
  branch: main
  
  # Path within the repository
  paths:
  - apps/my-app
  
  # Target clusters
  targets:
  - name: production
    clusterSelector:
      matchLabels:
        env: production
  - name: staging
    clusterSelector:
      matchLabels:
        env: staging
  
  # Poll interval
  pollingInterval: 30s
```

```bash
kubectl apply -f gitrepo.yaml
kubectl get gitrepo my-app-gitops -n fleet-default
```

## Step 3: Repository Structure

```text
kubernetes-manifests/
└── apps/
    └── my-app/
        ├── fleet.yaml      # App-level Fleet config
        ├── values.yaml
        └── chart/
            ├── Chart.yaml
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
  
  valuesFiles:
  - values.yaml              # Base values
  
  # Base values applied to all targets
  values:
    image:
      tag: "1.2.3"

# Cluster-based canary rollout across targeted clusters.
# Label production clusters with release-ring=canary or release-ring=stable.
rolloutStrategy:
  maxUnavailablePartitions: 0
  partitions:
  - name: staging
    maxUnavailable: 0
    clusterSelector:
      matchLabels:
        env: staging
  - name: canary
    maxUnavailable: 0
    clusterSelector:
      matchLabels:
        env: production
        release-ring: canary
  - name: production
    maxUnavailable: 20%
    clusterSelector:
      matchLabels:
        env: production
        release-ring: stable

# Target-specific configurations
targetCustomizations:
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

- name: canary
  clusterSelector:
    matchLabels:
      env: production
      release-ring: canary
  helm:
    values:
      replicaCount: 1
      resources:
        limits:
          cpu: "500m"
          memory: "512Mi"

- name: production
  clusterSelector:
    matchLabels:
      env: production
      release-ring: stable
  helm:
    values:
      replicaCount: 5
      resources:
        limits:
          cpu: "2"
          memory: "2Gi"
```

## Step 5: Monitor Deployment Status

```bash
# Check GitRepo sync status
kubectl get gitrepo -n fleet-default

# View bundle status (Fleet unit of deployment)
kubectl get bundles -n fleet-default

# Bundle names are generated from the GitRepo name and path unless
# you set "name" in fleet.yaml.
kubectl describe bundle <bundle-name> -n fleet-default

# Check per-cluster deployment status
kubectl get bundledeployments -A

# View Fleet agent logs on downstream cluster
kubectl logs -n cattle-fleet-system deploy/fleet-agent --follow
```

## Step 6: Configure Private Git Repository Authentication

```bash
# For HTTPS authentication
kubectl create secret generic git-auth   --namespace fleet-default   --type=kubernetes.io/basic-auth   --from-literal=username=your-username   --from-literal=password=your-personal-access-token

# For SSH authentication
kubectl create secret generic git-ssh   --namespace fleet-default   --type=kubernetes.io/ssh-auth   --from-file=ssh-privatekey=/path/to/private-key   --from-literal=known_hosts="$(ssh-keyscan -H github.com)"
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
kubectl describe gitrepo my-app-gitops -n fleet-default
# Check Events section for errors

# Bundle in Modified/NotReady state
kubectl get bundledeployments -A -o custom-columns='NAME:.metadata.name,TARGET_NS:.metadata.namespace,STATE:.status.display.state'

# Force re-sync by incrementing spec.forceSyncGeneration
kubectl patch gitrepo my-app-gitops -n fleet-default --type=merge -p '{"spec":{"forceSyncGeneration":1}}'
# Increment the value each time you want to force a redeploy
```

## Conclusion

Rancher Fleet provides a scalable GitOps platform that works at the scale of hundreds or thousands of clusters. Using `rolloutStrategy` partitions, you can stage canary-style cluster rollouts while keeping the desired state in Git. Start with a small set of labeled canary clusters, validate the release, and then continue the rollout to the rest of production.
