# How to Use GitRepository with Sparse Checkout in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Sparse Checkout, Monorepo, Performance

Description: Learn how to configure Flux CD GitRepository resources with sparse checkout to selectively sync only specific directories from large monorepos.

---

Large monorepos containing configurations for multiple environments, teams, or applications can slow down Flux reconciliation. Flux CD supports sparse checkout on GitRepository resources, allowing you to check out only specific directories. This guide explains how to use sparse checkout, path filtering, and related capabilities to optimize your GitOps workflow with large repositories.

## The Problem with Large Repos

When Flux clones a GitRepository, it fetches the entire repository contents by default. For a monorepo with hundreds of megabytes of manifests across many directories, this creates several issues:

- Slow clone and fetch times
- Unnecessary storage consumption on the source-controller
- Longer reconciliation cycles

## Understanding Flux Approach to Sparse Checkout

Flux provides several mechanisms to work with subsets of a repository:

1. **GitRepository sparse checkout** -- The GitRepository resource has a `spec.sparseCheckout` field that limits the directories checked out and included in the artifact.
2. **Kustomization path filtering** -- The Kustomization resource has a `spec.path` field that points to a specific directory within the GitRepository artifact.
3. **GitRepository `include` field** -- The GitRepository resource can include artifacts from other GitRepository resources, allowing composition from multiple sources.

The most direct approach is to use `spec.sparseCheckout` on the GitRepository resource, then use `spec.path` on the Kustomization resource to select which checked-out directory to apply.

## Step 1: Use GitRepository Sparse Checkout

The simplest way to fetch only selected directories from a monorepo is to configure sparse checkout on the GitRepository.

Consider a monorepo with this structure:

```bash
# Repository structure

my-monorepo/
  apps/
    frontend/
    backend/
    worker/
  infrastructure/
    monitoring/
    networking/
    storage/
  clusters/
    production/
    staging/
```

Create a GitRepository for the monorepo and list the paths Flux should check out:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: monorepo
  namespace: flux-system
spec:
  interval: 10m
  url: https://github.com/your-org/my-monorepo.git
  ref:
    branch: main
  secretRef:
    name: git-credentials
  sparseCheckout:
    - apps/frontend
    - infrastructure/monitoring
```

Now create separate Kustomization resources that each target one of the checked-out directories:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: frontend-app
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: monorepo
  # Only apply manifests from the frontend directory
  path: ./apps/frontend
  prune: true
  targetNamespace: frontend
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: monitoring
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: monorepo
  # Only apply manifests from the monitoring directory
  path: ./infrastructure/monitoring
  prune: true
  targetNamespace: monitoring
```

## Step 2: Use the Include Field for Cross-Repo Composition

The `include` field on a GitRepository allows you to pull specific directories from other GitRepository resources into a combined artifact. This is useful when you want to compose configurations from multiple repositories.

Set up a primary GitRepository that includes content from other repositories:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: app-config
  namespace: flux-system
spec:
  interval: 10m
  url: https://github.com/your-org/app-config.git
  ref:
    branch: main
  secretRef:
    name: git-credentials
  include:
    # Pull the common/ directory from the shared-libs repo into ./common
    - repository:
        name: shared-libs
      fromPath: common/
      toPath: common/
```

The referenced GitRepository must exist in the same namespace:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: shared-libs
  namespace: flux-system
spec:
  interval: 30m
  url: https://github.com/your-org/shared-libs.git
  ref:
    branch: main
  secretRef:
    name: git-credentials
```

The resulting artifact for `app-config` will contain its own files plus the contents of `common/` from `shared-libs`.

## Step 3: Optimize Clone Depth for Performance

While not a sparse checkout in the strict sense, shallow cloning can speed up fetching large repos.

Use a branch reference:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: monorepo-shallow
  namespace: flux-system
spec:
  interval: 10m
  url: https://github.com/your-org/my-monorepo.git
  ref:
    branch: main
  secretRef:
    name: git-credentials
```

Flux performs shallow clones by default for branch references, fetching only the latest commit. If you pin a commit, pair it with the branch that contains the commit so the source-controller can perform a shallow clone efficiently.

## Step 4: Split Reconciliation by Directory

Another effective strategy is to use one GitRepository resource with different Kustomizations for different paths.

Multiple Kustomizations sharing a single GitRepository but targeting different paths:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: platform-monorepo
  namespace: flux-system
spec:
  interval: 10m
  url: https://github.com/your-org/platform.git
  ref:
    branch: main
  secretRef:
    name: git-credentials
---
# Team A only cares about their apps
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: team-a-apps
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: platform-monorepo
  path: ./teams/team-a
  prune: true
---
# Team B has their own section
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: team-b-apps
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: platform-monorepo
  path: ./teams/team-b
  prune: true
---
# Platform team manages shared infrastructure
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: platform-infra
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: platform-monorepo
  path: ./infrastructure
  prune: true
```

This pattern uses one GitRepository fetch but distributes the apply logic across multiple Kustomizations, each scoped to its own directory.

## Step 5: Use Ignore Patterns

The GitRepository resource supports a `.sourceignore` file (similar to `.gitignore`) that tells Flux to exclude certain files from the generated artifact.

Create a `.sourceignore` file in the root of your repository:

```bash
# .sourceignore - Exclude files that Flux does not need
# Exclude documentation
docs/
*.md

# Exclude CI/CD pipeline definitions
.github/
.gitlab-ci.yml
Jenkinsfile

# Exclude test fixtures
**/tests/
**/testdata/

# Exclude large binary files
*.tar.gz
*.zip
```

You can also specify the ignore rules inline in the GitRepository spec:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: monorepo-filtered
  namespace: flux-system
spec:
  interval: 10m
  url: https://github.com/your-org/my-monorepo.git
  ref:
    branch: main
  secretRef:
    name: git-credentials
  ignore: |
    # Exclude non-Kubernetes files from the artifact
    docs/
    *.md
    .github/
    **/tests/
```

The `ignore` field reduces the size of the artifact stored by the source-controller. It is applied after checkout, so use `sparseCheckout` when you need to avoid checking out unrelated directories.

## Architecture Diagram

This diagram shows how a monorepo flows through Flux with sparse checkout and path-based filtering:

```mermaid
graph LR
    A[Monorepo] --> B[GitRepository]
    B --> C[Kustomization: path ./apps/frontend]
    B --> D[Kustomization: path ./apps/backend]
    B --> E[Kustomization: path ./infrastructure]
    C --> F[Frontend Namespace]
    D --> G[Backend Namespace]
    E --> H[Infra Namespace]
```

## Verifying the Configuration

Check that your filtered configurations are working correctly.

Verify the source and Kustomization status:

```bash
# Check the GitRepository status
flux get sources git

# Check which Kustomizations are using the source
flux get kustomizations

# Verify a specific Kustomization is applying from the correct path
kubectl describe kustomization frontend-app -n flux-system
```

## Summary

Flux provides sparse checkout for working with monorepos, and Kustomization path filtering lets you point multiple Kustomizations at different directories within a single GitRepository artifact. The `include` field enables cross-repo composition, and `.sourceignore` or the `ignore` field reduces artifact size. For most monorepo use cases, combining GitRepository sparse checkout with path-scoped Kustomizations delivers the best balance of simplicity and performance.
