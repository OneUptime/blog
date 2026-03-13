# How to Use Timoni flux-oci-sync Module for OCI Deployments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Timoni, OCI, Oci-Sync

Description: Learn how to use the Timoni flux-oci-sync module to deploy Kubernetes manifests from OCI repositories with Flux.

---

## Introduction

OCI repositories are increasingly used to distribute Kubernetes manifests as container-compatible artifacts. The Timoni flux-oci-sync module provides a streamlined way to configure Flux for OCI-based deployments. Instead of manually creating OCIRepository and Kustomization resources, the module generates all required Flux resources from a simple values configuration, with built-in type checking and validation through CUE.

This guide walks through deploying applications from OCI repositories using the Timoni flux-oci-sync module, covering basic setup, authentication, and advanced configuration.

## Prerequisites

- A Kubernetes cluster with Flux v2.0 or later installed
- Timoni CLI installed (v0.20 or later)
- An OCI registry containing Kubernetes manifest artifacts
- `kubectl` configured for your cluster

## Step 1: Understand the Module

The flux-oci-sync module generates two Flux resources: an OCIRepository source and a Kustomization that deploys from that source. Inspect the module to see its available values:

```bash
timoni mod values oci://ghcr.io/stefanprodan/modules/flux-oci-sync
```

This shows the CUE schema with all configurable parameters including the OCI URL, tag, interval, target namespace, and Kustomize options.

## Step 2: Create a Basic OCI Sync Configuration

Create a values file for a basic OCI deployment:

```yaml
# oci-sync-values.yaml
values:
  oci:
    url: "oci://ghcr.io/your-org/app-manifests"
    tag: "latest"
    interval: "10m"
    provider: "generic"
  sync:
    path: "./"
    prune: true
    wait: true
    interval: "10m"
    targetNamespace: "production"
```

Preview the generated resources:

```bash
timoni build app-sync oci://ghcr.io/stefanprodan/modules/flux-oci-sync \
  --values oci-sync-values.yaml \
  --namespace flux-system
```

The output shows the OCIRepository and Kustomization that will be created:

```yaml
# Generated OCIRepository
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: app-sync
  namespace: flux-system
spec:
  interval: 10m
  url: oci://ghcr.io/your-org/app-manifests
  ref:
    tag: latest
  provider: generic
---
# Generated Kustomization
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-sync
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: OCIRepository
    name: app-sync
  path: ./
  prune: true
  wait: true
  targetNamespace: production
```

## Step 3: Deploy the OCI Sync

Apply the module to your cluster:

```bash
timoni apply app-sync oci://ghcr.io/stefanprodan/modules/flux-oci-sync \
  --values oci-sync-values.yaml \
  --namespace flux-system
```

Check the instance status:

```bash
timoni status app-sync -n flux-system
```

Verify the Flux resources are reconciling:

```bash
flux get sources oci -n flux-system
flux get kustomizations -n flux-system
```

## Step 4: Configure Registry Authentication

For private OCI registries, add authentication credentials:

```yaml
# oci-sync-private.yaml
values:
  oci:
    url: "oci://my-registry.example.com/apps/frontend"
    tag: "v1.5.0"
    interval: "10m"
    provider: "generic"
    secretRef:
      name: "oci-registry-creds"
  sync:
    path: "./"
    prune: true
    targetNamespace: "production"
```

Create the registry credentials secret before applying:

```bash
kubectl create secret docker-registry oci-registry-creds \
  -n flux-system \
  --docker-server=my-registry.example.com \
  --docker-username=your-user \
  --docker-password=your-token
```

Then apply the module:

```bash
timoni apply app-sync oci://ghcr.io/stefanprodan/modules/flux-oci-sync \
  --values oci-sync-private.yaml \
  --namespace flux-system
```

## Step 5: Use Cloud Provider Authentication

For cloud-hosted registries, use the built-in provider authentication:

```yaml
# oci-sync-aws.yaml
values:
  oci:
    url: "oci://123456789012.dkr.ecr.us-east-1.amazonaws.com/app-manifests"
    tag: "latest"
    interval: "10m"
    provider: "aws"
  sync:
    path: "./"
    prune: true
    targetNamespace: "production"
```

Supported providers include `aws`, `azure`, `gcp`, and `generic`.

## Step 6: Pin to Specific Versions

For production deployments, pin to a specific semver tag or digest:

```yaml
# oci-sync-pinned.yaml
values:
  oci:
    url: "oci://ghcr.io/your-org/app-manifests"
    tag: "v2.1.0"
    interval: "30m"
    provider: "generic"
  sync:
    path: "./"
    prune: true
    wait: true
    timeout: "5m"
    targetNamespace: "production"
```

Using semver ranges:

```yaml
values:
  oci:
    url: "oci://ghcr.io/your-org/app-manifests"
    semver: ">=2.0.0 <3.0.0"
    interval: "10m"
```

## Step 7: Add Health Checks and Substitution

Configure post-build substitution and health checks:

```yaml
# oci-sync-advanced.yaml
values:
  oci:
    url: "oci://ghcr.io/your-org/app-manifests"
    tag: "v2.1.0"
    interval: "10m"
  sync:
    path: "./production"
    prune: true
    wait: true
    timeout: "10m"
    targetNamespace: "production"
    postBuild:
      substitute:
        CLUSTER_NAME: "prod-us-east"
        ENVIRONMENT: "production"
      substituteFrom:
        - kind: ConfigMap
          name: cluster-vars
```

## Step 8: Manage Multiple OCI Syncs

Deploy multiple applications from different OCI artifacts:

```bash
# Deploy frontend
timoni apply frontend-sync oci://ghcr.io/stefanprodan/modules/flux-oci-sync \
  --values frontend-values.yaml \
  --namespace flux-system

# Deploy backend
timoni apply backend-sync oci://ghcr.io/stefanprodan/modules/flux-oci-sync \
  --values backend-values.yaml \
  --namespace flux-system

# List all instances
timoni list -n flux-system
```

## Step 9: Update and Rollback

Update an OCI sync to a new version:

```bash
# Update values
timoni apply app-sync oci://ghcr.io/stefanprodan/modules/flux-oci-sync \
  --values updated-values.yaml \
  --namespace flux-system
```

Check the update status:

```bash
timoni status app-sync -n flux-system
flux get kustomizations app-sync -n flux-system
```

## Conclusion

The Timoni flux-oci-sync module simplifies deploying Kubernetes manifests from OCI repositories through Flux. By encapsulating the OCIRepository and Kustomization configuration in a single module with CUE-based validation, you reduce configuration errors and get a consistent deployment pattern across your infrastructure. Whether you are deploying from public registries, private registries with credentials, or cloud provider registries, the module handles the plumbing so you can focus on the deployment configuration.
