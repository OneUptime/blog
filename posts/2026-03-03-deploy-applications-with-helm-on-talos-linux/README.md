# How to Deploy Applications with Helm on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Helm, Kubernetes, Application Deployment, DevOps

Description: Learn how to deploy, manage, and upgrade applications using Helm charts on a Talos Linux Kubernetes cluster.

---

Deploying applications on Kubernetes can involve writing dozens of YAML manifests, keeping track of dependencies, and managing configuration across environments. Helm simplifies all of this by packaging everything into charts that you can install with a single command. When you combine Helm with Talos Linux, you get a robust deployment workflow that is both repeatable and easy to manage.

This guide covers the full lifecycle of deploying applications with Helm on a Talos Linux cluster, from finding charts to upgrading and rolling back releases.

## Prerequisites

Before starting, ensure you have:

- A running Talos Linux cluster with kubectl access
- Helm 3 installed on your workstation
- At least one Helm repository added (such as Bitnami)

Quick check:

```bash
# Verify Helm is installed and connected
helm version
kubectl get nodes
```

## Finding and Inspecting Charts

Before deploying anything, you need to find the right chart. Helm repositories contain hundreds of pre-built charts for popular applications.

```bash
# Search for a chart in your added repositories
helm search repo nginx

# Search the Artifact Hub for charts from all sources
helm search hub postgresql

# Get detailed information about a specific chart
helm show chart bitnami/nginx

# View all configurable values for a chart
helm show values bitnami/nginx
```

The `helm show values` command is particularly useful because it outputs every configurable parameter with its default value. You will want to review these carefully before deploying.

## Installing a Chart

The simplest way to deploy an application is with `helm install`:

```bash
# Install NGINX with default values
helm install my-web-server bitnami/nginx --namespace web --create-namespace
```

This creates a release named "my-web-server" in the "web" namespace. The `--create-namespace` flag tells Helm to create the namespace if it does not exist.

For production deployments, you will almost always want to customize values:

```bash
# Install with custom values passed on the command line
helm install my-web-server bitnami/nginx \
  --namespace web \
  --create-namespace \
  --set replicaCount=3 \
  --set service.type=ClusterIP \
  --set resources.requests.memory=128Mi \
  --set resources.requests.cpu=100m
```

## Using Values Files

For anything beyond a few parameters, use a values file instead of inline `--set` flags:

```yaml
# values-production.yaml
replicaCount: 3

service:
  type: ClusterIP
  port: 80

resources:
  requests:
    memory: 128Mi
    cpu: 100m
  limits:
    memory: 256Mi
    cpu: 200m

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 75

nodeSelector:
  kubernetes.io/os: linux

tolerations: []

affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchExpressions:
              - key: app.kubernetes.io/name
                operator: In
                values:
                  - nginx
          topologyKey: kubernetes.io/hostname
```

Install using the values file:

```bash
# Install using a custom values file
helm install my-web-server bitnami/nginx \
  --namespace web \
  --create-namespace \
  -f values-production.yaml
```

You can also combine multiple values files. Values from later files override earlier ones:

```bash
# Layer values files for environment-specific configuration
helm install my-web-server bitnami/nginx \
  --namespace web \
  --create-namespace \
  -f values-base.yaml \
  -f values-production.yaml
```

## Deploying a Database

Let us walk through a more practical example. Deploying PostgreSQL for a production workload on Talos Linux:

```yaml
# postgres-values.yaml
auth:
  postgresPassword: "your-secure-password"
  username: appuser
  password: "app-user-password"
  database: myapp

primary:
  persistence:
    enabled: true
    size: 20Gi
    storageClass: "local-path"
  resources:
    requests:
      memory: 256Mi
      cpu: 250m
    limits:
      memory: 512Mi
      cpu: 500m

readReplicas:
  replicaCount: 2
  persistence:
    enabled: true
    size: 20Gi
    storageClass: "local-path"

metrics:
  enabled: true
  serviceMonitor:
    enabled: true
```

```bash
# Deploy PostgreSQL
helm install my-postgres bitnami/postgresql \
  --namespace databases \
  --create-namespace \
  -f postgres-values.yaml

# Check the status of the release
helm status my-postgres --namespace databases

# Watch the pods come up
kubectl get pods --namespace databases -w
```

## Checking Release Status

After deploying, you will want to verify everything is healthy:

```bash
# List all releases in all namespaces
helm list --all-namespaces

# Get detailed status for a specific release
helm status my-web-server --namespace web

# View the actual Kubernetes manifests that Helm generated
helm get manifest my-web-server --namespace web

# View the values that were used for the release
helm get values my-web-server --namespace web
```

## Upgrading a Release

When you need to change configuration or upgrade to a newer chart version, use `helm upgrade`:

```bash
# Upgrade with new values
helm upgrade my-web-server bitnami/nginx \
  --namespace web \
  -f values-production.yaml \
  --set replicaCount=5

# Upgrade to a specific chart version
helm upgrade my-web-server bitnami/nginx \
  --namespace web \
  --version 15.0.0 \
  -f values-production.yaml
```

A good practice is to use the `--atomic` flag, which automatically rolls back if the upgrade fails:

```bash
# Upgrade with automatic rollback on failure
helm upgrade my-web-server bitnami/nginx \
  --namespace web \
  -f values-production.yaml \
  --atomic \
  --timeout 5m
```

## Rolling Back a Release

If an upgrade causes issues, you can roll back to a previous revision:

```bash
# View the release history
helm history my-web-server --namespace web

# Roll back to the previous revision
helm rollback my-web-server --namespace web

# Roll back to a specific revision number
helm rollback my-web-server 2 --namespace web
```

## Using Helm with Talos-Specific Considerations

Talos Linux has some characteristics that affect Helm deployments:

1. There is no local storage on Talos nodes by default. Charts that require persistent storage need a proper CSI driver or storage class configured in the cluster.

2. Talos does not run a container runtime you can access directly. Debugging pod issues means using kubectl logs and kubectl exec rather than docker commands.

3. Network policies are enforced if you have a CNI that supports them. Make sure your Helm values account for any network restrictions.

```bash
# If a pod is stuck, check events and logs
kubectl describe pod <pod-name> --namespace web
kubectl logs <pod-name> --namespace web

# Check if persistent volume claims are bound
kubectl get pvc --namespace web
```

## Dry Run and Template Rendering

Before deploying to production, always test your values with a dry run:

```bash
# Perform a dry run to see what would be deployed
helm install my-web-server bitnami/nginx \
  --namespace web \
  -f values-production.yaml \
  --dry-run

# Render templates locally without connecting to the cluster
helm template my-web-server bitnami/nginx \
  -f values-production.yaml
```

The dry run sends the rendered manifests to the API server for validation without actually creating resources. The template command renders everything locally, which is useful for debugging chart issues.

## Uninstalling a Release

When you no longer need a deployment:

```bash
# Uninstall a release
helm uninstall my-web-server --namespace web

# Note: PersistentVolumeClaims are NOT deleted by default
# Clean them up manually if needed
kubectl delete pvc --all --namespace web
```

## Summary

Helm makes deploying applications on Talos Linux clusters straightforward and repeatable. By using values files, you can maintain consistent configurations across environments. The upgrade and rollback capabilities give you confidence when pushing changes to production. Combined with the immutability and security of Talos Linux, Helm provides a solid foundation for managing your Kubernetes workloads.
