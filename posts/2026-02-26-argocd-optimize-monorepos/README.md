# How to Optimize ArgoCD for Monorepos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Monorepo, Performance

Description: Learn how to optimize ArgoCD for monorepo deployments including manifest generation performance, webhook filtering, caching strategies, and ApplicationSet patterns.

---

Monorepos - single repositories containing multiple applications, services, or infrastructure configurations - are popular in organizations that value code sharing and atomic cross-service changes. However, monorepos create unique challenges for ArgoCD. A new commit can invalidate cached manifests for many applications, even if the change only affects one service. The repo server must keep a local checkout of the monorepo and generate manifests from the relevant paths. Webhook notifications need path awareness to avoid unnecessary refreshes. This guide covers the specific optimizations needed to make ArgoCD work efficiently with monorepos.

## The Monorepo Challenge

Consider a monorepo with 50 microservices:

```text
monorepo/
  services/
    api-gateway/
      manifests/
    user-service/
      manifests/
    order-service/
      manifests/
    ... (47 more services)
  infrastructure/
    networking/
    monitoring/
    rbac/
  shared/
    configmaps/
    secrets/
```

Each service has its own ArgoCD Application. When a developer pushes a change to `user-service`, all 50+ applications get refreshed because they all point to the same repository. This is wasteful and slow.

```mermaid
graph TD
    Push[Developer pushes to user-service/] --> WH[Webhook fires]
    WH --> API[ArgoCD API Server]
    API --> R1[Refresh api-gateway]
    API --> R2[Refresh user-service]
    API --> R3[Refresh order-service]
    API --> R4[Refresh ... 47 more apps]
    R1 --> RS[Repo Server: Fetch repo and generate manifests]
```

## Optimization 1: Use ApplicationSet with Git Generator

