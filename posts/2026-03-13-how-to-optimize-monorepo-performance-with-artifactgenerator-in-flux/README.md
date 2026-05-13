# How to Optimize Monorepo Performance with ArtifactGenerator in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Fluxcd, Artifactgenerator, Monorepo, Performance, GitOps, Kubernetes

Description: Learn how to use ArtifactGenerator to improve Flux reconciliation performance in monorepo setups by reducing unnecessary operations.

---

## Introduction

Monorepos are popular for keeping related services, infrastructure code, and configuration in a single repository. However, they create performance challenges for GitOps controllers like Flux. Every commit, regardless of what files changed, can trigger reconciliation across all resources that reference the repository. ArtifactGenerator in Flux 2.8 addresses this by allowing you to scope artifact generation to specific paths, dramatically reducing unnecessary reconciliation. This post covers strategies for optimizing monorepo performance with ArtifactGenerator.

## Prerequisites

- A Kubernetes cluster supported by Flux 2.8 (Kubernetes v1.33-v1.35)
- Flux 2.8 installed on your cluster
- A monorepo with multiple services or applications
- kubectl configured to access your cluster

## The Monorepo Performance Problem

Consider a monorepo with 20 microservices, shared libraries, infrastructure configs, and documentation. Without ArtifactGenerator, a typical setup uses a single GitRepository source:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: platform
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/my-org/platform
  ref:
    branch: main
```

Every Kustomization and HelmRelease references this single source. When a developer updates a README in the docs folder, all 20 services reconcile. In a cluster with many resources, this creates API server load, increases reconciliation queue times, and wastes controller CPU cycles.

## Strategy 1: Per-Service ArtifactGenerators

Create one ArtifactGenerator per service, each scoped to its own directory:

```yaml
apiVersion: source.extensions.fluxcd.io/v1beta1
kind: ArtifactGenerator
metadata:
  name: user-service
  namespace: flux-system
spec:
  sources:
    - alias: repo
      kind: GitRepository
      name: platform
  artifacts:
    - name: user-service
      originRevision: "@repo"
      copy:
        - from: "@repo/services/user-service/**"
          to: "@artifact/"
          exclude:
            - "**/docs/**"
            - "**/*.md"
            - "**/*_test.go"
---
apiVersion: source.extensions.fluxcd.io/v1beta1
kind: ArtifactGenerator
metadata:
  name: order-service
  namespace: flux-system
spec:
  sources:
    - alias: repo
      kind: GitRepository
      name: platform
  artifacts:
    - name: order-service
      originRevision: "@repo"
      copy:
        - from: "@repo/services/order-service/**"
          to: "@artifact/"
          exclude:
            - "**/docs/**"
            - "**/*.md"
            - "**/*_test.go"
```

Repeat this pattern for each service. Each ArtifactGenerator creates an ExternalArtifact whose revision only changes when the copied content for that service changes.

## Strategy 2: Shared Dependencies with ArtifactGenerator

Many monorepos have shared directories that multiple services depend on. Handle this by including shared paths in each relevant ArtifactGenerator:

```yaml
apiVersion: source.extensions.fluxcd.io/v1beta1
kind: ArtifactGenerator
metadata:
  name: user-service
  namespace: flux-system
spec:
  sources:
    - alias: repo
      kind: GitRepository
      name: platform
  artifacts:
    - name: user-service
      originRevision: "@repo"
      copy:
        - from: "@repo/services/user-service/**"
          to: "@artifact/"
        - from: "@repo/shared/k8s-base/**"
          to: "@artifact/shared/k8s-base/"
        - from: "@repo/shared/monitoring/**"
          to: "@artifact/shared/monitoring/"
```

When files in `shared/k8s-base/` change, all ArtifactGenerators that include that path generate new artifacts, causing their downstream resources to reconcile. Services that do not depend on these shared paths remain unaffected.

## Strategy 3: Infrastructure and Application Separation

Separate infrastructure components from application deployments:

```yaml
apiVersion: source.extensions.fluxcd.io/v1beta1
kind: ArtifactGenerator
metadata:
  name: infra-controllers
  namespace: flux-system
