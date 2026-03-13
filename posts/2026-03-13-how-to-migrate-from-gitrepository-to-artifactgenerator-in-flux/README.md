# How to Migrate from GitRepository to ArtifactGenerator in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, fluxcd, artifactgenerator, GitRepository, Migration, GitOps, Kubernetes

Description: A step-by-step guide for migrating existing Flux GitRepository-based workflows to ArtifactGenerator for improved path-based filtering.

---

## Introduction

If you have been using Flux with GitRepository sources, you may be experiencing unnecessary reconciliation in monorepo setups or wanting finer control over which file changes trigger deployments. The ArtifactGenerator resource in Flux 2.8 provides path-based artifact generation that solves these problems. This guide walks through migrating existing GitRepository-based Kustomizations and HelmReleases to use ArtifactGenerator, step by step.

## Prerequisites

- A Kubernetes cluster running Flux 2.x (upgrade to 2.8 before migrating)
- Existing GitRepository sources with Kustomizations or HelmReleases
- kubectl configured to access your cluster
- Familiarity with your current Flux resource layout

## Understanding the Current Setup

A typical GitRepository-based setup looks like this:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: app-repo
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/my-org/app-repo
  ref:
    branch: main
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: frontend
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: app-repo
  path: ./apps/frontend
  prune: true
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: backend
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: app-repo
  path: ./apps/backend
  prune: true
```

In this setup, both Kustomizations reconcile on every commit to the repository, even if the commit only changed files in one service directory.

## Migration Step 1: Keep the GitRepository

The GitRepository remains as the primary source. ArtifactGenerator sits between the GitRepository and your Kustomizations or HelmReleases. Do not delete the GitRepository.

```yaml
# This stays unchanged
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: app-repo
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/my-org/app-repo
  ref:
    branch: main
```

## Migration Step 2: Create ArtifactGenerators

Create one ArtifactGenerator for each Kustomization or HelmRelease that you want to scope:

```yaml
apiVersion: source.extensions.fluxcd.io/v1beta1
kind: ArtifactGenerator
metadata:
  name: frontend-artifacts
  namespace: flux-system
spec:
  sources:
    - kind: GitRepository
      name: app-repo
  artifacts:
    - path: "apps/frontend/**"
---
apiVersion: source.extensions.fluxcd.io/v1beta1
kind: ArtifactGenerator
metadata:
  name: backend-artifacts
  namespace: flux-system
spec:
  sources:
    - kind: GitRepository
      name: app-repo
  artifacts:
    - path: "apps/backend/**"
```

Apply these resources and verify they are ready:

```bash
kubectl apply -f artifactgenerators.yaml
kubectl get artifactgenerators -n flux-system
```

Wait for both ArtifactGenerators to show `Ready: True` status before proceeding.

## Migration Step 3: Update Kustomization Source References

Now update each Kustomization to reference its corresponding ArtifactGenerator instead of the GitRepository directly:

**Before:**

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: frontend
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: app-repo
  path: ./apps/frontend
  prune: true
```

**After:**

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: frontend
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: ArtifactGenerator
    name: frontend-artifacts
  path: ./apps/frontend
  prune: true
```

The key change is updating `sourceRef.kind` from `GitRepository` to `ArtifactGenerator` and `sourceRef.name` to the corresponding ArtifactGenerator name.

## Migration Step 4: Migrate HelmReleases

For HelmReleases that use charts from a GitRepository, the migration is similar:

**Before:**

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: api
  namespace: default
spec:
  interval: 5m
  chart:
    spec:
      chart: ./charts/api
      sourceRef:
        kind: GitRepository
        name: app-repo
        namespace: flux-system
```

**After:**

First, create an ArtifactGenerator for the chart:

```yaml
apiVersion: source.extensions.fluxcd.io/v1beta1
kind: ArtifactGenerator
metadata:
  name: api-chart
  namespace: flux-system
spec:
  sources:
    - kind: GitRepository
      name: app-repo
  artifacts:
    - path: "charts/api/**"
```

Then update the HelmRelease:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: api
  namespace: default
spec:
  interval: 5m
  chartRef:
    kind: ArtifactGenerator
    name: api-chart
    namespace: flux-system
```

## Migration Step 5: Handle Shared Dependencies

If your services share common resources, include those paths in each relevant ArtifactGenerator:

```yaml
apiVersion: source.extensions.fluxcd.io/v1beta1
kind: ArtifactGenerator
metadata:
  name: frontend-artifacts
  namespace: flux-system
spec:
  sources:
    - kind: GitRepository
      name: app-repo
  artifacts:
    - path: "apps/frontend/**"
    - path: "common/base/**"
    - path: "common/overlays/production/**"
```

## Migration Step 6: Verify the Migration

After updating all resources, verify the complete chain:

```bash
# Check GitRepository
kubectl get gitrepositories -n flux-system

# Check ArtifactGenerators
kubectl get artifactgenerators -n flux-system

# Check Kustomizations
flux get kustomizations

# Check HelmReleases
flux get helmreleases --all-namespaces
```

All resources should show `Ready: True`. If any show errors, check the events:

```bash
kubectl events --for kustomization/frontend -n flux-system
```

## Rollback Plan

If the migration causes issues, you can quickly revert by changing the sourceRef back to GitRepository:

```yaml
spec:
  sourceRef:
    kind: GitRepository
    name: app-repo
```

Since the GitRepository was not deleted, rolling back is a simple spec change.

## Conclusion

Migrating from GitRepository to ArtifactGenerator is a non-destructive process that can be done incrementally. You keep the existing GitRepository and add ArtifactGenerators as an intermediate layer that provides path-based filtering. The migration gives you precise control over reconciliation triggers while maintaining the same Git-based workflow your team is already familiar with. Start with one or two services to validate the approach before migrating the rest of your resources.