Instead of creating applications manually, use ApplicationSet's Git generator to automatically discover services:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: monorepo-services
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/org/monorepo
        revision: main
        directories:
          - path: services/*
  template:
    metadata:
      name: "{{path.basename}}"
    spec:
      project: default
      source:
        repoURL: https://github.com/org/monorepo
        targetRevision: main
        path: "{{path}}/manifests"
      destination:
        server: https://kubernetes.default.svc
        namespace: "{{path.basename}}"
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
```

The ApplicationSet Git generator discovers services from the repository and creates the Applications consistently, which is more manageable than maintaining each Application by hand.

## Optimization 2: Enable Shallow Clone

For monorepos especially, shallow clones make a huge difference:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: monorepo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: https://github.com/org/monorepo
  depth: "1"
```

A 2GB monorepo with years of history might shallow-clone at under 100MB.

## Optimization 3: Increase Cache Duration

Since all applications share the same repo, the cache is extremely effective:

```yaml
# argocd-cmd-params-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  reposerver.repo.cache.expiration: "72h"
```

With good caching, only the first application in a reconciliation cycle pays the cost of `git fetch`. All subsequent applications reuse the cached repo.

## Optimization 4: Persistent Git Cache

Critical for monorepos since re-cloning a large monorepo is extremely expensive:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: argocd-repo-cache
  namespace: argocd
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi  # Size based on your monorepo size * 2
  storageClassName: gp3-ssd
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    spec:
      volumes:
        - name: tmp
          persistentVolumeClaim:
            claimName: argocd-repo-cache
      containers:
        - name: argocd-repo-server
          volumeMounts:
            - name: tmp
              mountPath: /tmp
```

This example uses a `ReadWriteOnce` volume, which is appropriate for a single repo-server pod. If you scale the repo server horizontally, use one cache volume per replica or a storage backend that supports the access mode required by your deployment.

## Optimization 5: Webhook with Path Filtering

Standard Git webhooks can trigger unnecessary work for applications that share a repository. ArgoCD supports the `argocd.argoproj.io/manifest-generate-paths` annotation to avoid refreshing applications when the changed files do not match the paths used for manifest generation:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: user-service
  namespace: argocd
  annotations:
    argocd.argoproj.io/manifest-generate-paths: .
spec:
  source:
    repoURL: https://github.com/org/monorepo
    targetRevision: main
    path: services/user-service/manifests
```

The annotation is a semicolon-separated list of paths used to generate manifests. Relative paths are resolved from the application source path, so `.` means `services/user-service/manifests` in this example. For webhooks, ArgoCD compares the changed files in the webhook payload against these paths.

### Alternative: Increase Reconciliation Interval

If you use webhooks, you can also reduce polling frequency so ArgoCD checks repositories less often when no webhook arrives:

```yaml
# argocd-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  timeout.reconciliation: "10m"
```

## Optimization 6: Directory Include/Exclude

Limit what ArgoCD processes within each application's directory:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: user-service
spec:
  source:
    repoURL: https://github.com/org/monorepo
    path: services/user-service/manifests
    directory:
      recurse: true
      include: "*.yaml"
      exclude: "{tests/**,docs/**,scripts/**,*.md,Makefile}"
```

This prevents the repo server from processing non-manifest files.

## Optimization 7: Scale Repo Server for Monorepo Load

Monorepos put extra load on the repo server. Scale accordingly:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: argocd-repo-server
          resources:
            requests:
              cpu: "2"
              memory: "4Gi"
            limits:
              cpu: "4"
              memory: "8Gi"
```

## Optimization 8: Limit Manifest Generation Parallelism

Prevent the repo server from trying to generate manifests for all monorepo applications simultaneously:

```yaml
# argocd-cmd-params-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  reposerver.parallelism.limit: "5"
```

This is especially important for monorepos without path-aware refresh behavior because a webhook can trigger refreshes for many applications at once. Without a limit, the repo server may try to serve 50+ requests simultaneously.

## Optimization 9: Add Reconciliation Jitter

Prevent the thundering herd when all monorepo applications reconcile together:

```yaml
# argocd-cm ConfigMap
data:
  timeout.reconciliation.jitter: "120s"
```

## Optimization 10: Use Multiple Sources for Shared Config

If services share configuration from a `shared/` directory, use multiple sources:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: user-service
spec:
  sources:
    # Service-specific manifests
    - repoURL: https://github.com/org/monorepo
      targetRevision: main
      path: services/user-service/manifests
    # Shared configuration
    - repoURL: https://github.com/org/monorepo
      targetRevision: main
      path: shared/configmaps
```

This makes the dependency on shared resources explicit and visible in ArgoCD.

## Monorepo Structure Best Practices

Organize your monorepo to work well with ArgoCD:

```text
monorepo/
  services/
    user-service/
      manifests/          # K8s manifests (ArgoCD reads this)
        deployment.yaml
        service.yaml
        values.yaml       # Helm values
      src/                # Application code (ignored by ArgoCD)
      tests/              # Tests (ignored by ArgoCD)
    order-service/
      manifests/
      src/
  infrastructure/
    base/                 # Shared Kustomize base
    overlays/
      production/
      staging/
  charts/                 # Shared Helm charts
```

Key principles:
- Keep manifests in a predictable path (`manifests/` or `k8s/`)
- Separate application code from deployment manifests
- Use a consistent directory structure so ApplicationSet generators work

## Monitoring Monorepo Performance

Track monorepo-specific performance indicators:

```bash
# Check how long the monorepo takes to clone
kubectl logs -n argocd deployment/argocd-repo-server | \
  grep "github.com/org/monorepo" | grep -E "duration|time"

# Check cache effectiveness for the monorepo
curl -s http://localhost:8084/metrics | grep argocd_git_request_duration_seconds
```

For comprehensive monitoring of your monorepo ArgoCD performance including clone times, manifest generation duration, and reconciliation patterns, [OneUptime](https://oneuptime.com) provides observability dashboards tailored for GitOps workflows.

## Key Takeaways

- Enable shallow clones and persistent cache as baseline optimizations for monorepos
- Use ApplicationSet with Git generators for automatic service discovery
- Limit repo server parallelism to prevent resource exhaustion from simultaneous refreshes
- Add reconciliation jitter to spread load after webhook-triggered refreshes
- Use directory include/exclude to skip non-manifest files
- Scale the repo server horizontally and increase memory for large monorepos
- Use manifest-generate-paths for path-aware refresh behavior
- Structure your monorepo with predictable manifest directories for clean ArgoCD integration
