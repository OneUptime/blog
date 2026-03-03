# How to Structure Multi-Repo Setup for ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Multi-Repo, Repository Management

Description: Learn how to organize multiple Git repositories for ArgoCD GitOps workflows with clear ownership boundaries and scalable repository patterns.

---

When a monorepo no longer scales for your organization, you split into multiple repositories. Multi-repo setups give each team ownership of their service configs, enable fine-grained access control, and avoid the merge conflict chaos that comes with large monorepos. But they also introduce complexity in how ArgoCD discovers and manages applications across repos. Here is how to set it up right.

## When to Choose Multi-Repo

A multi-repo setup makes sense when:

- Multiple teams need independent release cycles
- You need different access controls per service or team
- Your monorepo has grown past 50-100 services and Git is slow
- Teams want to use different tooling (one team uses Helm, another uses Kustomize)
- Compliance requires audit trails per service

The core tradeoff is that you gain independence but lose the atomic cross-service commits that monorepos provide.

## The Multi-Repo Architecture

A typical multi-repo pattern uses three types of repositories:

```mermaid
graph TD
    A[Config Repo - ArgoCD Apps] --> B[Service Repo A]
    A --> C[Service Repo B]
    A --> D[Service Repo C]
    A --> E[Platform Repo]
    B --> F[Dev Cluster]
    B --> G[Staging Cluster]
    B --> H[Prod Cluster]
    C --> F
    C --> G
    C --> H
```

1. **Config Repo** - Contains ArgoCD Application and ApplicationSet definitions. This is the "app of apps" repository.
2. **Service Repos** - Each service or team has its own repo with Kubernetes manifests.
3. **Platform Repo** - Contains shared infrastructure like namespaces, RBAC, CRDs, and monitoring configs.

## Setting Up the Config Repo

The config repo is the entry point for ArgoCD. It contains Application definitions that point to other repos:

```text
config-repo/
├── apps/
│   ├── dev/
│   │   ├── frontend.yaml
│   │   ├── backend-api.yaml
│   │   └── worker.yaml
│   ├── staging/
│   │   ├── frontend.yaml
│   │   ├── backend-api.yaml
│   │   └── worker.yaml
│   └── production/
│       ├── frontend.yaml
│       ├── backend-api.yaml
│       └── worker.yaml
├── applicationsets/
│   └── all-services.yaml
├── projects/
│   ├── team-alpha.yaml
│   └── team-beta.yaml
└── root-app.yaml
```

The root Application bootstraps everything:

```yaml
# root-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: root
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/config-repo
    targetRevision: main
    path: apps/production
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
  syncPolicy:
    automated:
      selfHeal: true
      prune: true
```

Each Application in the apps directory points to a service repo:

```yaml
# apps/production/backend-api.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: backend-api-production
  namespace: argocd
  labels:
    team: alpha
    environment: production
spec:
  project: team-alpha
  source:
    repoURL: https://github.com/myorg/backend-api-deploy
    targetRevision: release/v2.3.1
    path: overlays/production
  destination:
    server: https://prod-cluster.example.com
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=false
```

## Setting Up Service Repos

Each service repo contains only the Kubernetes manifests for that service:

```text
backend-api-deploy/
├── base/
│   ├── kustomization.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── configmap.yaml
│   └── hpa.yaml
└── overlays/
    ├── dev/
    │   ├── kustomization.yaml
    │   └── patches/
    │       └── replicas.yaml
    ├── staging/
    │   ├── kustomization.yaml
    │   └── patches/
    └── production/
        ├── kustomization.yaml
        └── patches/
            ├── replicas.yaml
            └── resources.yaml
```

## Repository Credentials

ArgoCD needs access to all your repositories. Configure credentials using templates so you do not have to add each repo individually:

```yaml
# Repository credential template - matches all repos in your org
apiVersion: v1
kind: Secret
metadata:
  name: myorg-repo-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: https://github.com/myorg
  password: ghp_xxxxxxxxxxxx  # GitHub PAT or deploy key
  username: argocd-bot
```

With this template, any repository under `https://github.com/myorg` is automatically accessible to ArgoCD without individual configuration.

