# How to Migrate from Kubernetes Dashboard to Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Migration, Dashboard, DevOps

Description: Migrate your Kubernetes workload management from the default Kubernetes Dashboard to Portainer for enhanced RBAC and multi-cluster support.

## Introduction

Kubernetes Dashboard is Kubernetes' official web UI, but it is not deployed by default and the project is now deprecated and unmaintained. It also has significant limitations: Bearer Token login only, no multi-cluster support, and limited deployment workflows. Portainer provides a broader Kubernetes management experience with multi-environment management, GitOps workflows, and Helm support. Advanced RBAC and team access control are available in Portainer Business Edition.

## Limitations of Kubernetes Dashboard

- Deprecated and unmaintained
- No multi-cluster management from a single interface
- Bearer Token login only
- No built-in team/role management in the UI
- No Helm chart deployment workflow
- No Git-based deployment workflow

## Deploying Portainer for Kubernetes

```bash
# Install Portainer on your Kubernetes cluster via Helm

helm repo add portainer https://portainer.github.io/k8s/
helm repo update

# Install in the portainer namespace
helm upgrade --install portainer portainer/portainer \
  --namespace portainer \
  --create-namespace \
  --set service.type=LoadBalancer \
  --set tls.force=true \
  --set image.tag=lts

# Or with NodePort for on-premise clusters
helm upgrade --install portainer portainer/portainer \
  --namespace portainer \
  --create-namespace \
  --set service.type=NodePort \
  --set tls.force=true \
  --set service.httpsNodePort=30779 \
  --set image.tag=lts

# Check deployment status
kubectl -n portainer get pods
kubectl -n portainer get svc
```

## Connecting Portainer to Your Existing Cluster

If you want to import an existing cluster with a kubeconfig in Portainer Business Edition:

```bash
# Generate a self-contained kubeconfig for the current context
kubectl config view --flatten=true --minify=true > kubeconfig.yml

# In Portainer:
# Environment-related > Environments > Add environment
# Kubernetes > Start Wizard > More options > Import
# Upload kubeconfig.yml
```

This import path is a legacy feature that requires a load balancer, a kubeconfig with `current-context`, and cluster-admin credentials.

## Mapping Kubernetes Dashboard Features to Portainer

| Kubernetes Dashboard | Portainer Equivalent |
|---------------------|---------------------|
| Workloads > Deployments | Applications |
| Services | Networking > Services |
| Config Maps | ConfigMaps & Secrets > ConfigMaps |
| Secrets | ConfigMaps & Secrets > Secrets |
| Persistent Volume Claims | Volumes |
| Namespaces | Namespaces |
| Nodes | Cluster > Details |
| Pod Logs | Applications > select application > pod logs |
| Pod Exec (Shell) | Applications > select application > pod console |
| Resource YAML edit | Applications > select application > YAML (Business Edition) |

## Setting Up Namespace-Based Access Control

Portainer Business Edition's team access is more powerful than the Dashboard's:

```bash
# In Portainer UI:
# 1. User-related > Users > Create users for your team
# 2. User-related > Teams > Create teams (e.g., "backend-team", "frontend-team")
# 3. Namespaces > Manage access on the namespace you want to control
# 4. Assign the users/teams that should have access
```

## Migrating RBAC Configurations

```bash
# Export existing ClusterRoleBindings and RoleBindings
kubectl get rolebindings,clusterrolebindings -A -o yaml > rbac-backup.yaml

# In Portainer Business Edition, Kubernetes RBAC remains required.
# Portainer layers environment-level and namespace-level access on top of Kubernetes RBAC.
# - Environment level: Environments > Manage access
# - Namespace level: Namespaces > Manage access
```

## Using Helm in Portainer (Not Available in Dashboard)

```bash
# Deploy a Helm chart in Portainer
# Applications > Create from code > Helm chart
# Choose Helm repository as the deployment source
# Configure the release name, namespace, chart version, and values, then deploy
```

## Removing Kubernetes Dashboard After Migration

```bash
# Remove Kubernetes Dashboard after verifying Portainer works
helm uninstall kubernetes-dashboard -n kubernetes-dashboard

# Optionally remove the namespace if you no longer need it
kubectl delete namespace kubernetes-dashboard

# Verify removal (`NotFound` is expected if you deleted the namespace)
kubectl get namespace kubernetes-dashboard
```

## Accessing Multiple Clusters

One of Portainer's key advantages over the Dashboard:

```bash
# Add multiple clusters to Portainer
# Environment-related > Environments > Add environment (repeat for each cluster)
# Supported connection methods:
# - Kubernetes via Agent
# - Kubernetes via Edge Agent
# - Kubernetes via kubeconfig import (legacy, Business Edition only)

# Switch between environments from the Portainer Home page
```

## Conclusion

Migrating from Kubernetes Dashboard to Portainer provides multi-cluster management, Helm chart deployment, and GitOps workflows that Dashboard does not provide. If you need team-based RBAC and namespace-scoped access, use Portainer Business Edition. The migration is non-disruptive: Portainer sits alongside your existing cluster without changing workload configurations, making it a safe, incremental upgrade.
