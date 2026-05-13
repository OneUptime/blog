# How to Configure Path-Based Reconciliation Triggers with ArtifactGenerator

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Fluxcd, Artifactgenerator, Reconciliation, Path-Filtering, GitOps, Kubernetes

Description: Learn how to configure path-based triggers in Flux ArtifactGenerator to control when reconciliation happens based on file changes.

---

## Introduction

One of the biggest operational challenges in GitOps is controlling when reconciliation should trigger. In large repositories, a single commit can touch files across multiple services, but you typically want each service to reconcile only when its own files change. The Flux ArtifactGenerator resource provides path-based reconciliation triggers that give you precise control over which file changes cause a new artifact to be generated, and consequently, which downstream resources reconcile. This guide covers the configuration patterns for path-based triggers.

## Prerequisites

- A Kubernetes cluster supported by Flux 2.8 (Kubernetes v1.33-v1.35)
- Flux 2.8 installed on your cluster with the `source-watcher` component enabled
- A Git repository with multiple application directories
- kubectl configured to access your cluster

## How Path-Based Triggers Work

The ArtifactGenerator watches a source (such as a GitRepository) and generates ExternalArtifacts from files selected by copy operations. The `from` and `exclude` fields use glob patterns to control which files are copied into the generated artifact.

When a new commit arrives in the GitRepository source:

1. Flux detects the new revision
2. ArtifactGenerator rebuilds the affected ExternalArtifacts from the configured copy operations
3. If the copied content for an artifact changes, that ExternalArtifact gets a new revision
4. Downstream resources (Kustomizations or HelmReleases) that reference the generated ExternalArtifact reconcile

If the copied content for an ExternalArtifact does not change, its revision does not change, and downstream resources are not triggered by that source update.

## Basic Path Include Configuration

The simplest configuration includes a single directory path:

```yaml
apiVersion: source.extensions.fluxcd.io/v1beta1
kind: ArtifactGenerator
metadata:
  name: api-service
  namespace: flux-system
spec:
  sources:
    - alias: repo
      kind: GitRepository
      name: platform-repo
  artifacts:
    - name: api-service
      originRevision: "@repo"
      copy:
        - from: "@repo/services/api/**"
          to: "@artifact/"
```

This creates an ExternalArtifact named `api-service` whose revision changes only when the copied content from `services/api/` changes.

## Multiple Include Paths

You can include multiple directories to create a single artifact from several sources:

```yaml
apiVersion: source.extensions.fluxcd.io/v1beta1
kind: ArtifactGenerator
metadata:
  name: api-service
  namespace: flux-system
spec:
  sources:
    - alias: repo
      kind: GitRepository
      name: platform-repo
  artifacts:
    - name: api-service
      originRevision: "@repo"
      copy:
        - from: "@repo/services/api/**"
          to: "@artifact/"
        - from: "@repo/shared/config/**"
          to: "@artifact/shared/config/"
        - from: "@repo/shared/templates/**"
          to: "@artifact/shared/templates/"
```

This configuration changes the generated ExternalArtifact revision when copied content changes in the API service directory OR in shared configuration and template directories. This is useful when your service depends on shared resources.

## Combining Include and Exclude Patterns

Exclude patterns refine the include set by removing files that should not trigger reconciliation:

```yaml
apiVersion: source.extensions.fluxcd.io/v1beta1
kind: ArtifactGenerator
metadata:
  name: api-service
  namespace: flux-system
spec:
  sources:
    - alias: repo
      kind: GitRepository
      name: platform-repo
  artifacts:
    - name: api-service
      originRevision: "@repo"
      copy:
        - from: "@repo/services/api/**"
          to: "@artifact/"
          exclude:
            - "**/docs/**"
            - "**/tests/**"
            - "**/*.md"
            - ".gitignore"
```

This includes all files under `services/api/` except documentation, tests, markdown files, and the .gitignore file. Changes to excluded files do not trigger reconciliation.

