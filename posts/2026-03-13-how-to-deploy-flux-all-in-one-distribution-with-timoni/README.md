# How to Deploy Flux All-In-One Distribution with Timoni

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux, kubernetes, gitops, timoni, distribution, installation

Description: Learn how to deploy the complete Flux distribution as a single Timoni module for simplified cluster bootstrapping.

---

## Introduction

Bootstrapping Flux on a new cluster typically involves installing individual controllers and configuring their interactions. The Flux All-In-One (AIO) distribution packages all Flux components into a single Timoni module, providing a one-command installation with customizable configuration. This approach simplifies cluster bootstrapping, enables consistent Flux deployments across environments, and makes it easy to manage Flux upgrades through Timoni's lifecycle management.

This guide walks through deploying the Flux AIO distribution with Timoni, covering basic installation, component customization, and production-ready configurations.

## Prerequisites

- A Kubernetes cluster (v1.28 or later)
- Timoni CLI installed (v0.20 or later)
- `kubectl` configured for your cluster
- Cluster admin permissions

## Step 1: Inspect the AIO Module

Examine the Flux AIO distribution module:

```bash
timoni mod values oci://ghcr.io/stefanprodan/modules/flux-aio
```

Pull the module locally for detailed inspection:

```bash
timoni mod pull oci://ghcr.io/stefanprodan/modules/flux-aio \
  --version latest \
  --output ./flux-aio
```

## Step 2: Basic Installation

Deploy Flux with default settings:

```bash
timoni apply flux oci://ghcr.io/stefanprodan/modules/flux-aio \
  --namespace flux-system
```

This installs all standard Flux components: source-controller, kustomize-controller, helm-controller, and notification-controller.

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
    source: true
    kustomize: true
    helm: true
    notification: true
    imageAutomation: false
    imageReflector: false
  hostNetwork: false
  securityProfile: "restricted"
  logLevel: "info"
  watchAllNamespaces: true
  networkPolicy: true
  resources:
    source:
      requests:
        cpu: 100m
        memory: 256Mi
      limits:
        memory: 1Gi
    kustomize:
      requests:
        cpu: 100m
        memory: 256Mi
      limits:
        memory: 1Gi
    helm:
      requests:
        cpu: 100m
        memory: 256Mi
      limits:
        memory: 1Gi
    notification:
      requests:
        cpu: 50m
        memory: 128Mi
      limits:
        memory: 256Mi
```

Apply with custom values:

```bash
timoni apply flux oci://ghcr.io/stefanprodan/modules/flux-aio \
  --values flux-aio-values.yaml \
  --namespace flux-system
```

## Step 4: Enable Image Automation

For clusters that need automated image updates, enable the image controllers:

```yaml
# flux-aio-images.yaml
values:
  controllers:
    source: true
    kustomize: true
    helm: true
    notification: true
    imageAutomation: true
    imageReflector: true
  resources:
    imageReflector:
      requests:
        cpu: 100m
        memory: 256Mi
      limits:
        memory: 1Gi
    imageAutomation:
      requests:
        cpu: 50m
        memory: 128Mi
      limits:
        memory: 256Mi
```

```bash
timoni apply flux oci://ghcr.io/stefanprodan/modules/flux-aio \
  --values flux-aio-images.yaml \
  --namespace flux-system
```

## Step 5: Production Configuration

Configure Flux for production with high availability and monitoring:

```yaml
# flux-aio-production.yaml
values:
  controllers:
    source: true
    kustomize: true
    helm: true
    notification: true
  logLevel: "info"
  watchAllNamespaces: true
  networkPolicy: true
  securityProfile: "restricted"
  resources:
    source:
      requests:
        cpu: 200m
        memory: 512Mi
      limits:
        memory: 2Gi
    kustomize:
      requests:
        cpu: 200m
        memory: 512Mi
      limits:
        memory: 2Gi
    helm:
      requests:
        cpu: 200m
        memory: 512Mi
      limits:
        memory: 2Gi
    notification:
      requests:
        cpu: 100m
        memory: 256Mi
      limits:
        memory: 512Mi
  controllerArgs:
    source:
      - "--helm-cache-max-size=50"
      - "--helm-cache-purge-interval=10m"
    kustomize:
      - "--concurrent=20"
      - "--requeue-dependency=10s"
    helm:
      - "--concurrent=20"
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
  controllers:
    source: true
    kustomize: true
    helm: true
    notification: true
  logLevel: "info"
  watchAllNamespaces: true
  networkPolicy: true
  securityProfile: "restricted"
  multitenancy:
    enabled: true
    defaultServiceAccount: "default"
    privileged: false
  controllerArgs:
    kustomize:
      - "--no-cross-namespace-refs"
      - "--default-service-account=default"
      - "--concurrent=20"
    helm:
      - "--no-cross-namespace-refs"
      - "--default-service-account=default"
      - "--concurrent=20"
    notification:
      - "--no-cross-namespace-refs"
    source:
      - "--no-cross-namespace-refs"
```

## Step 7: Upgrade Flux

Upgrade to a new version of Flux by updating the module version:

```bash
timoni apply flux oci://ghcr.io/stefanprodan/modules/flux-aio \
  --version 2.4.0 \
  --values flux-aio-production.yaml \
  --namespace flux-system
```

Check the upgrade status:

```bash
timoni status flux -n flux-system
flux check
```

## Step 8: Configure Initial Sync

After installing Flux, set up the initial Git sync for cluster bootstrapping:

```yaml
# flux-aio-with-sync.yaml
values:
  controllers:
    source: true
    kustomize: true
    helm: true
    notification: true
  sync:
    enabled: true
    url: "https://github.com/your-org/fleet-infra.git"
    ref:
      branch: "main"
    path: "./clusters/production"
    interval: "5m"
    secretRef:
      name: "git-credentials"
```

This configures Flux AIO to immediately begin reconciling from your Git repository after installation.

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

The Flux AIO distribution through Timoni provides the simplest way to deploy and manage a complete Flux installation. With a single module and values file, you can install all Flux components with production-ready configurations, manage upgrades declaratively, and maintain consistent Flux deployments across clusters. Whether you need a minimal development setup or a fully configured production deployment with multi-tenancy and image automation, the AIO module covers the entire spectrum of Flux installation requirements.
