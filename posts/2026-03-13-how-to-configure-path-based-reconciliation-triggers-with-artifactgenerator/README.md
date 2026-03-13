# How to Configure Path-Based Reconciliation Triggers with ArtifactGenerator

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux, fluxcd, artifactgenerator, reconciliation, path-filtering, gitops, kubernetes

Description: Learn how to configure path-based triggers in Flux ArtifactGenerator to control when reconciliation happens based on file changes.

---

## Introduction

One of the biggest operational challenges in GitOps is controlling when reconciliation should trigger. In large repositories, a single commit can touch files across multiple services, but you typically want each service to reconcile only when its own files change. The Flux ArtifactGenerator resource provides path-based reconciliation triggers that give you precise control over which file changes cause a new artifact to be generated, and consequently, which downstream resources reconcile. This guide covers the configuration patterns for path-based triggers.

## Prerequisites

- A Kubernetes cluster (v1.28 or later)
- Flux 2.8 installed on your cluster
- A Git repository with multiple application directories
- kubectl configured to access your cluster

## How Path-Based Triggers Work

The ArtifactGenerator watches a source (such as a GitRepository) and generates a new artifact only when files matching the configured path patterns change. The path patterns use glob syntax, similar to `.gitignore` files.

When a new commit arrives in the GitRepository source:

1. Flux detects the new revision
2. ArtifactGenerator compares the changed files against its path include/exclude patterns
3. If any changed files match the include patterns (and are not excluded), a new artifact is generated
4. Downstream resources (Kustomizations or HelmReleases) that reference the ArtifactGenerator reconcile

If no changed files match the patterns, the ArtifactGenerator does not produce a new artifact, and downstream resources are not triggered.

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
    - kind: GitRepository
      name: platform-repo
  artifacts:
    - path: "services/api/**"
```

This triggers artifact generation only when files under `services/api/` change.

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
    - kind: GitRepository
      name: platform-repo
  artifacts:
    - path: "services/api/**"
    - path: "shared/config/**"
    - path: "shared/templates/**"
```

This configuration triggers when changes occur in the API service directory OR in shared configuration and template directories. This is useful when your service depends on shared resources.

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
    - kind: GitRepository
      name: platform-repo
  artifacts:
    - path: "services/api/**"
      exclude:
        - "services/api/docs/**"
        - "services/api/tests/**"
        - "services/api/**/*.md"
        - "services/api/.gitignore"
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
    - kind: GitRepository
      name: platform-repo
  artifacts:
    - path: "deploy/**/*.yaml"
    - path: "deploy/**/*.yml"
      exclude:
        - "deploy/**/test-*.yaml"
        - "deploy/**/example-*.yaml"
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
    - kind: GitRepository
      name: platform-repo
  artifacts:
    - path: "environments/staging/**"
    - path: "environments/base/**"
---
apiVersion: source.extensions.fluxcd.io/v1beta1
kind: ArtifactGenerator
metadata:
  name: production-manifests
  namespace: flux-system
spec:
  sources:
    - kind: GitRepository
      name: platform-repo
  artifacts:
    - path: "environments/production/**"
    - path: "environments/base/**"
```

Changes to `environments/base/` trigger both staging and production ArtifactGenerators, while changes to environment-specific directories only trigger the corresponding generator.

## Connecting ArtifactGenerator to Kustomizations

Once you have path-based triggers configured, connect them to Kustomizations:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: api-service-staging
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: ArtifactGenerator
    name: staging-manifests
  path: ./environments/staging/api-service
  prune: true
  targetNamespace: staging
```

The Kustomization only reconciles when the `staging-manifests` ArtifactGenerator produces a new artifact, which only happens when files in `environments/staging/` or `environments/base/` change.

## Verifying Trigger Behavior

To verify that path-based triggers are working correctly, check the ArtifactGenerator status after making commits:

```bash
kubectl get artifactgenerators -n flux-system -w
```

Make a commit that changes a file outside the configured paths and observe that the ArtifactGenerator's last artifact revision does not change. Then make a commit that changes a file within the configured paths and verify that a new artifact is generated.

You can also check the events:

```bash
kubectl events --for artifactgenerator/api-service -n flux-system
```

## Glob Pattern Reference

Here is a quick reference for the glob patterns supported in ArtifactGenerator paths:

| Pattern | Matches |
|---------|---------|
| `*` | Any sequence of characters in a single path segment |
| `**` | Any sequence of characters across path segments |
| `?` | Any single character |
| `[abc]` | Any character in the set |
| `[!abc]` | Any character not in the set |

## Conclusion

Path-based reconciliation triggers with ArtifactGenerator give you fine-grained control over when Flux reconciles your resources. By carefully defining include and exclude patterns, you can prevent unnecessary reconciliation cycles, reduce the load on your cluster, and ensure that deployments are only triggered by relevant changes. This is essential for teams working with monorepos or shared repositories where not every commit should affect every deployment.