spec:
  sources:
    - alias: repo
      kind: GitRepository
      name: platform
  artifacts:
    - name: infra-controllers
      originRevision: "@repo"
      copy:
        - from: "@repo/infrastructure/controllers/**"
          to: "@artifact/"
---
apiVersion: source.extensions.fluxcd.io/v1beta1
kind: ArtifactGenerator
metadata:
  name: infra-networking
  namespace: flux-system
spec:
  sources:
    - alias: repo
      kind: GitRepository
      name: platform
  artifacts:
    - name: infra-networking
      originRevision: "@repo"
      copy:
        - from: "@repo/infrastructure/networking/**"
          to: "@artifact/"
---
apiVersion: source.extensions.fluxcd.io/v1beta1
kind: ArtifactGenerator
metadata:
  name: apps-production
  namespace: flux-system
spec:
  sources:
    - alias: repo
      kind: GitRepository
      name: platform
  artifacts:
    - name: apps-production
      originRevision: "@repo"
      copy:
        - from: "@repo/apps/production/**"
          to: "@artifact/"
```

Infrastructure components typically change less frequently than applications. By separating them, you avoid reconciling infrastructure when only application code changes, and vice versa.

## Measuring Performance Improvement

To quantify the improvement, compare reconciliation metrics before and after implementing ArtifactGenerator.

Check the number of retained reconciliation events:

```bash
kubectl get events --field-selector reason=ReconciliationSucceeded \
  -n flux-system --sort-by=.lastTimestamp | wc -l
```

Monitor the kustomize-controller and helm-controller CPU usage:

```bash
kubectl top pods -n flux-system
```

In a typical monorepo with 20 services receiving 50 commits per day, switching from a single GitRepository to per-service ArtifactGenerators can reduce reconciliation events by 80-90%, since most commits only touch one or two services.

## ArtifactGenerator is Event-Driven

ArtifactGenerator does not use a `spec.interval` field - it is event-driven and triggers only when a referenced source produces a new revision. There is no need to tune per-service intervals; the source (e.g., GitRepository) controls the polling interval, and the ArtifactGenerator reacts to source changes automatically:

```yaml
# Event-driven service (no interval needed - ArtifactGenerator is event-driven)

apiVersion: source.extensions.fluxcd.io/v1beta1
kind: ArtifactGenerator
metadata:
  name: api-gateway
  namespace: flux-system
spec:
  sources:
    - alias: repo
      kind: GitRepository
      name: platform
  artifacts:
    - name: api-gateway
      originRevision: "@repo"
      copy:
        - from: "@repo/services/api-gateway/**"
          to: "@artifact/"
---
# Infrastructure - same event-driven approach
apiVersion: source.extensions.fluxcd.io/v1beta1
kind: ArtifactGenerator
metadata:
  name: cert-manager-config
  namespace: flux-system
spec:
  sources:
    - alias: repo
      kind: GitRepository
      name: platform
  artifacts:
    - name: cert-manager-config
      originRevision: "@repo"
      copy:
        - from: "@repo/infrastructure/cert-manager/**"
          to: "@artifact/"
```

## Reducing Artifact Storage Overhead

Each ArtifactGenerator creates artifacts that consume storage. To minimize overhead, exclude large files that are not needed for reconciliation:

```yaml
spec:
  sources:
    - alias: repo
      kind: GitRepository
      name: platform
  artifacts:
    - name: data-pipeline
      originRevision: "@repo"
      copy:
        - from: "@repo/services/data-pipeline/**"
          to: "@artifact/"
          exclude:
            - "**/*.csv"
            - "**/*.parquet"
            - "**/fixtures/**"
            - "**/*.png"
            - "**/*.jpg"
```

## Conclusion

ArtifactGenerator transforms monorepo performance in Flux by replacing the coarse-grained "reconcile everything on every commit" pattern with fine-grained, content-based artifacts. By creating per-service ArtifactGenerators and properly handling shared dependencies, you can achieve significant reductions in unnecessary reconciliation while maintaining the convenience of a single repository. The result is faster deployments, lower cluster resource consumption, and a more responsive GitOps pipeline.