For SSH access:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: myorg-ssh-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: git@github.com:myorg
  sshPrivateKey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    ...
    -----END OPENSSH PRIVATE KEY-----
```

## Using ApplicationSets for Multi-Repo Discovery

ApplicationSets with the SCM Provider generator can automatically discover repos in your GitHub organization:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: auto-discover-services
  namespace: argocd
spec:
  generators:
    - scmProvider:
        github:
          organization: myorg
          tokenRef:
            secretName: github-token
            key: token
        filters:
          - repositoryMatch: ".*-deploy$"  # Only repos ending in -deploy
            pathsExist:
              - overlays/production/kustomization.yaml
  template:
    metadata:
      name: "{{repository}}-production"
    spec:
      project: default
      source:
        repoURL: "{{url}}"
        targetRevision: main
        path: overlays/production
      destination:
        server: https://kubernetes.default.svc
        namespace: production
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

This automatically creates ArgoCD Applications for every repo matching the pattern, as long as it has the expected directory structure.

## ArgoCD Projects for Access Control

Use ArgoCD Projects to enforce boundaries between teams:

```yaml
# projects/team-alpha.yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: team-alpha
  namespace: argocd
spec:
  description: Team Alpha services
  sourceRepos:
    - "https://github.com/myorg/frontend-deploy"
    - "https://github.com/myorg/backend-api-deploy"
  destinations:
    - namespace: "team-alpha-*"
      server: "*"
    - namespace: "production"
      server: "https://prod-cluster.example.com"
  clusterResourceWhitelist:
    - group: ""
      kind: Namespace
  namespaceResourceBlacklist:
    - group: ""
      kind: ResourceQuota  # Prevent teams from modifying quotas
  roles:
    - name: admin
      policies:
        - p, proj:team-alpha:admin, applications, *, team-alpha/*, allow
      groups:
        - team-alpha-admins
```

## Version Pinning Strategy

In a multi-repo setup, you control which version of a service repo ArgoCD deploys. Use targetRevision in the Application spec:

```yaml
# For development - track a branch
targetRevision: main

# For staging - track a release branch
targetRevision: release/v2.3

# For production - pin to a specific tag
targetRevision: v2.3.1
```

Promotion between environments means updating the targetRevision in the config repo:

```bash
# Promote backend-api from staging to production
# Update the targetRevision in the config repo
cd config-repo
yq '.spec.source.targetRevision = "v2.3.1"' \
  apps/production/backend-api.yaml > tmp.yaml && \
  mv tmp.yaml apps/production/backend-api.yaml
git add apps/production/backend-api.yaml
git commit -m "promote backend-api v2.3.1 to production"
git push
```

## Handling Cross-Service Dependencies

Multi-repo setups lose atomic cross-service commits. When Service A depends on Service B, you need coordination:

1. **Deploy Service B first** using sync waves in the config repo:

```yaml
# Service B deploys in wave 0
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "0"

# Service A deploys in wave 1
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "1"
```

2. **Use health checks** to verify Service B is ready before Service A deploys.

3. **Version contracts** - Service A's config repo specifies the minimum version of Service B it requires. Your CI pipeline checks this before allowing promotion.

## Keeping Repos Consistent

Without a monorepo enforcing structure, repos can drift. Use these tools to maintain consistency:

- **Repository templates** - Create a template repo that new service repos are forked from
- **CI validation** - Run structural checks on PRs to ensure kustomization.yaml exists in expected paths
- **Shared Helm chart** - Create a common Helm chart that all services use as a base

```yaml
# Shared chart values per service
# backend-api-deploy/values-production.yaml
replicaCount: 3
image:
  repository: myorg/backend-api
  tag: v2.3.1
resources:
  requests:
    cpu: 500m
    memory: 512Mi
```

## Summary

A multi-repo ArgoCD setup separates concerns between a config repo (Application definitions), service repos (Kubernetes manifests per service), and a platform repo (shared infrastructure). Use repository credential templates for seamless access, ApplicationSets with SCM Provider generators for auto-discovery, and ArgoCD Projects for access control between teams. Pin specific versions for production and use branch tracking for development. The extra complexity pays off when you need team independence and granular access control.
