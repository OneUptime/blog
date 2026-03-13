# How to Use Cluster and Application Separation in Flux Repository

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Repository Structure, Best Practices, Multi-Cluster

Description: Learn how to separate cluster configuration from application definitions in your Flux repository for cleaner GitOps workflows.

---

Separating cluster configuration from application definitions is a key organizational pattern in Flux repositories. Cluster configuration defines what gets deployed where, while application definitions describe the workloads themselves. This separation lets you reuse application definitions across clusters and manage deployment targets independently.

This guide explains how to implement this pattern effectively.

## The Core Concept

In this pattern, there are two distinct concerns:

- Cluster configuration: Which applications run on which clusters, with what settings, and in what order
- Application definitions: The actual Kubernetes manifests that describe a workload

By keeping these separate, you can deploy the same application to multiple clusters with different configurations without duplicating the application manifests.

## Recommended Directory Structure

```text
fleet-repo/
  clusters/
    staging/
      flux-system/
      kustomizations.yaml
    production/
      flux-system/
      kustomizations.yaml
  apps/
    app-one/
      base/
        deployment.yaml
        service.yaml
        configmap.yaml
        kustomization.yaml
      overlays/
        staging/
          kustomization.yaml
        production/
          kustomization.yaml
          patches/
    app-two/
      base/
        deployment.yaml
        service.yaml
        kustomization.yaml
      overlays/
        staging/
          kustomization.yaml
        production/
          kustomization.yaml
  infrastructure/
    base/
    overlays/
```

## Cluster Configuration

The cluster directory contains only Flux Kustomization resources that point to application overlays:

```yaml
# clusters/production/kustomizations.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 30m
  path: ./infrastructure/overlays/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-one
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/app-one/overlays/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: infrastructure
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-two
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/app-two/overlays/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: infrastructure
```

Each application gets its own Flux Kustomization resource, giving you independent control over reconciliation, dependencies, and health checks.

## Application Definitions

Applications live in their own directories with base and overlay structure:

```yaml
# apps/app-one/base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-one
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: app-one
  template:
    metadata:
      labels:
        app: app-one
    spec:
      containers:
        - name: app-one
          image: app-one:latest
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
```

```yaml
# apps/app-one/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
  - configmap.yaml
```

Production overlay:

```yaml
# apps/app-one/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patches:
  - path: patches/replicas.yaml
  - path: patches/resources.yaml
images:
  - name: app-one
    newTag: "2.1.0"
```

## Benefits of Per-Application Kustomizations

Having a separate Flux Kustomization per application provides several advantages:

Independent reconciliation: Each application reconciles on its own schedule. A failure in one application does not block others.

Granular dependencies: Applications can depend on specific infrastructure components rather than all infrastructure:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-one
  namespace: flux-system
spec:
  path: ./apps/app-one/overlays/production
  dependsOn:
    - name: infrastructure
    - name: app-two  # app-one needs app-two running first
```

Independent health checks:

```yaml
spec:
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: app-one
      namespace: default
  timeout: 3m
```

Selective suspension:

```bash
flux suspend kustomization app-one -n flux-system
# app-two continues to reconcile normally
```

## Adding a New Application

To add a new application to a cluster:

1. Create the application manifests under `apps/`:

```bash
mkdir -p apps/app-three/base apps/app-three/overlays/production
```

2. Write the base manifests

3. Create the overlay for each cluster

4. Add a Flux Kustomization in the cluster directory:

```yaml
# Add to clusters/production/kustomizations.yaml
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-three
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/app-three/overlays/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: infrastructure
```

5. Commit and push

## Removing an Application from a Cluster

To remove an application from a specific cluster without deleting the application definition:

1. Remove the Flux Kustomization from the cluster directory
2. Commit and push
3. Flux will prune all resources managed by that Kustomization

The application definitions remain available for other clusters or future use.

## Deploying Same Application to Multiple Clusters

Since application definitions are independent of cluster configuration, deploying the same application to another cluster requires only adding a new overlay and a Kustomization in the target cluster directory:

```yaml
# clusters/staging/kustomizations.yaml
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-one
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/app-one/overlays/staging
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Conclusion

Separating cluster configuration from application definitions in your Flux repository creates a clean, scalable architecture. Cluster directories act as deployment manifests that declare which applications run where, while application directories contain the reusable workload definitions. This separation makes it straightforward to add, remove, or reconfigure applications across clusters without duplicating manifests or creating tight coupling between concerns.
