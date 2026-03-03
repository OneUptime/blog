# How to Organize Plain YAML Manifests for ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, YAML, Repository Structure

Description: Learn proven strategies for organizing plain Kubernetes YAML manifests in Git repositories for efficient ArgoCD deployments across multiple environments and teams.

---

How you organize your YAML manifests in Git directly affects how well ArgoCD manages your deployments. A disorganized repository leads to confusion about what gets deployed where, makes pull request reviews painful, and causes unexpected sync behavior. This guide presents practical patterns for structuring plain YAML manifests that scale from a few services to large platform deployments.

## The Core Principle

Every ArgoCD Application points to a directory path in a Git repository. That directory (and optionally its subdirectories with recursion) defines the complete desired state of that application. Your repository structure should make it obvious which files belong to which deployment target.

## Pattern 1: Flat Per-Application Directories

The simplest pattern - one directory per application, all manifests at the top level:

```text
k8s-manifests/
  apps/
    frontend/
      deployment.yaml
      service.yaml
      ingress.yaml
      configmap.yaml
      hpa.yaml
    backend-api/
      deployment.yaml
      service.yaml
      configmap.yaml
      secret.yaml
      hpa.yaml
    worker/
      deployment.yaml
      service.yaml
      configmap.yaml
```

Each ArgoCD Application maps to one directory:

```yaml
# One ArgoCD Application per directory
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: frontend
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/your-org/k8s-manifests.git
    path: apps/frontend
  destination:
    server: https://kubernetes.default.svc
    namespace: production
```

**Best for:** Small teams, few services, single environment deployments.

**Limitation:** No built-in way to handle multiple environments without duplicating files.

## Pattern 2: Environment-Based Directories

Separate directories for each environment:

```text
k8s-manifests/
  environments/
    staging/
      frontend/
        deployment.yaml
        service.yaml
        ingress.yaml
        configmap.yaml
      backend-api/
        deployment.yaml
        service.yaml
        configmap.yaml
    production/
      frontend/
        deployment.yaml
        service.yaml
        ingress.yaml
        configmap.yaml
      backend-api/
        deployment.yaml
        service.yaml
        configmap.yaml
```

```yaml
# Staging frontend
spec:
  source:
    path: environments/staging/frontend
  destination:
    server: https://staging-cluster.example.com
    namespace: frontend

---
# Production frontend
spec:
  source:
    path: environments/production/frontend
  destination:
    server: https://production-cluster.example.com
    namespace: frontend
```

**Best for:** Teams that want full visibility into exactly what runs in each environment. Clear separation makes auditing easy.

**Limitation:** File duplication between environments. Changing a common setting means editing multiple files.

## Pattern 3: Base Plus Environment Overrides

Reduce duplication by using a shared base with environment-specific files:

```text
k8s-manifests/
  apps/
    frontend/
      base/
        deployment.yaml
        service.yaml
        ingress.yaml
      staging/
        configmap.yaml
        patches/
          deployment-replicas.yaml
      production/
        configmap.yaml
        patches/
          deployment-replicas.yaml
          deployment-resources.yaml
```

This pattern works well with a naming convention where each environment directory contains only the files that differ. However, with plain YAML (no Kustomize), ArgoCD cannot merge base and overlay files automatically. You have two options:

**Option A:** Use separate ArgoCD Applications and manually keep base files in sync:

```yaml
# Staging - deploy base + staging-specific files
# You would need recursion with the staging directory containing
# copies of base files plus overrides
```

**Option B:** Adopt Kustomize for the overlay mechanism while keeping individual manifests as plain YAML. This is often the right migration path when your plain YAML structure outgrows its simplicity.

## Pattern 4: Namespace-Organized Structure

Organize by the target namespace, which mirrors how resources appear in the cluster:

```text
k8s-manifests/
  namespaces/
    payments/
      namespace.yaml
      backend/
        deployment.yaml
        service.yaml
      frontend/
        deployment.yaml
        service.yaml
        ingress.yaml
      shared/
        configmap.yaml
        networkpolicy.yaml
    monitoring/
      namespace.yaml
      prometheus/
        deployment.yaml
        service.yaml
        configmap.yaml
      grafana/
        deployment.yaml
        service.yaml
        ingress.yaml
```

