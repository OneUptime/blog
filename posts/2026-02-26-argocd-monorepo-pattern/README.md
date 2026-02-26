# How to Implement the Monorepo Pattern with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Monorepo, Architecture

Description: Learn how to structure and manage a monorepo for ArgoCD GitOps deployments including directory layout, ApplicationSets, and performance optimization for large repositories.

---

A monorepo stores all your application configurations, Helm charts, Kustomize overlays, and environment-specific values in a single Git repository. When combined with ArgoCD, this approach gives you a single source of truth for your entire infrastructure. But monorepos at scale come with unique challenges around performance, access control, and organization. This guide shows you how to make it work.

## Why Monorepo

The monorepo approach offers several advantages for GitOps:

- **Single source of truth** - Everything is in one place, easy to search and reference
- **Atomic changes** - Update multiple services in a single commit
- **Consistent tooling** - Same CI/CD, linting, and validation for all configs
- **Easier cross-cutting changes** - Update a shared base and all consumers get it
- **Simplified access management** - One repo to configure permissions for

The main drawbacks are repository size, build times, and the need for fine-grained access control within the repo.

## Repository Structure

Here is a proven monorepo structure for ArgoCD:

```
gitops-monorepo/
├── apps/                              # ArgoCD Application/ApplicationSet definitions
│   ├── root.yaml                      # Root App-of-Apps
│   ├── platform/
│   │   ├── cert-manager.yaml
│   │   ├── ingress-nginx.yaml
│   │   └── monitoring.yaml
│   └── services/
│       ├── team-a-apps.yaml           # ApplicationSet for team A
│       └── team-b-apps.yaml           # ApplicationSet for team B
├── charts/                            # Shared Helm charts
│   ├── microservice/                  # Generic microservice chart
│   │   ├── Chart.yaml
│   │   ├── templates/
│   │   └── values.yaml
│   └── cronjob/                       # Generic cronjob chart
│       ├── Chart.yaml
│       ├── templates/
│       └── values.yaml
├── platform/                          # Platform infrastructure
│   ├── cert-manager/
│   │   ├── base/
│   │   └── overlays/
│   ├── ingress-nginx/
│   │   ├── base/
│   │   └── overlays/
│   └── monitoring/
│       ├── base/
│       └── overlays/
├── services/                          # Application services
│   ├── team-a/
│   │   ├── api-gateway/
│   │   │   ├── base/
│   │   │   │   ├── deployment.yaml
│   │   │   │   ├── service.yaml
│   │   │   │   └── kustomization.yaml
│   │   │   └── overlays/
│   │   │       ├── dev/
│   │   │       ├── staging/
│   │   │       └── production/
│   │   └── user-service/
│   │       ├── base/
│   │       └── overlays/
│   └── team-b/
│       ├── payment-service/
│       │   ├── base/
│       │   └── overlays/
│       └── notification-service/
│           ├── base/
│           └── overlays/
└── lib/                               # Shared Kustomize components
    ├── resource-limits/
    ├── network-policies/
    └── pod-disruption-budgets/
```

## Auto-Discovery with Git Generator

