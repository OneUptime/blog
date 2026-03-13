# How to Install Flux Operator on Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Flux Operator, Kubernetes, GitOps, Installation

Description: Learn how to install the Flux Operator on Kubernetes for simplified Flux lifecycle management and GitOps automation.

---

## Introduction

The Flux Operator is a Kubernetes operator that manages the lifecycle of Flux CD instances on your clusters. Instead of installing Flux components directly using the Flux CLI or Helm charts, the Flux Operator provides a declarative way to install, configure, and upgrade Flux through a FluxInstance custom resource. This approach aligns with GitOps principles by making Flux itself manageable through Kubernetes resources.

The Flux Operator simplifies multi-cluster Flux management, enables consistent Flux configurations across environments, and provides automated upgrades. This guide walks you through installing the Flux Operator on a Kubernetes cluster.

## Prerequisites

Before you begin, ensure you have:

- A Kubernetes cluster running version 1.25 or later.
- `kubectl` installed and configured.
- Helm 3 installed.
- Cluster admin permissions.

## Installing the Flux Operator with Helm

The recommended installation method is using the official Helm chart.

```bash
# Add the Flux Operator Helm repository
helm repo add controlplaneio-fluxcd https://controlplaneio-fluxcd.github.io/charts
helm repo update

# Install the Flux Operator
helm install flux-operator controlplaneio-fluxcd/flux-operator \
  --namespace flux-system \
  --create-namespace
```

Verify that the Flux Operator pod is running.

```bash
kubectl get pods -n flux-system
```

You should see a pod named `flux-operator` in a Running state.

## Installing with a Custom Values File

For production deployments, customize the installation with a values file.

```yaml
# flux-operator-values.yaml
# Custom Helm values for Flux Operator installation
replicaCount: 1

resources:
  limits:
    cpu: 500m
    memory: 256Mi
  requests:
    cpu: 100m
    memory: 128Mi

# Enable leader election for HA setups
leaderElection:
  enabled: true

# Configure logging
logLevel: info

# Set the image pull policy
image:
  pullPolicy: IfNotPresent

# Configure service account
serviceAccount:
  create: true
  name: flux-operator
```

Install with the custom values.

```bash
helm install flux-operator controlplaneio-fluxcd/flux-operator \
  --namespace flux-system \
  --create-namespace \
  --values flux-operator-values.yaml
```

## Installing with kubectl

Alternatively, install the Flux Operator using kubectl with the release manifests.

```bash
# Install the Flux Operator CRDs and deployment
kubectl apply -f https://github.com/controlplaneio-fluxcd/flux-operator/releases/latest/download/install.yaml
```

This installs the FluxInstance CRD, the operator Deployment, RBAC resources, and the flux-system namespace if it does not already exist.

## Verifying the Installation

After installation, verify that all components are running correctly.

```bash
# Check the operator deployment
kubectl get deployment flux-operator -n flux-system

# Check the operator logs for any errors
kubectl logs -l app.kubernetes.io/name=flux-operator -n flux-system

# Verify the FluxInstance CRD is installed
kubectl get crd fluxinstances.fluxcd.controlplane.io
```

The CRD should be listed, indicating that you can now create FluxInstance resources.

## Understanding the Flux Operator Architecture

The Flux Operator watches for FluxInstance custom resources and reconciles the Flux installation based on the desired state. When you create a FluxInstance, the operator installs or updates the Flux components according to your specification. This includes the source-controller, kustomize-controller, helm-controller, and notification-controller.

```bash
# List the CRDs installed by the operator
kubectl get crd | grep flux
```

## Creating a Basic FluxInstance

Once the operator is running, create a FluxInstance to install Flux on the cluster.

```yaml
# flux-instance.yaml
# Basic FluxInstance to install Flux with default settings
apiVersion: fluxcd.controlplane.io/v1
kind: FluxInstance
metadata:
  name: flux
  namespace: flux-system
spec:
  distribution:
    version: "2.x"
    registry: ghcr.io/fluxcd
  components:
    - source-controller
    - kustomize-controller
    - helm-controller
    - notification-controller
  cluster:
    type: kubernetes
```

Apply the FluxInstance.

```bash
kubectl apply -f flux-instance.yaml
```

## Verifying Flux Installation

After applying the FluxInstance, the operator will install the Flux components. Verify the installation.

```bash
# Check the FluxInstance status
kubectl get fluxinstance -n flux-system

# Check that Flux components are running
kubectl get pods -n flux-system

# Verify Flux controllers
kubectl get deployments -n flux-system
```

You should see the Flux controllers running alongside the Flux Operator.

## Configuring RBAC for the Flux Operator

The Flux Operator needs cluster-wide permissions to manage Flux components. The Helm chart and kubectl installation methods set up the required RBAC automatically. If you need to customize RBAC, here is the ClusterRole the operator requires.

```yaml
# flux-operator-rbac.yaml
# ClusterRole for the Flux Operator
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: flux-operator
rules:
  - apiGroups: ["*"]
    resources: ["*"]
    verbs: ["*"]
  - nonResourceURLs: ["*"]
    verbs: ["*"]
```

In production, you may want to scope these permissions more narrowly based on your security requirements.

## Uninstalling the Flux Operator

If you need to remove the Flux Operator, first delete the FluxInstance resources, then uninstall the operator.

```bash
# Delete FluxInstance resources
kubectl delete fluxinstance --all -n flux-system

# Uninstall the operator with Helm
helm uninstall flux-operator -n flux-system

# Or remove kubectl-installed resources
kubectl delete -f https://github.com/controlplaneio-fluxcd/flux-operator/releases/latest/download/install.yaml
```

## Conclusion

Installing the Flux Operator on Kubernetes provides a declarative, operator-managed approach to running Flux CD. Instead of managing Flux installations manually, the operator handles the lifecycle through FluxInstance custom resources, making it easier to maintain consistent Flux configurations across multiple clusters. The installation process is straightforward using either Helm or kubectl, and the operator immediately begins watching for FluxInstance resources to reconcile.
