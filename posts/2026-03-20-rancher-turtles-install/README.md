# How to Install Rancher Turtles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher Turtles, CAPI, Kubernetes, Rancher, Cluster Management

Description: A step-by-step guide to installing Rancher Turtles, the Cluster API integration for Rancher that enables declarative Kubernetes cluster lifecycle management.

## Introduction

Rancher Turtles is the official Cluster API (CAPI) integration for Rancher. It enables Rancher to manage Kubernetes cluster lifecycle using the Cluster API framework, providing a consistent interface for creating and managing clusters across multiple cloud providers, on-premises, and edge environments. Newer Rancher releases may already ship Rancher Turtles as a system chart; this guide covers the manual Helm installation path.

## Prerequisites

- A Rancher version compatible with the Rancher Turtles chart version you plan to install. For example, Rancher Turtles `0.26.0` is published for Rancher `v2.14.x`
- `kubectl` configured for your management cluster
- `helm` v3.x installed
- cert-manager available in the cluster if your Rancher environment requires it

## Step 1: Install cert-manager (if needed)

```bash
# Add Jetstack Helm repo
helm repo add jetstack https://charts.jetstack.io --force-update
helm repo update

# Install cert-manager
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version v1.20.2 \
  --set crds.enabled=true

# Verify installation
kubectl get pods -n cert-manager
```

## Step 2: Add the Rancher Turtles Helm Repository

```bash
# Add the Rancher Turtles Helm repo
helm repo add turtles https://rancher.github.io/turtles
helm repo update

# Verify the repo is available
helm search repo turtles
```

## Step 3: Install Rancher Turtles

```bash
# Install Rancher Turtles
helm install rancher-turtles turtles/rancher-turtles \
  --version 0.26.0 \
  --namespace cattle-turtles-system \
  --create-namespace \
  --wait \
  --timeout 180s
```

### Install with Custom Values

```yaml
# turtles-values.yaml
namespace: cattle-turtles-system

image:
  imagePullPolicy: IfNotPresent

features:
  agent-tls-mode:
    enabled: true
  no-cert-manager:
    enabled: true
  use-rancher-default-registry:
    enabled: true

cluster-api-operator:
  cluster-api:
    core:
      namespace: cattle-capi-system
      version: ""
```

```bash
helm install rancher-turtles turtles/rancher-turtles \
  --version 0.26.0 \
  --namespace cattle-turtles-system \
  --values turtles-values.yaml \
  --create-namespace \
  --wait \
  --timeout 180s
```

## Step 4: Verify the Installation

```bash
# Check Rancher Turtles pods
kubectl get pods -n cattle-turtles-system

# Check Cluster API core controller pods
kubectl get pods -n cattle-capi-system

# Verify CRDs are installed
kubectl get crd | grep -E 'cluster.x-k8s.io|turtles-capi.cattle.io'

# Check that the controllers are running
kubectl rollout status deployment/rancher-turtles-controller-manager -n cattle-turtles-system
kubectl rollout status deployment/capi-controller-manager -n cattle-capi-system
```

## Step 5: Verify in Rancher UI

1. Log into Rancher
2. Open the local cluster dashboard
3. Navigate to **Apps** > **Installed Apps**
4. Verify the `rancher-turtles` release is healthy in the `cattle-turtles-system` namespace

## Step 6: Install Infrastructure Providers

After installing Turtles, install the infrastructure providers you need declaratively with the `CAPIProvider` resource. For example, to install AWS (CAPA):

```yaml
# capa-provider.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: capa-system
---
apiVersion: turtles-capi.cattle.io/v1alpha1
kind: CAPIProvider
metadata:
  name: aws
  namespace: capa-system
spec:
  type: infrastructure
  variables:
    AWS_B64ENCODED_CREDENTIALS: ""
```

```bash
kubectl apply -f capa-provider.yaml

# Verify the provider controllers
kubectl get pods -n capa-system
```

## Upgrading Rancher Turtles

```bash
# Update the Helm repo
helm repo update

# Upgrade Turtles
helm upgrade rancher-turtles turtles/rancher-turtles \
  --version <new-version> \
  --namespace cattle-turtles-system \
  --reuse-values \
  --wait \
  --timeout 180s
```

## Uninstalling Rancher Turtles

```bash
# Remove the Helm release
helm uninstall rancher-turtles -n cattle-turtles-system --cascade foreground --wait

# Remove the namespace
kubectl delete namespace cattle-turtles-system

# Optionally remove CRDs (warning: deletes all CAPI and Rancher Turtles resources)
kubectl get crd | grep -E 'cluster.x-k8s.io|turtles-capi.cattle.io' | \
  awk '{print $1}' | xargs kubectl delete crd
```

## Conclusion

Rancher Turtles bridges the Cluster API ecosystem with Rancher's management capabilities, giving you a unified interface for managing clusters across infrastructure providers. Once installed, you can add CAPI providers declaratively with `CAPIProvider` resources and manage the resulting clusters through Rancher.
