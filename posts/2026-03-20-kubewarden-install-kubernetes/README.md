# How to Install Kubewarden on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubewarden, Kubernetes, Policy, Security, Admission Control

Description: A step-by-step guide to installing Kubewarden on a Kubernetes cluster using Helm, including CRDs, the policy server, and initial configuration.

## Introduction

Kubewarden is a Kubernetes admission controller that uses WebAssembly (Wasm) policies to validate and mutate Kubernetes resources. Policies can be written in any language that compiles to WebAssembly, and Kubewarden also supports Rego-based policies.

This guide covers the complete installation of Kubewarden on a Kubernetes cluster from scratch.

## Prerequisites

- Kubernetes cluster v1.19 or later
- Helm v3 or later
- `kubectl` configured with cluster access
- Cluster-admin permissions

## Architecture Overview

Kubewarden consists of:
- **kubewarden-controller**: Manages PolicyServer, AdmissionPolicy, and ClusterAdmissionPolicy lifecycle
- **audit-scanner**: Periodically scans existing cluster resources against installed policies
- **PolicyServer**: Runs WebAssembly policies and acts as the webhook server
- **AdmissionPolicy**: Namespace-scoped policy definitions
- **ClusterAdmissionPolicy**: Cluster-scoped policy definitions

## Step 1: Confirm Prerequisites

Kubewarden v1.17.0 and later do not require cert-manager. The Helm installation bootstraps the initial certificates, and the Kubewarden controller rotates them automatically.

## Step 2: Add the Kubewarden Helm Repository

```bash
# Add Kubewarden Helm charts repository
helm repo add kubewarden https://charts.kubewarden.io
helm repo update

# List available Kubewarden charts
helm search repo kubewarden
```

## Step 3: Install Kubewarden CRDs

```bash
# Install Kubewarden Custom Resource Definitions
helm install kubewarden-crds kubewarden/kubewarden-crds \
  --namespace kubewarden \
  --create-namespace \
  --wait

# Verify CRDs are installed
kubectl get crds | grep kubewarden
```

Expected output includes:
```text
admissionpolicies.policies.kubewarden.io
clusteradmissionpolicies.policies.kubewarden.io
policyservers.policies.kubewarden.io
```

## Step 4: Install the Kubewarden Controller

```bash
# Install the Kubewarden controller
helm install kubewarden-controller kubewarden/kubewarden-controller \
  --namespace kubewarden \
  --wait

# Verify the controller is running
kubectl get pods -n kubewarden
```

## Step 5: Install the Default Policy Server

```bash
# Install the default Kubewarden policy server
helm install kubewarden-defaults kubewarden/kubewarden-defaults \
  --namespace kubewarden \
  --wait

# Verify the policy server is running
kubectl get pods -n kubewarden
kubectl get policyserver -n kubewarden
```

Expected output:
```text
NAME      AGE
default   1m
```

## Step 6: Verify the Complete Installation

```bash
# Check all Kubewarden components are running
kubectl get all -n kubewarden

# Verify the policy server is active
kubectl describe policyserver default -n kubewarden

# Check the Kubewarden webhook configurations
kubectl get validatingwebhookconfigurations.admissionregistration.k8s.io \
  | grep kubewarden

kubectl get mutatingwebhookconfigurations.admissionregistration.k8s.io \
  | grep kubewarden
```

## Installing with Custom Options

### Production Installation with Custom Resources

```bash
# Install with production-ready resource settings
helm install kubewarden-controller kubewarden/kubewarden-controller \
  --namespace kubewarden \
  --set resources.controller.requests.cpu="100m" \
  --set resources.controller.requests.memory="128Mi" \
  --set resources.controller.limits.cpu="500m" \
  --set resources.controller.limits.memory="512Mi" \
  --set replicas=2

# Install policy server with HA
helm install kubewarden-defaults kubewarden/kubewarden-defaults \
  --namespace kubewarden \
  --set policyServer.replicaCount=3 \
  --set policyServer.requests.cpu="100m" \
  --set policyServer.requests.memory="128Mi" \
  --set policyServer.limits.cpu="500m" \
  --set policyServer.limits.memory="512Mi"
```

### Air-Gapped Installation

For air-gapped environments, pre-pull all images:

```bash
# Get the list of images needed
{
  helm template kubewarden-controller kubewarden/kubewarden-controller
  helm template kubewarden-defaults kubewarden/kubewarden-defaults
} | grep "image:" | sort -u

# Pull and push images to your private registry
# Then install with custom image registry
helm install kubewarden-controller kubewarden/kubewarden-controller \
  --namespace kubewarden \
  --set global.cattle.systemDefaultRegistry=registry.internal.example.com

helm install kubewarden-defaults kubewarden/kubewarden-defaults \
  --namespace kubewarden \
  --set global.cattle.systemDefaultRegistry=registry.internal.example.com
```

## Upgrading Kubewarden

```bash
# Update the Helm repo
helm repo update

# Upgrade CRDs first
helm upgrade kubewarden-crds kubewarden/kubewarden-crds \
  --namespace kubewarden

# Upgrade the controller
helm upgrade kubewarden-controller kubewarden/kubewarden-controller \
  --namespace kubewarden

# Upgrade the defaults (policy server)
helm upgrade kubewarden-defaults kubewarden/kubewarden-defaults \
  --namespace kubewarden
```

## Uninstalling Kubewarden

```bash
# Remove in reverse order
helm uninstall kubewarden-defaults -n kubewarden
helm uninstall kubewarden-controller -n kubewarden
helm uninstall kubewarden-crds -n kubewarden

# Delete the namespace
kubectl delete namespace kubewarden
```

## Conclusion

Installing Kubewarden on Kubernetes sets up a powerful, WebAssembly-based admission control system. The three-step Helm installation - CRDs, controller, and policy server - provides a clean, upgradeable installation with built-in certificate management in current Kubewarden releases. With Kubewarden installed, you are ready to deploy admission policies that enforce security, compliance, and operational best practices across your cluster.
