# How to Handle Kubernetes API Server Upgrades with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Day 2 Operations, API Server Upgrade, Cluster Upgrade

Description: Safely upgrade the Kubernetes API server in a Flux-managed cluster by coordinating Flux reconciliation with the upgrade process to avoid disruptions.

---

## Introduction

Kubernetes API server upgrades are one of the most consequential operations in cluster management. The API server is the central control plane component - Flux's controllers, all Kubernetes controllers, and all operator tools depend on it. During an upgrade, the API server may be briefly unavailable, API versions may be deprecated, and CRDs may need migration.

Flux CD has specific behaviors during API server upgrades that you need to understand: its controllers will retry with backoff when the API server is unavailable, deprecated API versions in your Git manifests will cause reconciliation failures, and the upgrade itself should ideally be performed with Flux temporarily suspended to prevent reconciliation noise during the sensitive upgrade window.

This guide covers the complete workflow for upgrading the Kubernetes API server in a Flux-managed cluster safely.

## Prerequisites

- Flux CD v2 managing resources in the cluster
- A current cluster backup (etcd snapshot)
- The target Kubernetes version's release notes reviewed
- kubectl, Flux CLI, and your cluster management tool (kubeadm, cloud provider CLI)

## Step 1: Pre-Upgrade API Deprecation Check

API deprecations are the most common cause of post-upgrade failures. Flux manifests that use deprecated API versions will fail to reconcile after the upgrade.

```bash
# Install pluto for deprecated API detection
helm repo add fairwinds-stable https://charts.fairwinds.com/stable
helm install pluto fairwinds-stable/pluto \
  --namespace pluto \
  --create-namespace

# Or install the CLI directly
curl -L https://github.com/FairwindsOps/pluto/releases/latest/download/pluto_linux_amd64.tar.gz | tar xz
sudo mv pluto /usr/local/bin/

# Check all Kustomize manifests for deprecated APIs
pluto detect-all-in-cluster --target-versions k8s=v1.30.0

# Check your Git repository manifests
pluto detect-files --directory /path/to/platform-gitops \
  --target-versions k8s=v1.30.0

# Example output:
# NAME                      KIND         VERSION    REPLACEMENT      REMOVED  DEPRECATED
# my-service-ingress        Ingress      networking.k8s.io/v1beta1  networking.k8s.io/v1  true  true
```

## Step 2: Update Deprecated API Versions in Git

For each deprecated API found, update the manifests in Git before performing the upgrade.

```yaml
# Before: deprecated API version
# deploy/ingress.yaml
apiVersion: networking.k8s.io/v1beta1   # Removed in k8s 1.22
kind: Ingress

# After: current API version
apiVersion: networking.k8s.io/v1        # Required from k8s 1.22+
kind: Ingress
metadata:
  name: my-service
spec:
  ingressClassName: nginx               # Required field in v1
  rules:
    - host: my-service.acme.example.com
      http:
        paths:
          - path: /
            pathType: Prefix            # Required field in v1
            backend:
              service:
                name: my-service
                port:
                  number: 8080
```

Commit all API version updates before starting the upgrade.

## Step 3: Take a Pre-Upgrade Snapshot

```bash
# Snapshot current Flux state
flux get all --all-namespaces > /tmp/flux-pre-upgrade-state-$(date +%Y%m%d).txt

# Backup etcd (command varies by cluster setup)
# For kubeadm clusters:
ETCDCTL_API=3 etcdctl snapshot save /backup/etcd-snapshot-pre-upgrade.db \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key

echo "Snapshot saved. Proceeding with upgrade preparation."
```

## Step 4: Suspend Flux Before the Upgrade

