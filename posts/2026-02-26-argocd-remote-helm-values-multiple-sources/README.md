# How to Use Remote Helm Values Files with Multiple Sources in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Helm, Multi-Source

Description: Learn how to reference Helm values files from remote Git repositories in ArgoCD multi-source applications using the ref mechanism for centralized configuration.

---

Managing Helm values files in a separate repository from the charts themselves is a common pattern in organizations. ArgoCD's multi-source feature with the `ref` mechanism makes this possible by letting you reference values files from any Git repository. This guide covers the patterns, gotchas, and best practices for working with remote Helm values in multi-source ArgoCD applications.

## The ref Mechanism Deep Dive

The `ref` field on a source creates a named reference to that source's Git repository. Other sources can then reference files from that repository using the `$refName` prefix in their `valueFiles` list.

```yaml
sources:
  # The Helm chart source consumes values from $config
  - repoURL: https://charts.example.com
    chart: my-app
    targetRevision: 1.0.0
    helm:
      valueFiles:
        - $config/path/to/values.yaml  # Resolved from the ref source

  # The ref source makes its repo available as $config
  - repoURL: https://github.com/your-org/config-repo.git
    targetRevision: main
    ref: config  # No "path" needed for ref-only sources
```

Key rules:
- A source with `ref` exposes its entire repository root
- Paths in `$refName/...` are relative to the repository root
- A source can have both `ref` and `path` (it acts as both a ref provider and a manifest source)
- Multiple chart sources can reference the same ref

## Single Values Repository for Multiple Charts

The most common pattern is a centralized values repository that serves multiple Helm chart deployments:

```
config-repo/
  charts/
    nginx-ingress/
      base-values.yaml
      staging-values.yaml
      production-values.yaml
    cert-manager/
      base-values.yaml
      staging-values.yaml
      production-values.yaml
    prometheus/
      base-values.yaml
      staging-values.yaml
      production-values.yaml
```

Each ArgoCD Application references the same config repo:

```yaml
# nginx-ingress deployment
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: nginx-ingress
  namespace: argocd
spec:
  sources:
    - repoURL: https://kubernetes.github.io/ingress-nginx
      chart: ingress-nginx
      targetRevision: 4.9.0
      helm:
        releaseName: ingress-nginx
        valueFiles:
          - $config/charts/nginx-ingress/base-values.yaml
          - $config/charts/nginx-ingress/production-values.yaml

    - repoURL: https://github.com/your-org/config-repo.git
      targetRevision: main
      ref: config

  destination:
    server: https://kubernetes.default.svc
    namespace: ingress-nginx
```

```yaml
# cert-manager deployment (same config repo, different path)
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: cert-manager
  namespace: argocd
spec:
  sources:
    - repoURL: https://charts.jetstack.io
      chart: cert-manager
      targetRevision: 1.14.2
      helm:
        releaseName: cert-manager
        valueFiles:
          - $config/charts/cert-manager/base-values.yaml
          - $config/charts/cert-manager/production-values.yaml
        parameters:
          - name: installCRDs
            value: "true"

    - repoURL: https://github.com/your-org/config-repo.git
      targetRevision: main
      ref: config

  destination:
    server: https://kubernetes.default.svc
    namespace: cert-manager
```

## Multiple Ref Sources

You can use multiple ref sources in the same application, each pointing to a different repository:

```yaml
sources:
  - repoURL: https://charts.example.com
    chart: my-app
    targetRevision: 1.0.0
    helm:
      valueFiles:
        # Common values from the platform team's repo
        - $platform/defaults/resource-limits.yaml
        # App-specific values from the app team's repo
        - $app/my-app/values.yaml
        # Security-hardened overrides from the security team's repo
        - $security/hardening/helm-defaults.yaml

  # Platform team's config repository
  - repoURL: https://github.com/your-org/platform-config.git
    targetRevision: v2.0.0
    ref: platform

  # Application team's config repository
  - repoURL: https://github.com/your-org/my-app-config.git
    targetRevision: main
    ref: app

  # Security team's config repository
  - repoURL: https://github.com/your-org/security-config.git
    targetRevision: main
    ref: security
```

Values files are merged in the order listed. Security overrides applied last take precedence over app-specific and platform defaults.

## Branching Strategy for Values Repos

Different environments can track different branches of the values repository:

