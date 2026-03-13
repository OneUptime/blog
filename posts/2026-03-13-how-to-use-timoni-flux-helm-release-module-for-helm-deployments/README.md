# How to Use Timoni flux-helm-release Module for Helm Deployments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux, kubernetes, gitops, timoni, helm, helmrelease

Description: Learn how to use the Timoni flux-helm-release module to manage Helm-based deployments through Flux with type-safe configuration.

---

## Introduction

Helm charts are the most widely used packaging format for Kubernetes applications. Managing Helm deployments through Flux requires creating HelmRepository, HelmChart, and HelmRelease resources. The Timoni flux-helm-release module encapsulates this pattern, generating all required Flux resources from a single values configuration. With CUE-based type checking, you get validation at build time rather than discovering configuration errors during deployment.

This guide shows you how to deploy Helm charts using the Timoni flux-helm-release module, covering chart sources, values configuration, upgrades, and rollback strategies.

## Prerequisites

- A Kubernetes cluster with Flux installed (including helm-controller)
- Timoni CLI installed (v0.20 or later)
- `kubectl` and `helm` CLI tools
- A Helm chart available in a repository or OCI registry

## Step 1: Inspect the Module

View the available configuration options:

```bash
timoni mod values oci://ghcr.io/stefanprodan/modules/flux-helm-release
```

## Step 2: Deploy a Chart from a Helm Repository

Create a values file for deploying a chart from a traditional Helm repository:

```yaml
# helm-release-values.yaml
values:
  repository:
    url: "https://charts.bitnami.com/bitnami"
    type: "default"
    interval: "1h"
  chart:
    name: "redis"
    version: "18.x"
  release:
    interval: "10m"
    targetNamespace: "cache"
    createNamespace: true
    values:
      architecture: replication
      auth:
        enabled: true
        existingSecret: redis-credentials
      replica:
        replicaCount: 3
        persistence:
          size: 10Gi
      metrics:
        enabled: true
```

Build to preview the generated resources:

```bash
timoni build redis-cache oci://ghcr.io/stefanprodan/modules/flux-helm-release \
  --values helm-release-values.yaml \
  --namespace flux-system
```

Apply to the cluster:

```bash
timoni apply redis-cache oci://ghcr.io/stefanprodan/modules/flux-helm-release \
  --values helm-release-values.yaml \
  --namespace flux-system
```

## Step 3: Deploy from an OCI Helm Registry

For charts hosted in OCI registries:

```yaml
# helm-oci-values.yaml
values:
  repository:
    url: "oci://ghcr.io/your-org/charts"
    type: "oci"
    interval: "1h"
  chart:
    name: "my-app"
    version: "2.1.0"
  release:
    interval: "10m"
    targetNamespace: "production"
    values:
      replicaCount: 3
      image:
        repository: ghcr.io/your-org/my-app
        tag: "v2.1.0"
      resources:
        requests:
          cpu: 100m
          memory: 256Mi
        limits:
          memory: 512Mi
```

```bash
timoni apply my-app oci://ghcr.io/stefanprodan/modules/flux-helm-release \
  --values helm-oci-values.yaml \
  --namespace flux-system
```

## Step 4: Configure Upgrade and Rollback

Set up upgrade strategies and automatic rollback:

```yaml
# helm-upgrade-values.yaml
values:
  repository:
    url: "https://charts.bitnami.com/bitnami"
  chart:
    name: "postgresql"
    version: "15.x"
  release:
    interval: "10m"
    targetNamespace: "database"
    createNamespace: true
    install:
      remediation:
        retries: 3
    upgrade:
      remediation:
        retries: 3
        remediateLastFailure: true
      cleanupOnFail: true
      crds: CreateReplace
    rollback:
      timeout: "5m"
      cleanupOnFail: true
    values:
      auth:
        postgresPassword: "${POSTGRES_PASSWORD}"
        database: mydb
      primary:
        persistence:
          size: 100Gi
```

## Step 5: Use Values from Secrets and ConfigMaps

Reference external values sources:

```yaml
# helm-external-values.yaml
values:
  repository:
    url: "https://charts.bitnami.com/bitnami"
  chart:
    name: "redis"
    version: "18.x"
  release:
    interval: "10m"
    targetNamespace: "cache"
    valuesFrom:
      - kind: ConfigMap
        name: redis-base-config
        valuesKey: values.yaml
      - kind: Secret
        name: redis-credentials
        valuesKey: auth-values.yaml
        targetPath: auth
    values:
      architecture: replication
      replica:
        replicaCount: 3
```

Create the ConfigMap and Secret first:

```yaml
# redis-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-base-config
  namespace: flux-system
data:
  values.yaml: |
    metrics:
      enabled: true
      serviceMonitor:
        enabled: true
    commonLabels:
      team: platform
---
apiVersion: v1
kind: Secret
metadata:
  name: redis-credentials
  namespace: flux-system
stringData:
  auth-values.yaml: |
    enabled: true
    password: supersecret
```

## Step 6: Deploy Multiple Helm Releases

Manage multiple chart deployments as separate Timoni instances:

```bash
# Deploy ingress controller
timoni apply ingress oci://ghcr.io/stefanprodan/modules/flux-helm-release \
  --values ingress-values.yaml \
  --namespace flux-system

# Deploy cert-manager
timoni apply cert-manager oci://ghcr.io/stefanprodan/modules/flux-helm-release \
  --values certmanager-values.yaml \
  --namespace flux-system

# Deploy application
timoni apply my-app oci://ghcr.io/stefanprodan/modules/flux-helm-release \
  --values app-values.yaml \
  --namespace flux-system
```

## Step 7: Add Dependencies Between Releases

Configure dependency ordering:

```yaml
# app-with-deps.yaml
values:
  repository:
    url: "oci://ghcr.io/your-org/charts"
    type: "oci"
  chart:
    name: "my-app"
    version: "2.1.0"
  release:
    interval: "10m"
    targetNamespace: "production"
    dependsOn:
      - name: "redis-cache"
      - name: "postgresql"
    values:
      database:
        host: postgresql.database.svc
      cache:
        host: redis-master.cache.svc
```

## Step 8: Monitor Helm Release Status

Check the status of your Helm deployments:

```bash
timoni status redis-cache -n flux-system
timoni inspect resources redis-cache -n flux-system

flux get helmreleases -n flux-system
```

View Helm release history through Flux:

```bash
kubectl describe helmrelease redis-cache -n flux-system
```

## Conclusion

The Timoni flux-helm-release module provides a consistent, validated way to manage Helm deployments through Flux. By encapsulating the HelmRepository, HelmChart, and HelmRelease resources in a single module with CUE validation, you get type-safe Helm deployment configurations that catch errors before they reach your cluster. The module supports all standard Helm deployment patterns including version pinning, upgrade strategies, rollback configuration, and external values sources, making it a reliable foundation for managing Helm-based infrastructure with GitOps.
