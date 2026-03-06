# How to Manage CustomResourceDefinitions with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, Custom Resource Definitions, CRD, GitOps, Infrastructure

Description: A practical guide to managing Kubernetes CustomResourceDefinitions (CRDs) with Flux CD, including versioning strategies and dependency ordering.

---

## Introduction

CustomResourceDefinitions (CRDs) extend the Kubernetes API by allowing you to define your own resource types. When managing CRDs with Flux CD, you need careful ordering and dependency management to ensure CRDs are installed before any custom resources that depend on them.

This guide walks through practical patterns for managing CRDs with Flux CD in a GitOps workflow.

## Prerequisites

Before you begin, ensure you have:

- A Kubernetes cluster (v1.26+)
- Flux CD installed and bootstrapped
- A Git repository connected to Flux

## Repository Structure

Organize your repository to separate CRDs from the resources that depend on them:

```text
clusters/
  my-cluster/
    crds/
      kustomization.yaml
    apps/
      kustomization.yaml
infrastructure/
  crds/
    cert-manager-crds.yaml
    prometheus-crds.yaml
  controllers/
    cert-manager.yaml
    prometheus-operator.yaml
```

## Setting Up the CRD Kustomization

Create a dedicated Flux Kustomization for CRDs that runs before other resources:

```yaml
# clusters/my-cluster/crds/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: crds
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/crds
  prune: false  # Never prune CRDs automatically
  wait: true    # Wait for CRDs to be fully established
  timeout: 5m
```

## Creating a Custom CRD

Define your own CRD and manage it through Flux:

```yaml
# infrastructure/crds/myapp-crd.yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: myapps.example.com
  labels:
    app.kubernetes.io/managed-by: flux
spec:
  group: example.com
  names:
    kind: MyApp
    listKind: MyAppList
    plural: myapps
    singular: myapp
    shortNames:
      - ma
  scope: Namespaced
  versions:
    - name: v1alpha1
      served: true
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              required:
                - replicas
                - image
              properties:
                replicas:
                  type: integer
                  minimum: 1
                  maximum: 100
                  description: "Number of desired replicas"
                image:
                  type: string
                  description: "Container image to deploy"
                config:
                  type: object
                  properties:
                    env:
                      type: string
                      enum: ["development", "staging", "production"]
                    debug:
                      type: boolean
                      default: false
      additionalPrinterColumns:
        - name: Replicas
          type: integer
          jsonPath: .spec.replicas
        - name: Image
          type: string
          jsonPath: .spec.image
        - name: Age
          type: date
          jsonPath: .metadata.creationTimestamp
```

## Dependency Ordering Between Kustomizations

Ensure CRDs are applied before any custom resources by using the `dependsOn` field:

```yaml
# clusters/my-cluster/apps/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps
  prune: true
  # This Kustomization waits for CRDs to be ready
  dependsOn:
    - name: crds
  timeout: 5m
```

## Managing CRDs from Helm Charts

Some Helm charts bundle CRDs. Use a dedicated HelmRelease for CRD installation:

```yaml
# infrastructure/crds/cert-manager-crds.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: jetstack
  namespace: flux-system
spec:
  interval: 1h
  url: https://charts.jetstack.io
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cert-manager-crds
  namespace: flux-system
spec:
  interval: 1h
  chart:
    spec:
      chart: cert-manager
      version: "1.14.x"
      sourceRef:
        kind: HelmRepository
        name: jetstack
  # Only install CRDs, skip the controller
  install:
    crds: Create
  upgrade:
    crds: CreateReplace
  values:
    installCRDs: true
    # Disable everything except CRDs
    webhook:
      enabled: false
    cainjector:
      enabled: false
    startupapicheck:
      enabled: false
```

## Versioning CRDs Safely

When upgrading CRDs, add new versions while keeping old ones served:

```yaml
# infrastructure/crds/myapp-crd-v1.yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: myapps.example.com
spec:
  group: example.com
  names:
    kind: MyApp
    plural: myapps
    singular: myapp
  scope: Namespaced
  # Conversion webhook for migrating between versions
  conversion:
    strategy: Webhook
    webhook:
      conversionReviewVersions: ["v1"]
      clientConfig:
        service:
          name: myapp-conversion
          namespace: myapp-system
          path: /convert
  versions:
    # New version becomes the storage version
    - name: v1
      served: true
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              required:
                - replicas
                - image
              properties:
                replicas:
                  type: integer
                image:
                  type: string
                resources:
                  type: object
                  properties:
                    cpu:
                      type: string
                    memory:
                      type: string
    # Old version still served but no longer stored
    - name: v1alpha1
      served: true
      storage: false
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              required:
                - replicas
                - image
              properties:
                replicas:
                  type: integer
                image:
                  type: string
```

## Health Checks for CRDs

Add health checks to ensure CRDs are fully established before proceeding:

```yaml
# clusters/my-cluster/crds/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: crds
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/crds
  prune: false
  wait: true
  timeout: 5m
  # Health checks verify CRDs are established
  healthChecks:
    - apiVersion: apiextensions.k8s.io/v1
      kind: CustomResourceDefinition
      name: myapps.example.com
    - apiVersion: apiextensions.k8s.io/v1
      kind: CustomResourceDefinition
      name: certificates.cert-manager.io
```

## Protecting CRDs from Accidental Deletion

Never enable pruning for CRDs. Additionally, add annotations to prevent accidental removal:

```yaml
# infrastructure/crds/myapp-crd.yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: myapps.example.com
  annotations:
    # Prevent Flux from deleting this CRD
    kustomize.toolkit.fluxcd.io/prune: disabled
  labels:
    app.kubernetes.io/managed-by: flux
spec:
  group: example.com
  names:
    kind: MyApp
    plural: myapps
  scope: Namespaced
  versions:
    - name: v1
      served: true
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                replicas:
                  type: integer
                image:
                  type: string
```

## Using Custom Resources After CRD Installation

Once CRDs are managed, deploy custom resources in a dependent Kustomization:

```yaml
# apps/myapp/instance.yaml
apiVersion: example.com/v1
kind: MyApp
metadata:
  name: production-app
  namespace: default
spec:
  replicas: 3
  image: myregistry.io/myapp:v2.1.0
  resources:
    cpu: "500m"
    memory: "256Mi"
```

## Monitoring CRD Reconciliation

Check the status of your CRD Kustomization to verify everything is in sync:

```yaml
# Alert for CRD reconciliation failures
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: crd-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: crds
      namespace: flux-system
  summary: "CRD reconciliation alert"
```

## Common Pitfalls and Solutions

### Pitfall 1: CRD Not Ready Before Custom Resources

If custom resources fail because the CRD is not yet established, ensure you use `dependsOn` and `wait: true` in your Kustomization.

### Pitfall 2: Pruning Deletes CRDs

Never set `prune: true` on CRD Kustomizations. Deleting a CRD removes all instances of that custom resource across the entire cluster.

### Pitfall 3: Helm CRD Upgrades

Helm does not upgrade CRDs by default. Use `upgrade.crds: CreateReplace` in your HelmRelease to handle CRD updates during Helm chart upgrades.

## Summary

Managing CRDs with Flux CD requires careful attention to ordering and safety. Key takeaways:

- Separate CRDs into their own Kustomization with `prune: false`
- Use `dependsOn` to ensure CRDs install before custom resources
- Add health checks to verify CRDs are established
- Use annotations to protect CRDs from accidental deletion
- Handle CRD versioning with conversion webhooks for safe migrations
