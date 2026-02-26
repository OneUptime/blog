# How to Handle Helm Chart Dependencies in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Helm, Chart Dependencies

Description: Learn how to manage Helm chart dependencies in ArgoCD including subcharts, dependency resolution, conditional dependencies, and common troubleshooting.

---

Helm chart dependencies let you compose complex applications from smaller, reusable charts. A parent chart can include child charts (subcharts) that get deployed together. When you deploy these charts through ArgoCD, the dependency resolution needs to work correctly for your application to deploy successfully.

This guide covers how ArgoCD handles Helm dependencies, how to configure them properly, and how to troubleshoot common issues.

## How Helm Dependencies Work

Helm dependencies are declared in the `Chart.yaml` file:

```yaml
# Chart.yaml
apiVersion: v2
name: my-app
version: 1.0.0
dependencies:
  - name: postgresql
    version: "13.2.0"
    repository: "https://charts.bitnami.com/bitnami"
    condition: postgresql.enabled
  - name: redis
    version: "18.6.0"
    repository: "https://charts.bitnami.com/bitnami"
    condition: redis.enabled
  - name: common
    version: "2.13.0"
    repository: "https://charts.bitnami.com/bitnami"
    tags:
      - infrastructure
```

When you run `helm dependency update`, Helm downloads the dependency charts into a `charts/` subdirectory and creates a `Chart.lock` file.

## ArgoCD's Dependency Resolution

ArgoCD runs `helm dependency build` automatically when rendering Helm charts. This means ArgoCD downloads and resolves dependencies at sync time. For this to work, ArgoCD must be able to access all dependency repositories.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/myorg/my-charts.git
    targetRevision: main
    path: charts/my-app
    # ArgoCD automatically runs helm dependency build for this chart
  destination:
    server: https://kubernetes.default.svc
    namespace: production
```

## Registering Dependency Repositories

The most common issue with Helm dependencies in ArgoCD is that the dependency repositories are not registered. ArgoCD needs access to every repository referenced in your `Chart.yaml` dependencies.

Register each dependency repository:

```bash
# Add Bitnami repository (used by many charts)
argocd repo add https://charts.bitnami.com/bitnami --type helm --name bitnami

# Add other common repositories
argocd repo add https://prometheus-community.github.io/helm-charts --type helm --name prometheus
argocd repo add https://charts.jetstack.io --type helm --name jetstack
```

Or declaratively:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: bitnami-helm-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: helm
  name: bitnami
  url: https://charts.bitnami.com/bitnami
---
apiVersion: v1
kind: Secret
metadata:
  name: prometheus-helm-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: helm
  name: prometheus
  url: https://prometheus-community.github.io/helm-charts
```

## Pre-built Dependencies (charts/ Directory)

An alternative to letting ArgoCD resolve dependencies at sync time is to check in the pre-built dependency charts:

```bash
# Build dependencies locally
cd charts/my-app
helm dependency update

# This creates:
# charts/my-app/charts/postgresql-13.2.0.tgz
# charts/my-app/charts/redis-18.6.0.tgz
# charts/my-app/Chart.lock

# Commit the charts/ directory and Chart.lock
git add charts/ Chart.lock
git commit -m "Update helm dependencies"
git push
```

When ArgoCD finds pre-built dependencies in the `charts/` directory, it uses them directly without needing to download from remote repositories. This approach:

- Eliminates dependency on external repositories at sync time
- Makes syncs faster and more reliable
- Provides a deterministic build (the exact versions are committed)
- But increases Git repository size

## Configuring Subchart Values

Override values for dependency charts using the chart name as a prefix:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/myorg/my-charts.git
    path: charts/my-app
    helm:
      values: |
        # Values for the parent chart
        replicaCount: 3

        # Values for the postgresql subchart
        postgresql:
          enabled: true
          auth:
            postgresPassword: changeme
            database: myapp
          primary:
            persistence:
              size: 20Gi

        # Values for the redis subchart
        redis:
          enabled: true
          architecture: standalone
          auth:
            enabled: false
          master:
            persistence:
              size: 5Gi
  destination:
    server: https://kubernetes.default.svc
    namespace: production
