# How to Implement the App-of-Apps Pattern at Scale

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Architecture, Scalability

Description: Learn how to scale the ArgoCD App-of-Apps pattern for managing hundreds of applications across multiple clusters with proper structuring and automation.

---

The App-of-Apps pattern is one of the most powerful features in ArgoCD. A single parent Application manages child Applications, giving you a hierarchical way to organize deployments. But when you scale this pattern beyond a dozen apps, you hit real problems - slow syncs, confusing dependency chains, and management overhead. This guide shows you how to make App-of-Apps work at scale.

## The Basic App-of-Apps Recap

If you are not familiar with the pattern, the idea is simple. You create one ArgoCD Application that points to a Git directory containing other Application manifests:

```yaml
# root-app.yaml - The parent application
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: root-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/org/gitops-config.git
    targetRevision: main
    path: apps/
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
```

The `apps/` directory contains individual Application manifests. When ArgoCD syncs the root app, it creates all the child applications. For the foundational concept, see our post on [ArgoCD App of Apps pattern](https://oneuptime.com/blog/post/2026-01-30-argocd-app-of-apps-pattern/view).

## Where It Breaks Down

At 10 applications, App-of-Apps works beautifully. At 200+, you start seeing:

- **Sync timeouts** when the root app tries to reconcile everything at once
- **Blast radius concerns** where a bad root app change breaks all child apps
- **Slow Git operations** as the config repo grows
- **RBAC complexity** when different teams own different child apps
- **Dependency confusion** when child apps depend on each other

## Scaling Strategy 1: Hierarchical App-of-Apps

Instead of one flat root app, create a tree:

```text
root-app
  ├── platform-apps (ingress, cert-manager, monitoring)
  ├── team-a-apps (team A microservices)
  ├── team-b-apps (team B microservices)
  └── shared-services (databases, caches, queues)
```

The root app manages category-level parent apps, and each category parent manages the actual workloads:

```yaml
# apps/platform-apps.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: platform-apps
  namespace: argocd
spec:
  project: platform
  source:
    repoURL: https://github.com/org/gitops-config.git
    targetRevision: main
    path: apps/platform/
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
  syncPolicy:
    automated:
      selfHeal: true
      prune: true
```

```yaml
# apps/platform/cert-manager.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: cert-manager
  namespace: argocd
spec:
  project: platform
  source:
    repoURL: https://github.com/org/gitops-config.git
    targetRevision: main
    path: manifests/cert-manager/
  destination:
    server: https://kubernetes.default.svc
    namespace: cert-manager
  syncPolicy:
    automated:
      selfHeal: true
```

## Scaling Strategy 2: Sync Waves for Ordering

When you have dependencies between child apps (like cert-manager must exist before ingress), use sync waves:

```yaml
# apps/platform/cert-manager.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: cert-manager
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "1"
spec:
  project: platform
  source:
    path: manifests/cert-manager/
    repoURL: https://github.com/org/gitops-config.git
    targetRevision: main
  destination:
    server: https://kubernetes.default.svc
    namespace: cert-manager
```

```yaml
# apps/platform/ingress-nginx.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: ingress-nginx
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "2"
spec:
  project: platform
  source:
    path: manifests/ingress-nginx/
    repoURL: https://github.com/org/gitops-config.git
    targetRevision: main
  destination:
    server: https://kubernetes.default.svc
    namespace: ingress-nginx
```

ArgoCD processes sync waves in order. Wave 1 resources must be healthy before wave 2 starts.

## Scaling Strategy 3: Combine with ApplicationSets

For repetitive patterns, do not create individual Application manifests. Use ApplicationSets within your App-of-Apps:

```yaml
# apps/team-microservices.yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: team-a-services
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/org/gitops-config.git
        revision: main
        directories:
          - path: manifests/team-a/*
  template:
    metadata:
      name: '{{path.basename}}'
    spec:
      project: team-a
      source:
        repoURL: https://github.com/org/gitops-config.git
        targetRevision: main
        path: '{{path}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: team-a
      syncPolicy:
        automated:
          selfHeal: true
          prune: true
```

This automatically creates an Application for each directory under `manifests/team-a/`. When a team adds a new service, they just add a directory - no need to write an Application manifest.

## Scaling Strategy 4: Multi-Cluster with Cluster Generators

For multi-cluster deployments, combine App-of-Apps with cluster generators:

```yaml
# apps/platform-per-cluster.yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: platform-per-cluster
  namespace: argocd
spec:
  generators:
    - clusters:
        selector:
          matchLabels:
            env: production
  template:
    metadata:
      name: 'platform-{{name}}'
    spec:
      project: platform
      source:
        repoURL: https://github.com/org/gitops-config.git
        targetRevision: main
        path: apps/platform/
      destination:
        server: '{{server}}'
        namespace: argocd
```

This creates a platform App-of-Apps for every production cluster.

## Repository Structure for Scale

Here is a proven directory structure that supports hundreds of apps:

```text
gitops-config/
├── apps/                          # Root-level app manifests
│   ├── root.yaml                  # The root App-of-Apps
│   ├── platform-apps.yaml         # Platform category parent
│   ├── team-a-apps.yaml           # Team A category parent
│   ├── team-b-apps.yaml           # Team B category parent
│   ├── platform/                  # Platform child apps
│   │   ├── cert-manager.yaml
│   │   ├── ingress-nginx.yaml
│   │   └── monitoring.yaml
│   ├── team-a/                    # Team A child apps
│   │   ├── service-1.yaml
│   │   └── service-2.yaml
│   └── team-b/                    # Team B child apps
│       ├── api-gateway.yaml
│       └── worker.yaml
├── manifests/                     # Actual Kubernetes manifests
│   ├── cert-manager/
│   ├── ingress-nginx/
│   ├── monitoring/
│   ├── team-a/
│   │   ├── service-1/
│   │   └── service-2/
│   └── team-b/
│       ├── api-gateway/
│       └── worker/
└── helm-values/                   # Per-environment Helm values
    ├── production/
    ├── staging/
    └── development/
```

## RBAC for Multi-Team Scale

Each category should have its own AppProject with proper RBAC:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: team-a
  namespace: argocd
spec:
  description: Team A microservices
  sourceRepos:
    - https://github.com/org/gitops-config.git
    - https://github.com/org/team-a-*.git
  destinations:
    - namespace: team-a
      server: https://kubernetes.default.svc
    - namespace: team-a-*
      server: https://kubernetes.default.svc
  clusterResourceWhitelist: []
  namespaceResourceWhitelist:
    - group: '*'
      kind: '*'
  roles:
    - name: team-a-admin
      description: Team A admin access
      policies:
        - p, proj:team-a:team-a-admin, applications, *, team-a/*, allow
      groups:
        - team-a-engineers
```

## Health Checks for the Pattern

The root app shows as Healthy only when all child apps are Healthy. You can add custom health logic:

```yaml
# In argocd-cm ConfigMap
resource.customizations.health.argoproj.io_Application: |
  hs = {}
  hs.status = "Progressing"
  hs.message = ""
  if obj.status ~= nil then
    if obj.status.health ~= nil then
      hs.status = obj.status.health.status
      if obj.status.health.message ~= nil then
        hs.message = obj.status.health.message
      end
    end
  end
  return hs
```

## Performance Tips

1. **Set `ServerSideApply=true`** on the root app to speed up diff calculation
2. **Use `RespectIgnoreDifferences=true`** to avoid unnecessary syncs
3. **Increase controller processors** when managing 100+ apps
4. **Use selective sync** instead of syncing the entire tree when only one child changed
5. **Enable resource tracking** with annotation-based tracking for faster reconciliation

```yaml
# On the root application
spec:
  syncPolicy:
    syncOptions:
      - ServerSideApply=true
      - CreateNamespace=true
    automated:
      selfHeal: true
      prune: true
      allowEmpty: false
```

## When to Use App-of-Apps vs ApplicationSets

Use App-of-Apps when:
- You need different sync policies per child app
- You have complex dependency ordering with sync waves
- You want full control over each Application manifest
- You need to mix Helm, Kustomize, and plain YAML sources

Use ApplicationSets when:
- You have many similar applications with a consistent pattern
- You want automatic discovery of new services
- You need to deploy the same app to multiple clusters or namespaces

The best approach at scale is often a combination: App-of-Apps for the top-level structure and ApplicationSets within categories for repetitive patterns.

For more on ApplicationSets, see our post on [ArgoCD ApplicationSets](https://oneuptime.com/blog/post/2026-02-02-argocd-applicationsets/view).