```yaml
# One ArgoCD Application per namespace
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: payments-namespace
  namespace: argocd
spec:
  source:
    path: namespaces/payments
    directory:
      recurse: true
  destination:
    server: https://kubernetes.default.svc
    namespace: payments
```

**Best for:** Platform teams managing infrastructure where the namespace is the primary organizational boundary.

## Pattern 5: Team-Based Organization

Organize by team ownership for multi-team environments:

```text
k8s-manifests/
  teams/
    platform/
      cert-manager/
        deployment.yaml
        clusterissuer.yaml
      ingress-nginx/
        deployment.yaml
        service.yaml
        configmap.yaml
    payments/
      payment-api/
        deployment.yaml
        service.yaml
      payment-worker/
        deployment.yaml
    catalog/
      catalog-api/
        deployment.yaml
        service.yaml
      search-indexer/
        deployment.yaml
```

This maps naturally to ArgoCD Projects, where each team gets their own project with restricted permissions:

```yaml
# ArgoCD Project per team
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: payments-team
  namespace: argocd
spec:
  sourceRepos:
    - https://github.com/your-org/k8s-manifests.git
  destinations:
    - server: https://kubernetes.default.svc
      namespace: payments
  # Only allow apps from the payments team directory
  sourceNamespaces:
    - argocd
```

**Best for:** Organizations with clear team ownership boundaries and RBAC requirements.

## Handling Shared Resources

Shared resources like CRDs, ClusterRoles, and cluster-wide ConfigMaps need special treatment since they do not belong to any single application:

```text
k8s-manifests/
  cluster/
    crds/
      my-crd.yaml
    clusterroles/
      reader-role.yaml
      admin-role.yaml
    cluster-configs/
      priority-classes.yaml
      resource-quotas.yaml
  apps/
    frontend/
      ...
    backend/
      ...
```

Create a dedicated ArgoCD Application for cluster-wide resources:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: cluster-resources
  namespace: argocd
spec:
  source:
    path: cluster
    directory:
      recurse: true
  destination:
    server: https://kubernetes.default.svc
  syncPolicy:
    automated:
      prune: false  # Be cautious with pruning cluster-wide resources
      selfHeal: true
```

## Scaling Considerations

As your repository grows, keep these principles in mind:

**One Application per deployment unit** - An ArgoCD Application should represent something that gets deployed together. If two components have independent release cycles, they should be separate applications.

**Avoid monolithic directories** - A single directory with 200 YAML files is hard to manage. Split into logical groups.

**Use ApplicationSets for repetition** - If you have the same application structure repeated across environments or clusters, use ArgoCD ApplicationSets instead of duplicating Application manifests:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: all-apps
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/your-org/k8s-manifests.git
        revision: main
        directories:
          - path: apps/*
  template:
    metadata:
      name: '{{path.basename}}'
    spec:
      source:
        repoURL: https://github.com/your-org/k8s-manifests.git
        targetRevision: main
        path: '{{path}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{path.basename}}'
```

This automatically creates an ArgoCD Application for every directory under `apps/`.

## Migration Path to Kustomize or Helm

Most teams start with plain YAML and eventually need templating. Here is when to consider migrating:

- **More than 3 environments** with mostly identical configs - switch to Kustomize
- **Complex parameterization needs** - switch to Helm
- **Third-party chart consumption** - use Helm for the chart, plain YAML for your own services

The good news is that ArgoCD supports all three source types, so you can migrate incrementally - some applications as plain YAML, others as Kustomize or Helm.

## Repository Hygiene

**Add a `.gitignore`** to exclude editor artifacts:

```text
# .gitignore
*.swp
*.bak
*~
.DS_Store
```

**Use YAML linting** in your CI pipeline:

```bash
# .github/workflows/lint.yaml
yamllint -d relaxed apps/
kubeval --strict apps/**/*.yaml
```

**Review PRs carefully** - With plain YAML, every change is visible in the diff. There is no template rendering to hide behind.

For related guides, see [deploying plain YAML manifests](https://oneuptime.com/blog/post/2026-02-26-argocd-deploy-plain-yaml-manifests/view) and [deploying multiple YAML files from a directory](https://oneuptime.com/blog/post/2026-02-26-argocd-deploy-multiple-yaml-files-directory/view).
