# How to Use ArtifactGenerator for Monorepo Decomposition in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux, kubernetes, gitops, artifactgenerator, monorepo

Description: Learn how to use the Flux ArtifactGenerator to decompose a monorepo into independent artifacts for targeted deployments across environments.

---

## Introduction

Monorepos are a popular way to manage Kubernetes manifests for multiple applications and environments in a single repository. However, as the repository grows, reconciling the entire monorepo for every change becomes inefficient. The Flux ArtifactGenerator lets you decompose a monorepo into smaller, independent artifacts, so each application or environment only reconciles the subset of files it needs.

This guide demonstrates how to use the ArtifactGenerator to extract specific paths from a monorepo, create focused artifacts, and wire them into targeted Kustomizations.

## Prerequisites

- A Kubernetes cluster with Flux v2.4 or later
- The Flux Operator with ArtifactGenerator support installed
- A monorepo containing manifests for multiple applications or environments
- `kubectl` and `flux` CLI tools installed

## Understanding Monorepo Decomposition

A typical monorepo structure looks like this:

```
fleet-repo/
  apps/
    frontend/
      base/
      overlays/
        staging/
        production/
    backend/
      base/
      overlays/
        staging/
        production/
    database/
      base/
      overlays/
        staging/
        production/
  infrastructure/
    controllers/
    configs/
  clusters/
    staging/
    production/
```

Without decomposition, every Kustomization referencing this repo reacts to any change, even those in unrelated paths. The ArtifactGenerator extracts only the paths relevant to each deployment target.

## Step 1: Define the Monorepo Source

Create a single GitRepository pointing to your monorepo:

```yaml
# monorepo-source.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: fleet-repo
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/your-org/fleet-repo
  ref:
    branch: main
```

```bash
kubectl apply -f monorepo-source.yaml
```

## Step 2: Create Per-Application ArtifactGenerators

Define an ArtifactGenerator for each application that extracts only its relevant paths:

```yaml
# frontend-artifact.yaml
apiVersion: generators.fluxcd.io/v1
kind: ArtifactGenerator
metadata:
  name: frontend-production
  namespace: flux-system
spec:
  interval: 10m
  inputs:
    - name: frontend-base
      sourceRef:
        kind: GitRepository
        name: fleet-repo
      path: "./apps/frontend/base"
      targetPath: "./base"
    - name: frontend-overlay
      sourceRef:
        kind: GitRepository
        name: fleet-repo
      path: "./apps/frontend/overlays/production"
      targetPath: "./overlay"
  output:
    artifact:
      path: "./"
```

```yaml
# backend-artifact.yaml
apiVersion: generators.fluxcd.io/v1
kind: ArtifactGenerator
metadata:
  name: backend-production
  namespace: flux-system
spec:
  interval: 10m
  inputs:
    - name: backend-base
      sourceRef:
        kind: GitRepository
        name: fleet-repo
      path: "./apps/backend/base"
      targetPath: "./base"
    - name: backend-overlay
      sourceRef:
        kind: GitRepository
        name: fleet-repo
      path: "./apps/backend/overlays/production"
      targetPath: "./overlay"
  output:
    artifact:
      path: "./"
```

```yaml
# database-artifact.yaml
apiVersion: generators.fluxcd.io/v1
kind: ArtifactGenerator
metadata:
  name: database-production
  namespace: flux-system
spec:
  interval: 10m
  inputs:
    - name: database-base
      sourceRef:
        kind: GitRepository
        name: fleet-repo
      path: "./apps/database/base"
      targetPath: "./base"
    - name: database-overlay
      sourceRef:
        kind: GitRepository
        name: fleet-repo
      path: "./apps/database/overlays/production"
      targetPath: "./overlay"
  output:
    artifact:
      path: "./"
```

Apply all ArtifactGenerators:

```bash
kubectl apply -f frontend-artifact.yaml
kubectl apply -f backend-artifact.yaml
kubectl apply -f database-artifact.yaml
```

## Step 3: Create Targeted Kustomizations

Wire each ArtifactGenerator to its own Kustomization:

```yaml
# frontend-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: frontend
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: ArtifactGenerator
    name: frontend-production
  path: "./overlay"
  prune: true
  targetNamespace: production
  dependsOn:
    - name: database
```

```yaml
# backend-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: backend
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: ArtifactGenerator
    name: backend-production
  path: "./overlay"
  prune: true
  targetNamespace: production
  dependsOn:
    - name: database
```

```yaml
# database-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: database
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: ArtifactGenerator
    name: database-production
  path: "./overlay"
  prune: true
  targetNamespace: production
```

## Step 4: Infrastructure Decomposition

Apply the same pattern to infrastructure components:

```yaml
# infra-controllers-artifact.yaml
apiVersion: generators.fluxcd.io/v1
kind: ArtifactGenerator
metadata:
  name: infra-controllers
  namespace: flux-system
spec:
  interval: 15m
  inputs:
    - name: controllers
      sourceRef:
        kind: GitRepository
        name: fleet-repo
      path: "./infrastructure/controllers"
  output:
    artifact:
      path: "./"
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infra-controllers
  namespace: flux-system
spec:
  interval: 15m
  sourceRef:
    kind: ArtifactGenerator
    name: infra-controllers
  path: "./"
  prune: true
```

## Step 5: Verify Decomposition

Check that each ArtifactGenerator produces its own artifact:

```bash
kubectl get artifactgenerators -n flux-system
```

Verify that each Kustomization reconciles independently:

```bash
flux get kustomizations -A
```

Now, changes to `apps/frontend/` will only trigger the frontend Kustomization, leaving backend and database deployments untouched.

## Benefits of Decomposition

By decomposing a monorepo with ArtifactGenerators, you gain several advantages. Reconciliation is scoped to only the changed paths, reducing unnecessary deployments. Each application can have its own reconciliation interval. Dependency ordering between applications is explicit through the `dependsOn` field. Failed reconciliation for one application does not block others.

## Conclusion

The ArtifactGenerator provides an efficient way to decompose monorepos without restructuring your repository. By extracting specific paths into independent artifacts, you achieve targeted reconciliation, better dependency management, and isolated failure domains. This approach scales well as your monorepo grows and is especially useful when multiple teams contribute to the same repository but deploy independently.
