# How to Deploy Flux All-In-One Distribution with Timoni

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Timoni, Distribution, Installation

Description: Learn how to deploy the complete Flux distribution as a single Timoni module for simplified cluster bootstrapping.

---

## Introduction

Bootstrapping Flux on a new cluster typically involves installing individual controllers and configuring their interactions. The Flux All-In-One (AIO) distribution packages the Flux core components into a single Timoni module, providing a one-command installation with customizable configuration. This approach simplifies cluster bootstrapping, enables consistent Flux deployments across environments, and makes it easy to manage Flux upgrades through Timoni's lifecycle management.

This guide walks through deploying the Flux AIO distribution with Timoni, covering basic installation, component customization, and production-ready configurations.

## Prerequisites

- A Kubernetes cluster version supported by the Flux AIO release you install (Flux v2.8 supports Kubernetes v1.33 to v1.35)
- Timoni CLI installed
- Flux CLI installed for `flux check`
- `kubectl` configured for your cluster
- Cluster admin permissions

## Step 1: Inspect the AIO Module

Examine the Flux AIO distribution module:

```bash
timoni mod list oci://ghcr.io/stefanprodan/modules/flux-aio
```

Pull the module locally and inspect its configuration schema:

```bash
timoni mod pull oci://ghcr.io/stefanprodan/modules/flux-aio \
  --output ./flux-aio
timoni mod show config ./flux-aio
```

## Step 2: Basic Installation

Deploy Flux with default settings:

```bash
timoni apply flux oci://ghcr.io/stefanprodan/modules/flux-aio \
  --namespace flux-system
```

This installs the Flux AIO deployment with the standard Flux components: source-controller, source-watcher, kustomize-controller, helm-controller, and notification-controller.

Verify the installation:

```bash
kubectl get pods -n flux-system
flux check
```

## Step 3: Customized Installation

Create a values file for a customized deployment:

```yaml
# flux-aio-values.yaml

values:
  controllers:
    source:
      resources:
        requests:
          cpu: 100m
          memory: 256Mi
        limits:
          memory: 1Gi
    kustomize:
      enabled: true
      resources:
        requests:
          cpu: 100m
          memory: 256Mi
        limits:
          memory: 1Gi
    helm:
      enabled: true
      resources:
        requests:
          cpu: 100m
          memory: 256Mi
        limits:
          memory: 1Gi
    notification:
      enabled: true
      resources:
        requests:
          cpu: 50m
          memory: 128Mi
        limits:
          memory: 256Mi
    watcher:
      enabled: true
  hostNetwork: false
  securityProfile: "restricted"
  podSecurityProfile: "restricted"
  logLevel: "info"
```

Apply with custom values:

```bash
timoni apply flux oci://ghcr.io/stefanprodan/modules/flux-aio \
  --values flux-aio-values.yaml \
  --namespace flux-system
```

## Step 4: Configure Source Watcher

For clusters that need event-driven source updates, keep the source-watcher component enabled:

```yaml
# flux-aio-watcher.yaml
values:
  controllers:
    watcher:
      enabled: true
      resources:
        requests:
          cpu: 50m
          memory: 128Mi
        limits:
          memory: 256Mi
```

```bash
timoni apply flux oci://ghcr.io/stefanprodan/modules/flux-aio \
  --values flux-aio-watcher.yaml \
  --namespace flux-system
```

## Step 5: Production Configuration

Configure Flux for production with restricted security settings, persistent cache storage, and higher reconciliation concurrency:

```yaml
# flux-aio-production.yaml
values:
  controllers:
    source:
      resources:
        requests:
          cpu: 200m
          memory: 512Mi
        limits:
          memory: 2Gi
    kustomize:
      enabled: true
      resources:
        requests:
          cpu: 200m
          memory: 512Mi
        limits:
          memory: 2Gi
    helm:
      enabled: true
      resources:
        requests:
          cpu: 200m
          memory: 512Mi
        limits:
          memory: 2Gi
    notification:
      enabled: true
      resources:
        requests:
          cpu: 100m
          memory: 256Mi
        limits:
          memory: 512Mi
  logLevel: "info"
  securityProfile: "restricted"
  podSecurityProfile: "restricted"
  persistence:
    enabled: true
    storageClass: "standard"
    size: "8Gi"
  reconcile:
    concurrent: 20
    requeue: 10
```

```bash
timoni apply flux oci://ghcr.io/stefanprodan/modules/flux-aio \
  --values flux-aio-production.yaml \
  --namespace flux-system
```

## Step 6: Multi-Tenant Configuration

Configure Flux for multi-tenant clusters:

```yaml
# flux-aio-multitenant.yaml
values:
  logLevel: "info"
  securityProfile: "restricted"
  podSecurityProfile: "restricted"
```

With the restricted profile, Flux Kustomizations and HelmReleases cannot create cluster-wide resources unless they run in the `flux-system` namespace. Use the `flux-tenant` and `flux-git-sync` Timoni modules to onboard tenant namespaces and reconcile tenant repositories with a restricted service account.

## Step 7: Upgrade Flux

Upgrade to a new version of Flux by updating the module version:

```bash
timoni apply flux oci://ghcr.io/stefanprodan/modules/flux-aio \
  --version 2.8.0-0 \
  --values flux-aio-production.yaml \
  --namespace flux-system
```

Check the upgrade status:

```bash
timoni status flux -n flux-system
flux check
```

## Step 8: Configure Initial Sync

After installing Flux, set up the initial Git sync for cluster bootstrapping with the `flux-git-sync` module:

```yaml
# flux-git-sync.yaml
values:
  git:
    url: "https://github.com/your-org/fleet-infra.git"
    ref: "refs/heads/main"
    path: "./clusters/production"
    interval: 5
  sync:
    targetNamespace: "default"
    wait: true
```

```bash
timoni apply cluster-sync oci://ghcr.io/stefanprodan/modules/flux-git-sync \
  --values flux-git-sync.yaml \
  --namespace flux-system
```

This creates Flux GitRepository and Kustomization resources so Flux begins reconciling from your Git repository after installation.

## Step 9: Uninstall Flux

To remove Flux and all its resources:

```bash
timoni delete flux -n flux-system
```

For a clean uninstall that also removes CRDs:

```bash
timoni delete flux -n flux-system
kubectl delete crds -l app.kubernetes.io/part-of=flux
```

## Conclusion

The Flux AIO distribution through Timoni provides the simplest way to deploy and manage the Flux core controllers. With a single module and values file, you can install the core components with production-ready configurations, manage upgrades declaratively, and maintain consistent Flux deployments across clusters. For Git sync and multi-tenancy, pair the AIO module with the companion `flux-git-sync` and `flux-tenant` modules.