```yaml
# Development - tracks main branch for latest changes
sources:
  - repoURL: https://charts.example.com
    chart: my-app
    targetRevision: 1.0.0
    helm:
      valueFiles:
        - $config/my-app/values-dev.yaml
  - repoURL: https://github.com/your-org/config-repo.git
    targetRevision: main  # Latest config changes
    ref: config

---
# Staging - tracks a staging branch
sources:
  - repoURL: https://charts.example.com
    chart: my-app
    targetRevision: 1.0.0
    helm:
      valueFiles:
        - $config/my-app/values-staging.yaml
  - repoURL: https://github.com/your-org/config-repo.git
    targetRevision: staging  # Staging-approved configs
    ref: config

---
# Production - tracks release tags
sources:
  - repoURL: https://charts.example.com
    chart: my-app
    targetRevision: 1.0.0
    helm:
      valueFiles:
        - $config/my-app/values-production.yaml
  - repoURL: https://github.com/your-org/config-repo.git
    targetRevision: config-v3.2.1  # Pinned to specific release
    ref: config
```

## Values File Layering Pattern

A powerful pattern is layering values files from general to specific:

```yaml
helm:
  valueFiles:
    # Layer 1: Organization-wide defaults
    - $config/global/defaults.yaml
    # Layer 2: Cluster-type defaults (e.g., EKS, GKE)
    - $config/clusters/eks/defaults.yaml
    # Layer 3: Environment defaults
    - $config/environments/production/defaults.yaml
    # Layer 4: Application-specific values
    - $config/apps/my-app/values.yaml
    # Layer 5: Application + environment specific
    - $config/apps/my-app/production.yaml
```

Each layer overrides values from the previous layer. This lets you set organization-wide standards while allowing per-app customization.

Example layered values:

```yaml
# global/defaults.yaml - Apply to all charts
resources:
  requests:
    cpu: 100m
    memory: 128Mi

podDisruptionBudget:
  enabled: true
  minAvailable: 1
```

```yaml
# environments/production/defaults.yaml - Production overrides
resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 2000m
    memory: 1Gi

podDisruptionBudget:
  minAvailable: 2

replicaCount: 3
```

```yaml
# apps/my-app/production.yaml - App-specific production values
replicaCount: 5  # This app needs more replicas

ingress:
  enabled: true
  hosts:
    - host: api.example.com
      paths:
        - path: /
          pathType: Prefix
```

## Combining Remote Values with Inline Overrides

You can use remote values files and still apply inline overrides in the same source:

```yaml
sources:
  - repoURL: https://charts.example.com
    chart: my-app
    targetRevision: 1.0.0
    helm:
      # Remote values files
      valueFiles:
        - $config/apps/my-app/values.yaml

      # Inline overrides (highest priority)
      valuesObject:
        image:
          tag: "emergency-hotfix-v2.1.1"

      # Individual parameter overrides (highest priority)
      parameters:
        - name: replicaCount
          value: "10"

  - repoURL: https://github.com/your-org/config-repo.git
    targetRevision: main
    ref: config
```

Priority order from lowest to highest:
1. Chart defaults
2. Remote values files (in listed order)
3. `valuesObject` / `values`
4. `parameters`

## Debugging Remote Values Issues

```bash
# Verify the values file exists in the ref repository
git clone https://github.com/your-org/config-repo.git
ls config-repo/apps/my-app/values.yaml

# Check the branch/tag used by ArgoCD
argocd app get my-app -o yaml | grep -A3 "ref:"

# View rendered Helm output
argocd app manifests my-app

# Compare expected vs actual values
# 1. Render locally
helm template my-app charts/my-app \
  -f config-repo/global/defaults.yaml \
  -f config-repo/apps/my-app/values.yaml

# 2. Compare with ArgoCD's render
argocd app manifests my-app
```

Common issues:
- **"values file not found"** - The path after `$refName/` must exist in the ref repo at the specified `targetRevision`
- **Values not taking effect** - Check the merge order; a later file might override your values
- **Stale values** - The ref repo branch might be cached. Try a hard refresh: `argocd app get my-app --hard-refresh`

## Best Practices

**One config repo per organization** - Centralize all Helm values in a single repository. This makes it easy to find and audit configuration.

**Use directories mirroring chart names** - `config-repo/charts/{chart-name}/` is easy to navigate and discover.

**Pin production to tags or specific commits** - Never let production track `main` in the config repo. Use release tags.

**Validate values in CI** - Run `helm lint` or `helm template` against your values files in the config repo's CI pipeline.

**Keep values files small and focused** - A 1000-line values file is hard to review. Layer multiple smaller files instead.

For more on multi-source applications, see [combining Helm with external values](https://oneuptime.com/blog/post/2026-02-26-argocd-helm-external-values-multiple-sources/view) and [using multiple sources in ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-multiple-sources-single-application/view).
