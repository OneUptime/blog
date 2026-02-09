# How to Build a GitOps Promotion Pipeline Across Dev Staging and Production Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitOps, Flux, ArgoCD, Promotion Pipeline, Multi-Environment

Description: Learn how to implement a GitOps promotion pipeline that automatically or manually promotes application versions across development, staging, and production environments using Git branches, tags, or image policies.

---

Production deployments require validation. Code must pass through development and staging environments before reaching production users. A GitOps promotion pipeline automates this progression while maintaining Git as the source of truth and giving teams control over when promotions occur.

This guide shows you how to build promotion pipelines using Flux and ArgoCD that balance automation with safety.

## Understanding Promotion Strategies

Three main promotion strategies exist in GitOps. Branch-based promotion uses different Git branches for each environment. Tag-based promotion uses Git tags to mark versions ready for production. Image-based promotion uses container image tags and policies to control what deploys where.

Each strategy has tradeoffs. Branch-based is simple but requires merging code across branches. Tag-based provides immutability but needs careful tag management. Image-based decouples code from deployments but requires image automation controllers.

## Implementing Branch-Based Promotion with Flux

Create a repository structure with environment branches:

```
.
├── develop (branch)
├── staging (branch)
└── main (branch - production)
```

Configure Flux to watch different branches per cluster:

```yaml
# Development cluster
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/myorg/fleet-config
  ref:
    branch: develop
  secretRef:
    name: git-credentials
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

```yaml
# Staging cluster
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/myorg/fleet-config
  ref:
    branch: staging
  secretRef:
    name: git-credentials
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m  # Less frequent for stability
  path: ./apps
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

```yaml
# Production cluster
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/myorg/fleet-config
  ref:
    branch: main
  secretRef:
    name: git-credentials
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 30m  # Very infrequent for safety
  path: ./apps
  prune: false  # Never auto-prune in production
  sourceRef:
    kind: GitRepository
    name: flux-system
```

Promote by merging branches:

```bash
# Promote from dev to staging
git checkout staging
git merge develop
git push origin staging

# Promote from staging to production
git checkout main
git merge staging
git push origin main
```

## Implementing Tag-Based Promotion

Use Git tags to mark releases:

```yaml
# All clusters watch the same repository
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: fleet-config
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/myorg/fleet-config
  ref:
    semver: ">=1.0.0"  # Production uses stable releases
  secretRef:
    name: git-credentials
```

For staging, use pre-release tags:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: fleet-config
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/myorg/fleet-config
  ref:
    semver: ">=1.0.0-rc.0"  # Includes release candidates
```

For development, use the latest commit:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: fleet-config
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/myorg/fleet-config
  ref:
    branch: main
```

Promote by creating tags:

```bash
# Deploy to staging
git tag -a v1.2.0-rc.1 -m "Release candidate 1"
git push origin v1.2.0-rc.1

# After validation, promote to production
git tag -a v1.2.0 -m "Production release"
git push origin v1.2.0
```

## Implementing Image-Based Promotion with Flux

Configure image policies per environment:

```yaml
# Development: Use any new image
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: api-dev-policy
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: api-gateway
  policy:
    semver:
      range: '*'
---
# Staging: Only release candidates
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: api-staging-policy
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: api-gateway
  filterTags:
    pattern: '^v[0-9]+\.[0-9]+\.[0-9]+-rc\.[0-9]+$'
  policy:
    semver:
      range: '>=1.0.0-rc.0'
---
# Production: Stable releases only
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: api-prod-policy
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: api-gateway
  filterTags:
    pattern: '^v[0-9]+\.[0-9]+\.[0-9]+$'
  policy:
    semver:
      range: '>=1.0.0'
```

Each environment uses its policy:

```yaml
# Development deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
spec:
  template:
    spec:
      containers:
      - name: api
        image: myregistry.io/api-gateway:v1.0.0 # {"$imagepolicy": "flux-system:api-dev-policy"}
---
# Production deployment (different Git path/branch)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
spec:
  template:
    spec:
      containers:
      - name: api
        image: myregistry.io/api-gateway:v1.0.0 # {"$imagepolicy": "flux-system:api-prod-policy"}
```