```bash
# Suspend all Flux sources and reconcilers
kubectl get kustomizations --all-namespaces -o json | \
  jq -r '.items[] | "\(.metadata.namespace) \(.metadata.name)"' | \
  while read ns name; do
    flux suspend kustomization "$name" -n "$ns"
  done

kubectl get helmreleases --all-namespaces -o json | \
  jq -r '.items[] | "\(.metadata.namespace) \(.metadata.name)"' | \
  while read ns name; do
    flux suspend helmrelease "$name" -n "$ns"
  done

echo "Flux suspended. Proceeding with API server upgrade."
```

## Step 5: Perform the API Server Upgrade

The upgrade process varies by cluster setup. For kubeadm:

```bash
# For kubeadm clusters - upgrade control plane
kubeadm upgrade plan v1.30.0
kubeadm upgrade apply v1.30.0

# For managed clusters (EKS, GKE, AKS) - use the provider CLI
# EKS example:
aws eks update-cluster-version \
  --name my-cluster \
  --kubernetes-version 1.30 \
  --region us-east-1

# GKE example:
gcloud container clusters upgrade my-cluster \
  --master \
  --cluster-version 1.30

# Monitor the upgrade progress
kubectl get nodes --watch
kubectl get pods -n kube-system --watch
```

## Step 6: Verify API Server Health

```bash
# Wait for API server to be healthy
kubectl wait --for=condition=Ready nodes --all --timeout=10m

# Test the API server
kubectl get namespaces
kubectl cluster-info

# Check control plane component health
kubectl get componentstatuses

# Verify Flux controllers are still running
kubectl get pods -n flux-system
```

## Step 7: Update Flux CRDs if Needed

Check if the Flux version needs updating for the new Kubernetes version compatibility.

```bash
# Check Flux compatibility with the new Kubernetes version
flux check --pre

# If Flux needs updating, apply the update via its own GitOps manifest:
# Update the flux-system kustomization.yaml to reference a new Flux version
# Then resume and let Flux update itself

# Or update Flux directly:
flux install --version=v2.3.0 --export | kubectl apply -f -
```

## Step 8: Resume Flux and Verify Convergence

```bash
# Resume all Kustomizations in dependency order
flux resume kustomization infrastructure -n flux-system
flux reconcile kustomization infrastructure -n flux-system --with-source

# Wait for infrastructure to be healthy
flux get kustomization infrastructure -n flux-system --watch

# Resume remaining Kustomizations
kubectl get kustomizations --all-namespaces -o json | \
  jq -r '.items[] | select(.spec.suspend == true) | "\(.metadata.namespace) \(.metadata.name)"' | \
  while read ns name; do
    flux resume kustomization "$name" -n "$ns"
    sleep 2
  done

# Resume HelmReleases
kubectl get helmreleases --all-namespaces -o json | \
  jq -r '.items[] | select(.spec.suspend == true) | "\(.metadata.namespace) \(.metadata.name)"' | \
  while read ns name; do
    flux resume helmrelease "$name" -n "$ns"
    sleep 2
  done

# Verify all reconciliation is healthy
flux get all --all-namespaces | grep "False"
```

## Best Practices

- Always upgrade the API version in Git manifests before the cluster upgrade, not after
- Run `pluto detect-all-in-cluster` weekly as part of your normal operations to catch deprecations early
- Test the upgrade in a staging cluster with the same Flux configuration before production
- Upgrade one minor version at a time - do not skip versions (e.g., 1.27 → 1.28 → 1.29, not 1.27 → 1.29)
- Keep Flux version within the supported range for your Kubernetes version (check Flux's compatibility matrix)
- After resuming, monitor Flux reconciliation logs for any remaining API version errors

## Conclusion

Kubernetes API server upgrades require careful coordination with Flux to avoid reconciliation failures caused by deprecated API versions. By checking for deprecated APIs in Git manifests before the upgrade, suspending Flux during the upgrade window, and resuming in dependency order afterward, you can perform major Kubernetes version upgrades with confidence. The GitOps model actually makes upgrades safer - your manifests are in Git, deprecation scanning tools can check them automatically, and the audit trail documents every step of the upgrade process.
