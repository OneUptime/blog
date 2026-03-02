# How to Skip Helm CRD Installation in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Helm, CRD

Description: Learn how to skip Helm CRD installation in ArgoCD when CRDs are managed separately, with patterns for CRD lifecycle management in GitOps workflows.

---

Custom Resource Definitions (CRDs) are a special resource type in Kubernetes. They extend the API server and affect the entire cluster, not just a single namespace. When Helm charts include CRDs, managing them through ArgoCD requires careful consideration. Sometimes you need to skip Helm's CRD installation because CRDs are managed separately, installed by a different team, or you want more control over when CRDs are updated.

This guide explains how to skip CRD installation in ArgoCD Helm applications, why you might want to, and alternative patterns for CRD lifecycle management.

## Why Skip CRD Installation

There are several reasons to skip CRD installation from Helm charts:

1. **CRDs are cluster-scoped**: They affect all namespaces. You may want a dedicated process for managing them.
2. **Upgrade safety**: Helm does not update CRDs after initial installation by default. Relying on Helm for CRD management creates a false sense of security.
3. **Separate ownership**: A platform team manages CRDs while application teams manage their workloads.
4. **Multiple applications**: Several Helm releases might include the same CRDs, causing conflicts.
5. **Ordering requirements**: CRDs must exist before any custom resources that reference them can be created.

## How Helm Handles CRDs

Helm has a special `crds/` directory in chart packages. Files placed there are installed before any templates are rendered, but they have limitations:

- CRDs in the `crds/` directory are only installed on `helm install`, never on `helm upgrade`
- They cannot be templated (no Go template functions)
- They cannot be uninstalled with `helm uninstall`

Some charts also include CRDs as regular templates (in the `templates/` directory) instead of the `crds/` directory. These behave differently - they are templated and upgraded normally.

## Skipping CRDs in ArgoCD

### Method 1: skipCrds Option

ArgoCD provides a `skipCrds` option in the Helm configuration:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: cert-manager
  namespace: argocd
spec:
  source:
    chart: cert-manager
    repoURL: https://charts.jetstack.io
    targetRevision: 1.14.0
    helm:
      # Skip CRDs from the crds/ directory
      skipCrds: true
      values: |
        installCRDs: false  # Also disable CRDs from templates/
  destination:
    server: https://kubernetes.default.svc
    namespace: cert-manager
```

Note that `skipCrds: true` only affects CRDs in the `crds/` directory. If the chart includes CRDs as regular templates, you also need to set the chart's own flag (like `installCRDs: false` for cert-manager).

Using the CLI:

```bash
argocd app create cert-manager \
  --repo https://charts.jetstack.io \
  --helm-chart cert-manager \
  --revision 1.14.0 \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace cert-manager \
  --helm-skip-crds \
  --helm-set installCRDs=false
```

### Method 2: Chart-Specific Flags

Many popular charts have their own flags for CRD management:

```yaml
# cert-manager
helm:
  skipCrds: true
  values: |
    installCRDs: false

# kube-prometheus-stack / Prometheus Operator
helm:
  values: |
    prometheusOperator:
      admissionWebhooks:
        enabled: false
    # CRDs are managed via crds/ directory, use skipCrds
  skipCrds: true

# Istio
helm:
  values: |
    base:
      enableCRDTemplates: false

# Argo Rollouts
helm:
  values: |
    installCRDs: false
```

## Managing CRDs Separately

When you skip CRD installation from Helm charts, you need an alternative way to manage them. Here are the common patterns:

### Pattern 1: Dedicated CRD Application

Create a separate ArgoCD Application just for CRDs:

```yaml
# crd-application.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: cert-manager-crds
  namespace: argocd
  annotations:
    # Ensure CRDs sync before the main application
    argocd.argoproj.io/sync-wave: "-1"
spec:
  project: default
  source:
    repoURL: https://github.com/cert-manager/cert-manager.git
    targetRevision: v1.14.0
    path: deploy/crds
  destination:
    server: https://kubernetes.default.svc
    namespace: default  # CRDs are cluster-scoped
  syncPolicy:
    automated:
      prune: false  # Never auto-delete CRDs
      selfHeal: true
    syncOptions:
      - CreateNamespace=false
      - Replace=true  # Replace CRDs instead of apply for large CRDs
---
# Main application (syncs after CRDs)
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: cert-manager
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "0"
spec:
  source:
    chart: cert-manager
    repoURL: https://charts.jetstack.io
    targetRevision: 1.14.0
    helm:
      skipCrds: true
      values: |
        installCRDs: false
  destination:
    server: https://kubernetes.default.svc
    namespace: cert-manager
```

### Pattern 2: CRD Management with Kustomize

Store CRDs in a Git repository and manage them with Kustomize:

```yaml
# crds/cert-manager/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.crds.yaml
```

```yaml
# ArgoCD Application for CRDs
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: cluster-crds
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/myorg/cluster-config.git
    targetRevision: main
    path: crds/cert-manager
  destination:
    server: https://kubernetes.default.svc
  syncPolicy:
    automated:
      prune: false  # Important: never auto-prune CRDs
    syncOptions:
      - ServerSideApply=true  # Recommended for large CRDs
```

### Pattern 3: App-of-Apps with Sync Waves

Use sync waves in an app-of-apps setup to ensure CRDs are installed first:

```yaml
# apps/cert-manager-crds.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: cert-manager-crds
  annotations:
    argocd.argoproj.io/sync-wave: "-2"
spec:
  source:
    repoURL: https://github.com/myorg/cluster-config.git
    path: crds/cert-manager
  destination:
    server: https://kubernetes.default.svc

---
# apps/cert-manager.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: cert-manager
  annotations:
    argocd.argoproj.io/sync-wave: "0"
spec:
  source:
    chart: cert-manager
    repoURL: https://charts.jetstack.io
    targetRevision: 1.14.0
    helm:
      skipCrds: true
      values: |
        installCRDs: false
  destination:
    server: https://kubernetes.default.svc
    namespace: cert-manager
```

## ServerSideApply for Large CRDs

Some CRDs are very large (especially cert-manager and Prometheus CRDs). Standard `kubectl apply` can fail with "too large" errors. Use ServerSideApply:

```yaml
syncPolicy:
  syncOptions:
    - ServerSideApply=true
```

Or use Replace:

```yaml
syncPolicy:
  syncOptions:
    - Replace=true
```

## Protecting CRDs from Accidental Deletion

CRDs should never be accidentally deleted because that would delete all custom resources that depend on them:

```yaml
# Add this annotation to prevent ArgoCD from pruning CRDs
metadata:
  annotations:
    argocd.argoproj.io/sync-options: Prune=false
```

Or at the application level:

```yaml
syncPolicy:
  automated:
    prune: false  # Never auto-prune this application's resources
```

## Summary

Skip Helm CRD installation in ArgoCD by setting `skipCrds: true` in the Helm configuration and disabling any chart-specific CRD flags. Then manage CRDs separately using a dedicated ArgoCD Application with sync waves to ensure CRDs exist before resources that depend on them. Always disable auto-pruning for CRD applications and consider using ServerSideApply for large CRDs. This approach gives you explicit control over CRD lifecycle management, which is critical for cluster stability.
