# How to Use Helm Value Files from Different Git Repos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Helm, Multi-Source

Description: Learn how to use ArgoCD multi-source applications to reference Helm values files from different Git repositories for flexible configuration management.

---

In many organizations, Helm charts and their configuration values live in separate Git repositories. The chart might be maintained by a platform team in one repo, while application teams manage their values files in another. ArgoCD's multi-source application feature (introduced in version 2.6) solves this by letting you reference sources from multiple repositories in a single Application.

This guide walks through setting up multi-source applications to pull Helm values from different Git repos, including practical patterns for team separation and chart repository management.

## Why Separate Charts and Values

There are several good reasons to keep charts and values in different repositories:

- **Ownership separation**: Platform teams own charts, app teams own values
- **Release cadence**: Chart updates and configuration changes follow different timelines
- **Access control**: Different teams need write access to different repos
- **Reusability**: One chart repository serves many applications with values in their respective repos

## Multi-Source Application Basics

A multi-source Application references two or more sources. One source provides the Helm chart, and another provides the values files:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default
  # Note: 'sources' (plural) instead of 'source' (singular)
  sources:
    # Source 1: Helm chart from the chart repository
    - repoURL: https://github.com/myorg/helm-charts.git
      targetRevision: main
      path: charts/my-app
      helm:
        valueFiles:
          # Reference a values file from the 'config' ref below
          - $config/my-app/production/values.yaml

    # Source 2: Values files from the config repository
    - repoURL: https://github.com/myorg/app-config.git
      targetRevision: main
      ref: config  # This ref name is used with $ prefix above

  destination:
    server: https://kubernetes.default.svc
    namespace: production
```

The `ref` field creates a named reference that you use with the `$` prefix in `valueFiles`. When ArgoCD syncs, it clones both repositories and resolves the file paths.

## Repository Structure

### Chart Repository (helm-charts)

```
helm-charts/
  charts/
    my-app/
      Chart.yaml
      templates/
        deployment.yaml
        service.yaml
        ingress.yaml
      values.yaml         # Default chart values
    another-app/
      Chart.yaml
      templates/
      values.yaml
```

### Config Repository (app-config)

```
app-config/
  my-app/
    dev/
      values.yaml
    staging/
      values.yaml
    production/
      values.yaml
      values-us-east.yaml
      values-eu-west.yaml
  another-app/
    dev/
      values.yaml
    production/
      values.yaml
```

## Multiple Values Files from Different Repos

You can reference values files from multiple repositories, and even mix chart defaults with external values:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app-production
  namespace: argocd
spec:
  sources:
    # Source 1: Helm chart with its default values and external values references
    - repoURL: https://github.com/myorg/helm-charts.git
      targetRevision: v2.0.0
      path: charts/my-app
      helm:
        valueFiles:
          # Chart's own default values
          - values.yaml
          # Values from the app team's config repo
          - $appconfig/my-app/production/values.yaml
          # Values from the platform team's shared config
          - $platformconfig/shared/production/base.yaml

    # Source 2: App team's config repository
    - repoURL: https://github.com/myorg/app-config.git
      targetRevision: main
      ref: appconfig

    # Source 3: Platform team's shared configuration
    - repoURL: https://github.com/myorg/platform-config.git
      targetRevision: main
      ref: platformconfig

  destination:
    server: https://kubernetes.default.svc
    namespace: production
```

Values are merged in the order listed in `valueFiles`:
1. `values.yaml` (chart defaults)
2. `$appconfig/my-app/production/values.yaml` (app team overrides)
3. `$platformconfig/shared/production/base.yaml` (platform overrides - highest precedence)

## Helm Chart Repository with External Values

When using a Helm chart from a chart repository (not Git), combine it with a Git source for values:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: nginx-production
  namespace: argocd
spec:
  sources:
    # Source 1: Helm chart from a chart repository
    - chart: nginx
      repoURL: https://charts.bitnami.com/bitnami
      targetRevision: 15.4.0
      helm:
        valueFiles:
          - $values/nginx/production-values.yaml

    # Source 2: Git repo with values files
    - repoURL: https://github.com/myorg/helm-values.git
      targetRevision: main
      ref: values

  destination:
    server: https://kubernetes.default.svc
    namespace: web
```

This pattern is ideal for deploying third-party charts with your own custom configuration.

## ApplicationSet with Multi-Source

Generate multi-source applications for multiple environments:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: my-app
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - env: dev
            namespace: dev
            cluster: https://kubernetes.default.svc
          - env: staging
            namespace: staging
            cluster: https://kubernetes.default.svc
          - env: production
            namespace: production
            cluster: https://prod-cluster.example.com
  template:
    metadata:
      name: 'my-app-{{env}}'
    spec:
      sources:
        - repoURL: https://github.com/myorg/helm-charts.git
          targetRevision: main
          path: charts/my-app
          helm:
            valueFiles:
              - values.yaml
              - '$config/my-app/{{env}}/values.yaml'
        - repoURL: https://github.com/myorg/app-config.git
          targetRevision: main
          ref: config
      destination:
        server: '{{cluster}}'
        namespace: '{{namespace}}'
```

## Version Pinning Across Repos

You can independently version the chart and values by using different `targetRevision` values:

```yaml
sources:
  # Pin the chart to a specific version tag
  - repoURL: https://github.com/myorg/helm-charts.git
    targetRevision: v2.0.0  # Chart version
    path: charts/my-app
    helm:
      valueFiles:
        - values.yaml
        - $config/my-app/production/values.yaml

  # Track the main branch for values (they change more frequently)
  - repoURL: https://github.com/myorg/app-config.git
    targetRevision: main  # Always latest config
    ref: config
```

This lets the platform team release chart versions independently while app teams continuously update their configuration.

## Webhook Configuration

With multi-source applications, you need webhooks from all involved repositories. When a push happens to either the chart repo or the values repo, ArgoCD should re-evaluate the application:

ArgoCD automatically handles this - it monitors all sources listed in the Application. However, if you use webhooks for faster detection, configure them on all repositories.

## Troubleshooting Multi-Source Issues

Common issues and solutions:

```bash
# Check if ArgoCD can access both repositories
argocd repo list

# Verify the application sources
argocd app get my-app -o json | jq '.spec.sources'

# Force a refresh to re-clone both repos
argocd app get my-app --hard-refresh

# Preview rendered manifests to verify values are merged correctly
argocd app manifests my-app
```

Common mistakes:
- **Missing `ref` field**: Every additional source that provides values must have a `ref` field
- **Wrong path prefix**: The path after `$ref/` is relative to the repository root, not any subdirectory
- **Using `source` instead of `sources`**: Multi-source requires the plural `sources` field
- **ArgoCD version**: Multi-source is available from ArgoCD 2.6+. Check your version with `argocd version`

## Summary

Multi-source applications in ArgoCD let you pull Helm values from different Git repositories, enabling clean separation of chart ownership and configuration management. Use the `ref` field to name your sources and reference them with `$ref/path` in `valueFiles`. This pattern supports independent versioning, team-based access control, and flexible repository structures. For simpler setups where everything lives in one repo, see our guide on [using multiple Helm values files](https://oneuptime.com/blog/post/2026-02-26-argocd-multiple-helm-values-files/view).
