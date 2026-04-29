# How to Migrate from Kubernetes Dashboard to Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Migration, Kubernetes-dashboard, UI

Description: Guide to transitioning cluster management from the Kubernetes Dashboard to Rancher's more powerful UI.

## Introduction

Migrating from Kubernetes Dashboard to Rancher is primarily an access and operations migration, not a workload migration. Kubernetes Dashboard is deprecated and unmaintained, while Rancher can register existing Kubernetes clusters and manage them without moving workloads to a new runtime. This guide provides a systematic approach to making that transition with minimal disruption.

## Why Migrate to Rancher?

- **Centralized management**: Single pane of glass for multiple clusters
- **Access control**: Multi-cluster RBAC and authentication integrations
- **Kubernetes native**: Continue managing standard Kubernetes resources and workloads
- **Multi-cloud flexibility**: Import existing clusters or provision new ones across environments
- **GitOps support**: Fleet for declarative deployments

## Migration Strategy

### Phase 1: Assessment
Inventory how Kubernetes Dashboard is currently used, including namespaces, service accounts, RBAC, and any direct exposure.

### Phase 2: Preparation
Install Rancher on a dedicated management cluster, or confirm an existing Rancher server is ready.

### Phase 3: Migration
Register the existing Kubernetes cluster in Rancher and recreate access for the right users and teams.

### Phase 4: Validation
Verify users can perform the same operational tasks through Rancher and `kubectl`.

### Phase 5: Cutover
Remove direct Dashboard access and uninstall it when the rollback window is no longer needed.

## Step 1: Inventory Current Dashboard Access

```bash
#!/bin/bash
# inventory-dashboard-access.sh

echo "=== Kubernetes Dashboard Inventory ==="
echo ""
echo "Dashboard namespace:"
kubectl get namespace kubernetes-dashboard

echo ""
echo "Dashboard workloads:"
kubectl get all -n kubernetes-dashboard

echo ""
echo "Dashboard service accounts:"
kubectl get serviceaccounts -n kubernetes-dashboard

echo ""
echo "Dashboard-related RBAC:"
kubectl get rolebinding,clusterrolebinding -A | grep kubernetes-dashboard || true

echo ""
echo "Dashboard exposure:"
kubectl get ingress,svc -A | grep kubernetes-dashboard || true
```

## Step 2: Install Rancher

For production, Rancher recommends installing the management server on a dedicated Kubernetes cluster. If you already have a Rancher server, skip to the next step.

```bash
# Add the Rancher Helm chart repository
helm repo add rancher-stable https://releases.rancher.com/server-charts/stable

# Create the namespace used by Rancher
kubectl create namespace cattle-system

# Install cert-manager for Rancher's default TLS configuration
helm repo add jetstack https://charts.jetstack.io
helm repo update
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true

# Install Rancher
helm install rancher rancher-stable/rancher \
  --namespace cattle-system \
  --set hostname=rancher.example.com \
  --set bootstrapPassword='STRONG_PASSWORD'
```

## Step 3: Register Your Existing Cluster

```bash
# Grant cluster-admin only if your current kubeconfig user does not already have it
kubectl create clusterrolebinding cluster-admin-binding \
  --clusterrole cluster-admin \
  --user your-user@example.com

# Confirm kubectl points at the cluster you want to register
kubectl get nodes
```

Rancher generates a one-time registration command for each cluster import, so use the command shown in the Rancher UI instead of hardcoding it in your scripts. In Rancher, go to `Cluster Management` > `Import Existing`, choose the correct cluster type, copy the generated `kubectl` command, and run it from the same kubeconfig context. Wait until the cluster state becomes `Active`.

## Step 4: Recreate Access Controls

```bash
# Export current RBAC so you can compare it while assigning Rancher roles
kubectl get clusterrolebinding,rolebinding -A -o yaml > rbac-export.yaml

# Example: create a service account for automation in an existing namespace
kubectl -n default create serviceaccount automation
kubectl create rolebinding default-edit \
  --clusterrole=edit \
  --serviceaccount=default:automation \
  --namespace default

# Request a bounded token for that service account
kubectl -n default create token automation
```

Dashboard access is often backed by service account tokens or broad role bindings. Recreate least-privilege access in Rancher, and only mint direct Kubernetes API tokens for automation that still needs them.

## Step 5: Validate Cluster Management in Rancher

```bash
# Rancher agents should now exist on the imported cluster
kubectl get all -n cattle-system

# Confirm the cluster itself remains healthy
kubectl get nodes
kubectl get pods -A
```

From Rancher, open the cluster in `Explore`, verify you can see nodes, namespaces, and workloads, and confirm that the expected users can access the cluster with the right permissions. You can also use Rancher's built-in `kubectl` shell or download a kubeconfig from the UI.

## Step 6: Retire Kubernetes Dashboard

```bash
# If Dashboard was installed with Helm, remove it after Rancher access is validated
helm uninstall kubernetes-dashboard -n kubernetes-dashboard

# Optionally remove the namespace when it is no longer needed
kubectl delete namespace kubernetes-dashboard
```

## Step 7: Validation Checklist

```bash
#!/bin/bash
# validation-checklist.sh

echo "=== Migration Validation ==="
echo "[ ] Rancher shows the cluster state as Active"
echo "[ ] Cluster Explorer can list nodes, namespaces, and workloads"
echo "[ ] Users and teams can access the cluster with the expected Rancher roles"
echo "[ ] Rancher-downloaded kubeconfig or kubectl shell works"
echo "[ ] Existing workloads remain healthy"
echo "[ ] Kubernetes Dashboard is no longer exposed"
echo "[ ] Kubernetes Dashboard is uninstalled or kept only for rollback"
```

## Conclusion

Migrating from Kubernetes Dashboard to Rancher is usually about replacing the management interface, not moving workloads to a new platform. In most cases you can register the existing cluster in Rancher, validate access controls, and retire Dashboard with little or no application downtime. Keep a rollback window until your teams have confirmed day-to-day operations in Rancher.
