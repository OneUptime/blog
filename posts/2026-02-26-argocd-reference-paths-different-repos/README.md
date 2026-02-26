# How to Reference Specific Paths from Different Repos in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Multi-Source, Repository Management

Description: Learn how to reference and combine specific directory paths from different Git repositories in ArgoCD multi-source applications for modular deployment configurations.

---

When building ArgoCD multi-source applications, you frequently need to pull specific subdirectories from different repositories. Each team might maintain their configuration in a different repo structure, and you need to extract just the relevant pieces. This guide covers how to effectively target specific paths across repositories and the patterns that work best.

## Path Configuration Basics

Each source in a multi-source Application can specify a `path` that tells ArgoCD which directory to read. The path is relative to the root of the Git repository:

```yaml
sources:
  # Read from repo-a/services/payment-api/
  - repoURL: https://github.com/your-org/repo-a.git
    targetRevision: main
    path: services/payment-api

  # Read from repo-b/overlays/production/
  - repoURL: https://github.com/your-org/repo-b.git
    targetRevision: main
    path: overlays/production

  # Read from the root of repo-c
  - repoURL: https://github.com/your-org/repo-c.git
    targetRevision: main
    path: .  # Root directory
```

## Same Repository, Different Paths

A single repository can appear multiple times in the `sources` array with different paths. This is useful when a monorepo contains configurations for different components:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: full-stack
  namespace: argocd
spec:
  sources:
    # Backend manifests from the monorepo
    - repoURL: https://github.com/your-org/platform-monorepo.git
      targetRevision: main
      path: services/backend/deploy

    # Frontend manifests from the same monorepo
    - repoURL: https://github.com/your-org/platform-monorepo.git
      targetRevision: main
      path: services/frontend/deploy

    # Shared infrastructure from the same monorepo
    - repoURL: https://github.com/your-org/platform-monorepo.git
      targetRevision: main
      path: infrastructure/shared

    # Monitoring configs from a separate repo
    - repoURL: https://github.com/your-org/monitoring-config.git
      targetRevision: main
      path: dashboards/payment-team

  destination:
    server: https://kubernetes.default.svc
    namespace: payment-platform
```

ArgoCD clones the repository once and reads from multiple paths, so there is no performance penalty for referencing the same repo multiple times.

## Targeting Nested Paths

Paths can be deeply nested. ArgoCD reads from exactly the directory you specify:

```yaml
sources:
  # Deep path into a complex repo structure
  - repoURL: https://github.com/your-org/infrastructure.git
    targetRevision: main
    path: clusters/us-east-1/production/namespaces/payments/network-policies

  # Another deep path from the same repo
  - repoURL: https://github.com/your-org/infrastructure.git
    targetRevision: main
    path: clusters/us-east-1/production/namespaces/payments/resource-quotas
```

If you find yourself referencing many sibling directories from the same parent path, consider using a single source with directory recursion instead:

```yaml
# Instead of multiple sources for sibling directories...
sources:
  - repoURL: https://github.com/your-org/infrastructure.git
    targetRevision: main
    path: clusters/us-east-1/production/namespaces/payments
    directory:
      recurse: true  # Reads all subdirectories
```

## Paths with Different Source Types

Each path can use a different source type. ArgoCD auto-detects the type based on the directory contents:

```yaml
sources:
  # Plain YAML directory (no kustomization.yaml or Chart.yaml)
  - repoURL: https://github.com/your-org/manifests.git
    targetRevision: main
    path: crds/my-operator  # Contains plain .yaml files

  # Kustomize directory (has kustomization.yaml)
  - repoURL: https://github.com/your-org/app-configs.git
    targetRevision: main
    path: overlays/production  # Contains kustomization.yaml

  # Helm chart directory (has Chart.yaml)
  - repoURL: https://github.com/your-org/charts.git
    targetRevision: main
    path: charts/my-app  # Contains Chart.yaml
    helm:
      releaseName: my-app
      valueFiles:
        - values-production.yaml

  # Jsonnet directory (has .jsonnet files)
  - repoURL: https://github.com/your-org/jsonnet-configs.git
    targetRevision: main
    path: apps/dashboards  # Contains main.jsonnet