The most powerful feature for monorepos is the ApplicationSet Git directory generator. It automatically discovers services:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: team-a-services
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/org/gitops-monorepo.git
        revision: main
        directories:
          - path: services/team-a/*/overlays/production
  template:
    metadata:
      name: '{{path[2]}}-production'
      labels:
        team: team-a
        env: production
    spec:
      project: team-a
      source:
        repoURL: https://github.com/org/gitops-monorepo.git
        targetRevision: main
        path: '{{path}}'
      destination:
        server: https://production-cluster.example.com
        namespace: team-a
      syncPolicy:
        automated:
          selfHeal: true
          prune: true
        syncOptions:
          - CreateNamespace=true
```

The `{{path[2]}}` template extracts the service name from the directory path. When a developer adds a new service directory under `services/team-a/`, ArgoCD automatically creates an Application for it.

## Multi-Environment with Matrix Generator

Combine directory discovery with environment configuration using the matrix generator:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: team-a-all-envs
  namespace: argocd
spec:
  generators:
    - matrix:
        generators:
          # First generator: discover service directories
          - git:
              repoURL: https://github.com/org/gitops-monorepo.git
              revision: main
              directories:
                - path: services/team-a/*
          # Second generator: list of environments
          - list:
              elements:
                - env: dev
                  cluster: https://kubernetes.default.svc
                  namespace: team-a-dev
                - env: staging
                  cluster: https://kubernetes.default.svc
                  namespace: team-a-staging
                - env: production
                  cluster: https://production-cluster.example.com
                  namespace: team-a
  template:
    metadata:
      name: '{{path.basename}}-{{env}}'
    spec:
      project: team-a
      source:
        repoURL: https://github.com/org/gitops-monorepo.git
        targetRevision: main
        path: '{{path}}/overlays/{{env}}'
      destination:
        server: '{{cluster}}'
        namespace: '{{namespace}}'
      syncPolicy:
        automated:
          selfHeal: true
          prune: true
```

## Shared Components with Kustomize

Keep shared components in the `lib/` directory and reference them from service overlays:

```yaml
# lib/resource-limits/standard.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: placeholder
spec:
  template:
    spec:
      containers:
        - name: placeholder
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
```

```yaml
# lib/network-policies/deny-all.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
```

Reference from a service overlay:

```yaml
# services/team-a/api-gateway/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
  - ../../../../../lib/network-policies/deny-all.yaml
patches:
  - path: ../../../../../lib/resource-limits/standard.yaml
    target:
      kind: Deployment
      name: api-gateway
```

## Shared Helm Charts

For services that follow the same pattern, create a shared chart:

```yaml
# charts/microservice/Chart.yaml
apiVersion: v2
name: microservice
description: Generic microservice Helm chart
version: 1.0.0
```

```yaml
# charts/microservice/values.yaml
replicaCount: 1
image:
  repository: ""
  tag: "latest"
service:
  port: 8080
resources:
  requests:
    cpu: 100m
    memory: 128Mi
```

Services reference it using ArgoCD Helm source:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: user-service-production
spec:
  source:
    repoURL: https://github.com/org/gitops-monorepo.git
    targetRevision: main
    path: charts/microservice
    helm:
      valueFiles:
        - ../../../services/team-a/user-service/overlays/production/values.yaml
```

## Performance Optimization

Large monorepos can slow down ArgoCD. Here is how to keep things fast:

### Webhook-Based Sync

Configure webhooks so ArgoCD does not have to poll:

```yaml
# argocd-cm ConfigMap
data:
  # Reduce polling since webhooks handle most updates
  timeout.reconciliation: 300s
```

Set up the webhook in your Git provider pointing to `https://<argocd>/api/webhook`.

### Shallow Clones

Enable shallow clones to reduce Git clone time:

```bash
# Set the Git fetch depth in the repo server
kubectl set env deployment/argocd-repo-server -n argocd \
  ARGOCD_GIT_SHALLOW_DEPTH=1
```

### Increase Repo Server Resources

```yaml
repoServer:
  resources:
    requests:
      cpu: 500m
      memory: 512Mi
    limits:
      cpu: "2"
      memory: 2Gi
  env:
    - name: ARGOCD_EXEC_TIMEOUT
      value: "180s"
    - name: ARGOCD_REPO_SERVER_PARALLELISM_LIMIT
      value: "10"
```

### Use Path-Based Application Filtering

When you have many apps, make sure each Application only watches its specific path. ArgoCD will skip reconciliation for apps whose paths were not affected by a commit.

## CODEOWNERS for Access Control

Use CODEOWNERS to enforce review requirements per directory:

```
# CODEOWNERS
/platform/          @platform-team
/services/team-a/   @team-a
/services/team-b/   @team-b
/charts/            @platform-team
/apps/              @platform-team
/lib/               @platform-team
```

## Validation Pipeline

Add a CI pipeline that validates changes before they reach ArgoCD:

```yaml
# .github/workflows/validate.yaml
name: Validate Manifests
on:
  pull_request:
    paths:
      - 'services/**'
      - 'platform/**'
      - 'charts/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install tools
        run: |
          # Install kustomize, helm, kubeval
          curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash

      - name: Find changed directories
        id: changes
        run: |
          dirs=$(git diff --name-only origin/main | xargs -I{} dirname {} | sort -u)
          echo "dirs=$dirs" >> $GITHUB_OUTPUT

      - name: Validate Kustomize builds
        run: |
          # Build and validate each changed overlay
          find services/ -name kustomization.yaml -exec dirname {} \; | while read dir; do
            echo "Validating $dir"
            kustomize build "$dir" | kubeval --strict
          done
```

For a related deep dive, check out our post on [ArgoCD ApplicationSet Git generator patterns for monorepo deployments](https://oneuptime.com/blog/post/2026-02-09-argocd-applicationset-git-generator/view).
