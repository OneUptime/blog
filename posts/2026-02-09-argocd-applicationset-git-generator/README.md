# How to Create ArgoCD ApplicationSet Git Generator Patterns for Monorepo Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ArgoCD, ApplicationSet, GitOps, Monorepo, Kubernetes

Description: Learn how to use ArgoCD ApplicationSet with Git generators to automatically discover and deploy applications from monorepo directory structures without manually creating Application resources for each service.

---

Managing hundreds of Application resources manually doesn't scale. ApplicationSet automates application creation using generators that discover applications from your Git repository structure. The Git generator is perfect for monorepos where each directory represents a deployable application.

This guide shows you how to configure ApplicationSet Git generators that automatically create ArgoCD Applications based on your repository layout.

## Understanding ApplicationSet Git Generators

Git generators scan your repository for directories or files matching specific patterns. When they find a match, ApplicationSet creates an Application resource using templates you define. Add a new directory, and ApplicationSet automatically deploys it.

Two generator types exist: the directory generator discovers applications based on folder structure, while the files generator reads application metadata from JSON or YAML files.

## Creating a Basic Directory Generator

Deploy ApplicationSet with directory discovery:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: monorepo-apps
  namespace: argocd
spec:
  generators:
  - git:
      repoURL: https://github.com/myorg/applications
      revision: main
      directories:
      - path: apps/*
  template:
    metadata:
      name: '{{path.basename}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/applications
        targetRevision: main
        path: '{{path}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{path.basename}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

With this structure:

```
apps/
├── api-gateway/
│   └── deployment.yaml
├── user-service/
│   └── deployment.yaml
└── payment-service/
    └── deployment.yaml
```

ApplicationSet creates three Applications automatically.

## Filtering Directories with Exclude Patterns

Exclude specific directories:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: production-apps
  namespace: argocd
spec:
  generators:
  - git:
      repoURL: https://github.com/myorg/monorepo
      revision: main
      directories:
      - path: services/*
        exclude: services/deprecated-*
```

This deploys all services except those starting with `deprecated-`.

## Using Files Generator for Metadata

Create application metadata files:

```yaml
# apps/api-gateway/app.yaml
name: api-gateway
namespace: production
replicas: 3
tier: critical
---
# apps/user-service/app.yaml
name: user-service
namespace: production
replicas: 2
tier: standard
```

Configure ApplicationSet to read these files:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: apps-from-files
  namespace: argocd
spec:
  generators:
  - git:
      repoURL: https://github.com/myorg/applications
      revision: main
      files:
      - path: "apps/*/app.yaml"
  template:
    metadata:
      name: '{{name}}'
      labels:
        tier: '{{tier}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/applications
        targetRevision: main
        path: 'apps/{{name}}'
        helm:
          values: |
            replicaCount: {{replicas}}
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{namespace}}'
```

The template interpolates values from app.yaml files.

## Multi-Environment Deployments

Deploy the same applications across multiple environments:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: multi-env-apps
  namespace: argocd
spec:
  generators:
  - matrix:
      generators:
      - git:
          repoURL: https://github.com/myorg/apps
          revision: main
          directories:
          - path: services/*
      - list:
          elements:
          - cluster: production
            url: https://prod-cluster
            namespace: production
          - cluster: staging
            url: https://staging-cluster
            namespace: staging
          - cluster: development
            url: https://dev-cluster
            namespace: development
  template:
    metadata:
      name: '{{path.basename}}-{{cluster}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/apps
        targetRevision: main
        path: '{{path}}'
        kustomize:
          namePrefix: '{{cluster}}-'
      destination:
        server: '{{url}}'
        namespace: '{{namespace}}'
```

This creates Applications for each service in each environment.

## Branch-Based Environment Promotion

Use different branches for different environments:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: branch-promotion
  namespace: argocd
spec:
  generators:
  - matrix:
      generators:
      - git:
          repoURL: https://github.com/myorg/apps
          revision: '{{branch}}'
          directories:
          - path: apps/*
      - list:
          elements:
          - branch: develop
            cluster: dev
            server: https://dev-cluster
          - branch: staging
            cluster: staging
            server: https://staging-cluster
          - branch: main
            cluster: prod
            server: https://prod-cluster
  template:
    metadata:
      name: '{{path.basename}}-{{cluster}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/apps
        targetRevision: '{{branch}}'
        path: '{{path}}'
      destination:
        server: '{{server}}'
        namespace: '{{path.basename}}'
```

## Nested Directory Structures

Handle deep directory hierarchies:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: team-based-apps
  namespace: argocd
spec:
  generators:
  - git:
      repoURL: https://github.com/myorg/monorepo
      revision: main
      directories:
      - path: teams/*/apps/*
  template:
    metadata:
      name: '{{path[1]}}-{{path[3]}}'
      labels:
        team: '{{path[1]}}'
    spec:
      project: '{{path[1]}}'
      source:
        repoURL: https://github.com/myorg/monorepo
        targetRevision: main
        path: '{{path}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{path[1]}}-{{path[3]}}'
```

Structure:

```
teams/
├── platform/
│   └── apps/
│       ├── monitoring/
│       └── logging/
└── product/
    └── apps/
        ├── api/
        └── web/
```

## Combining Multiple Generators

Merge generators for complex scenarios:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: combined-generators
  namespace: argocd
spec:
  generators:
  - merge:
      mergeKeys:
      - path
      generators:
      - git:
          repoURL: https://github.com/myorg/apps
          revision: main
          directories:
          - path: apps/*
      - git:
          repoURL: https://github.com/myorg/apps
          revision: main
          files:
          - path: "apps/*/config.json"
  template:
    metadata:
      name: '{{path.basename}}'
      annotations:
        config: '{{config}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/apps
        targetRevision: main
        path: '{{path}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{namespace}}'
```

## Monitoring ApplicationSet

Check ApplicationSet status:

```bash
kubectl get applicationset -n argocd

kubectl describe applicationset monorepo-apps -n argocd
```

View generated Applications:

```bash
kubectl get applications -n argocd -l argocd.argoproj.io/application-set-name=monorepo-apps
```

Check for errors:

```bash
kubectl logs -n argocd deployment/argocd-applicationset-controller -f
```

## Progressive Rollout with Generators

Implement canary deployments using generators:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: canary-rollout
  namespace: argocd
spec:
  generators:
  - matrix:
      generators:
      - git:
          repoURL: https://github.com/myorg/apps
          revision: main
          files:
          - path: "apps/*/app.yaml"
      - list:
          elements:
          - variant: stable
            weight: 90
          - variant: canary
            weight: 10
  template:
    metadata:
      name: '{{name}}-{{variant}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/apps
        targetRevision: main
        path: 'apps/{{name}}'
        helm:
          values: |
            variant: {{variant}}
            weight: {{weight}}
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{namespace}}'
```

ApplicationSet Git generators transform monorepo management from manual Application creation to fully automated discovery and deployment based on repository structure.