```

## Conditional Dependencies

Use the `condition` field in `Chart.yaml` to make dependencies optional:

```yaml
# Chart.yaml
dependencies:
  - name: postgresql
    version: "13.2.0"
    repository: "https://charts.bitnami.com/bitnami"
    condition: postgresql.enabled  # Only installed if postgresql.enabled is true
  - name: redis
    version: "18.6.0"
    repository: "https://charts.bitnami.com/bitnami"
    condition: redis.enabled
```

Then control in your values:

```yaml
# values.yaml for dev (no database - uses external)
postgresql:
  enabled: false
redis:
  enabled: true

# values-prod.yaml for production (includes database)
postgresql:
  enabled: true
  auth:
    postgresPassword: prod-password
redis:
  enabled: true
```

In ArgoCD:

```yaml
spec:
  source:
    path: charts/my-app
    helm:
      valueFiles:
        - values.yaml
        - values-prod.yaml  # Enables postgresql for production
```

## File-Based Dependencies (Local Charts)

For charts within the same repository, use `file://` references:

```yaml
# Chart.yaml
dependencies:
  - name: common-lib
    version: "1.0.0"
    repository: "file://../common-lib"
```

Repository structure:

```
charts/
  my-app/
    Chart.yaml
    templates/
    values.yaml
  common-lib/
    Chart.yaml
    templates/
```

ArgoCD resolves file-based dependencies relative to the chart directory within the Git repository.

## Dependency Lock Files

The `Chart.lock` file pins exact dependency versions:

```yaml
# Chart.lock (auto-generated by helm dependency update)
dependencies:
  - name: postgresql
    repository: https://charts.bitnami.com/bitnami
    version: 13.2.0
  - name: redis
    repository: https://charts.bitnami.com/bitnami
    version: 18.6.0
digest: sha256:abc123...
generated: "2026-02-26T10:00:00.000000000Z"
```

ArgoCD uses `Chart.lock` to resolve dependencies to exact versions. Always commit `Chart.lock` to your repository for reproducible builds.

## Updating Dependencies

When you need to update a dependency version:

```bash
# Update Chart.yaml with the new version
# Then rebuild dependencies
helm dependency update charts/my-app

# If using pre-built dependencies, also commit the charts/ directory
git add charts/my-app/Chart.lock charts/my-app/charts/
git commit -m "Update postgresql dependency to 13.3.0"
git push
```

## Troubleshooting Dependency Issues

### Error: repository not found

```
Error: repository "https://charts.bitnami.com/bitnami" not found
```

Solution: Register the repository in ArgoCD:

```bash
argocd repo add https://charts.bitnami.com/bitnami --type helm --name bitnami
```

### Error: chart version not found

```
Error: chart "postgresql" version "13.2.0" not found
```

Solution: Check if the version exists in the repository:

```bash
helm search repo bitnami/postgresql --versions | grep 13.2.0
```

If it does not exist, update your `Chart.yaml` to a valid version.

### Dependency not rendering

If a dependency is not appearing in rendered output:

```bash
# Check if the dependency's condition evaluates to true
argocd app manifests my-app | grep postgresql

# Check the rendered values
argocd app get my-app -o json | jq '.spec.source.helm'
```

### Slow sync due to dependency download

If syncs are slow because ArgoCD downloads dependencies every time:

1. Pre-build dependencies and commit the `charts/` directory
2. Or use a local chart museum cache

## Summary

Helm chart dependencies in ArgoCD work through automatic `helm dependency build` during sync. Register all dependency repositories in ArgoCD, use `Chart.lock` for reproducible builds, and consider pre-building dependencies for faster syncs. Use conditional dependencies to vary your deployment stack across environments. For dependency repository authentication, see our guide on [private Helm repositories](https://oneuptime.com/blog/post/2026-02-26-argocd-private-helm-repositories/view).