Promote by re-tagging images:

```bash
# Build and push dev image
docker build -t myregistry.io/api-gateway:v1.2.0-dev.123 .
docker push myregistry.io/api-gateway:v1.2.0-dev.123

# After dev testing, promote to RC
docker tag myregistry.io/api-gateway:v1.2.0-dev.123 myregistry.io/api-gateway:v1.2.0-rc.1
docker push myregistry.io/api-gateway:v1.2.0-rc.1

# After staging validation, promote to prod
docker tag myregistry.io/api-gateway:v1.2.0-rc.1 myregistry.io/api-gateway:v1.2.0
docker push myregistry.io/api-gateway:v1.2.0
```

## Automating Promotions with GitHub Actions

Create a promotion workflow:

```yaml
# .github/workflows/promote-to-staging.yml
name: Promote to Staging
on:
  push:
    branches:
    - develop

jobs:
  promote:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
      with:
        ref: staging
        fetch-depth: 0

    - name: Merge develop into staging
      run: |
        git config user.name "GitHub Actions"
        git config user.email "actions@github.com"
        git merge origin/develop
        git push origin staging

    - name: Notify Slack
      run: |
        curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
          -H 'Content-type: application/json' \
          --data '{"text":"Promoted to staging"}'
```

Manual promotion to production:

```yaml
# .github/workflows/promote-to-production.yml
name: Promote to Production
on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to promote'
        required: true

jobs:
  promote:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Create production tag
      run: |
        git config user.name "GitHub Actions"
        git config user.email "actions@github.com"
        git tag -a ${{ github.event.inputs.version }} -m "Production release"
        git push origin ${{ github.event.inputs.version }}

    - name: Create release
      uses: actions/create-release@v1
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      with:
        tag_name: ${{ github.event.inputs.version }}
        release_name: Release ${{ github.event.inputs.version }}
```

## Implementing ArgoCD App-of-Apps Promotion

Use ApplicationSet for multi-environment deployments:

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
          revision: HEAD
          directories:
          - path: apps/*
      - list:
          elements:
          - env: dev
            cluster: dev-cluster
            revision: develop
            auto: "true"
          - env: staging
            cluster: staging-cluster
            revision: staging
            auto: "false"
          - env: prod
            cluster: prod-cluster
            revision: main
            auto: "false"
  template:
    metadata:
      name: '{{path.basename}}-{{env}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/apps
        targetRevision: '{{revision}}'
        path: '{{path}}'
      destination:
        server: '{{cluster}}'
        namespace: '{{path.basename}}'
      syncPolicy:
        automated:
          prune: '{{auto}}'
          selfHeal: '{{auto}}'
```

## Adding Approval Gates

Require manual approval before production:

```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production
on:
  push:
    branches:
    - main

jobs:
  approval:
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://app.production.example.com
    steps:
    - name: Manual Approval Required
      run: echo "Waiting for approval"

  deploy:
    needs: approval
    runs-on: ubuntu-latest
    steps:
    - name: Trigger Flux sync
      run: |
        kubectl annotate gitrepository flux-system -n flux-system \
          reconcile.fluxcd.io/requestedAt="$(date +%s)"
```

## Monitoring Promotion Status

Track deployments across environments:

```bash
# Check what's deployed in each environment
flux get kustomizations --all-namespaces

# View image versions per environment
flux get image policy --all-namespaces
```

Create a promotion dashboard:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: promotion-dashboard
data:
  queries: |
    # Version deployed in dev
    kube_deployment_labels{deployment="api-gateway",namespace="dev"}

    # Version deployed in staging
    kube_deployment_labels{deployment="api-gateway",namespace="staging"}

    # Version deployed in prod
    kube_deployment_labels{deployment="api-gateway",namespace="prod"}
```

GitOps promotion pipelines provide controlled, auditable paths from development to production while maintaining the benefits of declarative infrastructure and Git-based workflows.
