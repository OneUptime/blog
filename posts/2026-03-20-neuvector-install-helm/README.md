# How to Install NeuVector with Helm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, Kubernetes, Helm, Container Security, Installation

Description: Learn how to deploy NeuVector on Kubernetes using Helm charts for a streamlined and configurable installation experience.

## Introduction

Helm is the preferred method for installing NeuVector in production environments. It simplifies configuration management, upgrades, and rollbacks. This guide walks you through installing NeuVector using the official Helm chart.

## Prerequisites

- Kubernetes cluster (v1.19+)
- Helm v3.x installed
- `kubectl` with cluster admin access
- `helm` CLI configured

## Step 1: Add the NeuVector Helm Repository

```bash
# Add the NeuVector Helm chart repository

helm repo add neuvector https://neuvector.github.io/neuvector-helm/

# Update your local Helm chart cache
helm repo update

# Verify the repository was added
helm search repo neuvector
```

## Step 2: Create the Namespace

```bash
# Create the neuvector namespace
kubectl create namespace neuvector
```

## Step 3: Review Default Values

Before installing, inspect the default Helm values to understand configuration options:

```bash
# View all configurable values
helm show values neuvector/core > neuvector-values.yaml
```

## Step 4: Create a Custom Values File

Create a `custom-values.yaml` to override defaults for your environment:

```yaml
# custom-values.yaml

# Container runtime configuration (containerd is the most common choice)
containerd:
  enabled: true
  path: /var/run/containerd/containerd.sock

# Bootstrap password for the default admin user (change this!)
bootstrapPassword: "YourSecurePassword123!"

# Controller configuration
controller:
  # Number of controller replicas (3 recommended for HA)
  replicas: 3
  image:
    repository: neuvector/controller
    tag: "5.3.0"
  # Resource limits for controller pods
  resources:
    requests:
      cpu: "500m"
      memory: "512Mi"
    limits:
      cpu: "2000m"
      memory: "2Gi"
  # Persistent storage for controller state
  pvc:
    enabled: true
    accessModes:
      - ReadWriteMany
    storageClass: "standard"
    capacity: 1Gi

# Enforcer configuration (runs as DaemonSet on all nodes)
enforcer:
  image:
    repository: neuvector/enforcer
    tag: "5.3.0"
  resources:
    requests:
      cpu: "100m"
      memory: "256Mi"
    limits:
      cpu: "1000m"
      memory: "1Gi"

# Manager (Web UI) configuration
manager:
  image:
    repository: neuvector/manager
    tag: "5.3.0"
  # Expose the UI via LoadBalancer or NodePort
  svc:
    type: LoadBalancer
  resources:
    requests:
      cpu: "100m"
      memory: "256Mi"
    limits:
      cpu: "500m"
      memory: "512Mi"

# Scanner and updater are nested under "cve"
cve:
  # Scanner for vulnerability scanning
  scanner:
    enabled: true
    replicas: 2
    image:
      repository: neuvector/scanner
      tag: latest
    resources:
      requests:
        cpu: "100m"
        memory: "256Mi"
      limits:
        cpu: "1000m"
        memory: "1Gi"

  # Updater for the vulnerability database
  updater:
    enabled: true
    # CronJob schedule for database updates
    schedule: "0 0 * * *"
```

## Step 5: Install NeuVector

```bash
# Install NeuVector with your custom values
helm install neuvector neuvector/core \
  --namespace neuvector \
  --values custom-values.yaml \
  --wait \
  --timeout 10m

# Verify the installation
helm status neuvector -n neuvector
```

## Step 6: Verify the Deployment

```bash
# Check all pods are running
kubectl get pods -n neuvector -w

# Check services
kubectl get svc -n neuvector

# Get the Manager UI external IP (if using LoadBalancer)
kubectl get svc neuvector-service-webui -n neuvector
```

## Step 7: Upgrade NeuVector

When a new version is released, upgrading is straightforward with Helm:

```bash
# Update the Helm repository
helm repo update

# Check available versions
helm search repo neuvector/core --versions

# Upgrade to a new version
helm upgrade neuvector neuvector/core \
  --namespace neuvector \
  --values custom-values.yaml \
  --set controller.image.tag=5.3.1 \
  --wait
```

## Step 8: Rollback if Needed

```bash
# View release history
helm history neuvector -n neuvector

# Rollback to the previous release
helm rollback neuvector -n neuvector

# Rollback to a specific revision
helm rollback neuvector 2 -n neuvector
```

## Step 9: Uninstall NeuVector

```bash
# Remove the Helm release
helm uninstall neuvector -n neuvector

# Clean up the namespace
kubectl delete namespace neuvector

# Remove CRDs (optional)
kubectl get crd | grep neuvector | awk '{print $1}' | xargs kubectl delete crd
```

## Customizing for Different Container Runtimes

NeuVector supports multiple container runtimes. Update your values file accordingly:

```yaml
# For Docker (set the socket path if it's not at the default location)
docker:
  path: /var/run/docker.sock

# For containerd
containerd:
  enabled: true
  path: /var/run/containerd/containerd.sock

# For CRI-O
crio:
  enabled: true
  path: /var/run/crio/crio.sock

# For k3s
k3s:
  enabled: true
  runtimePath: /run/k3s/containerd/containerd.sock
```

## Conclusion

Using Helm to install NeuVector provides a repeatable, versionable deployment method ideal for production environments. You can track changes through your values file in version control, perform clean upgrades, and quickly rollback if issues arise. For GitOps workflows, consider managing your NeuVector Helm release with Flux or ArgoCD.