```

## Pattern: Shared CRDs + Application Resources

A common cross-repo pattern separates CRD definitions from the custom resources that use them:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-operator-deployment
  namespace: argocd
spec:
  sources:
    # CRDs from the operator repository
    - repoURL: https://github.com/vendor/my-operator.git
      targetRevision: v1.5.0
      path: config/crd/bases

    # Operator deployment from the same vendor repo
    - repoURL: https://github.com/vendor/my-operator.git
      targetRevision: v1.5.0
      path: config/manager

    # Custom resources defined by your team
    - repoURL: https://github.com/your-org/custom-resources.git
      targetRevision: main
      path: my-operator/production

  destination:
    server: https://kubernetes.default.svc
    namespace: my-operator-system
```

Use sync waves to ensure CRDs are applied before custom resources:

```yaml
# In the CRD files from config/crd/bases/
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "-5"

# In the operator deployment
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "-1"

# In the custom resources
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "1"
```

## Pattern: Config Layers from Different Repos

Pull configuration layers from different teams' repositories:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: payment-service
  namespace: argocd
spec:
  sources:
    # Layer 1: Namespace and quotas from platform team
    - repoURL: https://github.com/your-org/platform-config.git
      targetRevision: v3.0.0
      path: namespaces/payments

    # Layer 2: Network policies from security team
    - repoURL: https://github.com/your-org/security-config.git
      targetRevision: main
      path: network-policies/payments

    # Layer 3: Application manifests from app team
    - repoURL: https://github.com/your-org/payment-service.git
      targetRevision: release-2.1
      path: kubernetes/manifests

    # Layer 4: Monitoring from SRE team
    - repoURL: https://github.com/your-org/sre-monitoring.git
      targetRevision: main
      path: services/payment-service

  destination:
    server: https://kubernetes.default.svc
    namespace: payments
```

## Version Pinning Per Path

Each source can independently track a different version. This is powerful when different paths evolve at different rates:

```yaml
sources:
  # Infrastructure pinned to a release tag
  - repoURL: https://github.com/your-org/infrastructure.git
    targetRevision: v2.5.0  # Stable release
    path: shared/rbac

  # Application manifests tracking a branch
  - repoURL: https://github.com/your-org/payment-service.git
    targetRevision: main  # Continuous delivery
    path: deploy/kubernetes

  # Third-party config pinned to a specific commit
  - repoURL: https://github.com/vendor/config-examples.git
    targetRevision: abc123def  # Specific tested commit
    path: examples/kubernetes
```

## Path Validation and Debugging

When a path does not work as expected:

```bash
# Verify the path exists in the repository at the specified revision
git clone https://github.com/your-org/repo.git
cd repo
git checkout <targetRevision>
ls -la <path>

# Check for source type detection
# ArgoCD checks for these files:
ls <path>/Chart.yaml          # Helm
ls <path>/kustomization.yaml  # Kustomize
ls <path>/*.jsonnet            # Jsonnet
# If none found, it uses directory (plain YAML) type

# View what ArgoCD renders from this path
argocd app manifests my-app

# Check for errors in the app status
argocd app get my-app
```

Common path issues:
- **Trailing slashes** - Do not add trailing slashes to paths. Use `path: apps/my-app` not `path: apps/my-app/`
- **Leading slashes** - Paths should not start with `/`. They are relative to the repo root
- **Case sensitivity** - Git paths are case-sensitive. `Apps/MyApp` is different from `apps/myapp`
- **Empty directories** - A path pointing to an empty directory will not produce errors but will not contribute any manifests
- **Missing path** - If the path does not exist at the specified `targetRevision`, ArgoCD reports a sync error

## Best Practices

**Use descriptive path structures** - Paths like `deploy/kubernetes/manifests` are clearer than `k8s` or `files`.

**Keep paths stable** - Reorganizing repository directories breaks all ArgoCD Applications referencing those paths. Use path aliases or symlinks carefully.

**One concern per path** - Each path should contain resources for a single concern (networking, deployment, monitoring). Do not mix unrelated resources in the same directory.

**Document path dependencies** - If a path's resources depend on another path's resources (like CRDs), document the dependency and use sync waves.

For more on multi-source applications, see [using multiple sources in ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-multiple-sources-single-application/view) and [ordering priority with multiple sources](https://oneuptime.com/blog/post/2026-02-26-argocd-ordering-priority-multiple-sources/view).