## File Extension Filtering

You can use glob patterns to filter by file extension:

```yaml
apiVersion: source.extensions.fluxcd.io/v1beta1
kind: ArtifactGenerator
metadata:
  name: k8s-manifests
  namespace: flux-system
spec:
  sources:
    - alias: repo
      kind: GitRepository
      name: platform-repo
  artifacts:
    - name: k8s-manifests
      originRevision: "@repo"
      copy:
        - from: "@repo/deploy/**/*.yaml"
          to: "@artifact/"
          exclude:
            - "**/test-*.yaml"
            - "**/example-*.yaml"
        - from: "@repo/deploy/**/*.yml"
          to: "@artifact/"
          exclude:
            - "**/test-*.yml"
            - "**/example-*.yml"
```

This configuration only triggers on YAML file changes within the deploy directory, ignoring test and example files.

## Environment-Specific Triggers

A common pattern is having environment-specific directories. You can create separate ArtifactGenerators for each environment:

```yaml
apiVersion: source.extensions.fluxcd.io/v1beta1
kind: ArtifactGenerator
metadata:
  name: staging-manifests
  namespace: flux-system
spec:
  sources:
    - alias: repo
      kind: GitRepository
      name: platform-repo
  artifacts:
    - name: staging-manifests
      originRevision: "@repo"
      copy:
        - from: "@repo/environments/staging/**"
          to: "@artifact/"
        - from: "@repo/environments/base/**"
          to: "@artifact/base/"
---
apiVersion: source.extensions.fluxcd.io/v1beta1
kind: ArtifactGenerator
metadata:
  name: production-manifests
  namespace: flux-system
spec:
  sources:
    - alias: repo
      kind: GitRepository
      name: platform-repo
  artifacts:
    - name: production-manifests
      originRevision: "@repo"
      copy:
        - from: "@repo/environments/production/**"
          to: "@artifact/"
        - from: "@repo/environments/base/**"
          to: "@artifact/base/"
```

Changes to `environments/base/` change both generated ExternalArtifacts, while changes to environment-specific directories only change the corresponding generated artifact.

## Connecting ArtifactGenerator to Kustomizations

Once you have path-based triggers configured, connect Kustomizations to the generated ExternalArtifacts:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: api-service-staging
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: ExternalArtifact
    name: staging-manifests
  path: ./api-service
  prune: true
  targetNamespace: staging
```

The Kustomization only reconciles from a source update when the generated `staging-manifests` ExternalArtifact gets a new revision, which only happens when copied content from `environments/staging/` or `environments/base/` changes.

## Verifying Trigger Behavior

To verify that path-based triggers are working correctly, check the ArtifactGenerator and ExternalArtifact status after making commits:

```bash
kubectl get artifactgenerators -n flux-system -w
kubectl get externalartifacts -n flux-system -w
```

Make a commit that changes a file outside the configured copy paths and observe that the generated ExternalArtifact's artifact revision does not change. Then make a commit that changes a copied file and verify that a new ExternalArtifact revision is generated.

You can also check the events:

```bash
kubectl events --for ArtifactGenerator/api-service -n flux-system
```

## Glob Pattern Reference

Here is a quick reference for common glob patterns used in ArtifactGenerator `from` and `exclude` fields:

| Pattern | Matches |
|---------|---------|
| `*` | Any sequence of characters in a single path segment |
| `**` | Any sequence of characters across path segments |
| `?` | Any single character |
| `[abc]` | Any character in the set |
| `[!abc]` | Any character not in the set |

## Conclusion

Path-based reconciliation triggers with ArtifactGenerator give you fine-grained control over when Flux reconciles your resources. By carefully defining copy and exclude patterns, you can prevent unnecessary reconciliation cycles, reduce the load on your cluster, and ensure that deployments are only triggered by relevant changes. This is essential for teams working with monorepos or shared repositories where not every commit should affect every deployment.
