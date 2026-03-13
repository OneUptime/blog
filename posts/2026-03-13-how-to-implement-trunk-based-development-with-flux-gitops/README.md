# How to Implement Trunk-Based Development with Flux GitOps

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Trunk-Based Development, CI/CD, Branching Strategy

Description: Learn how to implement trunk-based development with Flux GitOps, using a single main branch with automated image updates and environment promotion via directory structure.

---

## What is Trunk-Based Development

Trunk-based development is a branching model where all developers commit to a single main branch (the trunk) using short-lived feature branches. Combined with Flux GitOps, this means the main branch is the single source of truth for all environments, with directory-based separation for environment-specific configuration.

## Why Trunk-Based with Flux

Trunk-based development and Flux are a natural fit because:

- A single branch simplifies GitOps reconciliation
- Short-lived branches reduce merge conflicts in infrastructure config
- Automated image updates work best with a single branch
- Environment promotion happens through directory changes, not branch merges

## Repository Structure

```text
flux-repo/
├── clusters/
│   ├── staging/
│   │   ├── infrastructure.yaml
│   │   └── apps.yaml
│   └── production/
│       ├── infrastructure.yaml
│       └── apps.yaml
├── infrastructure/
│   ├── base/
│   │   └── kustomization.yaml
│   ├── staging/
│   │   └── kustomization.yaml
│   └── production/
│       └── kustomization.yaml
└── apps/
    ├── base/
    │   └── web-app/
    │       ├── kustomization.yaml
    │       ├── deployment.yaml
    │       └── service.yaml
    ├── staging/
    │   ├── kustomization.yaml
    │   └── web-app/
    │       └── kustomization.yaml
    └── production/
        ├── kustomization.yaml
        └── web-app/
            └── kustomization.yaml
```

## All Environments Track Main

Both staging and production track the same `main` branch but point to different directories:

```yaml
# clusters/staging/apps.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 1m
  ref:
    branch: main
  url: ssh://git@github.com/myorg/flux-repo.git
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/staging
  prune: true
```

```yaml
# clusters/production/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/production
  prune: true
```

## Automated Image Updates for Staging

Use Flux image automation to automatically update staging with the latest container images:

```yaml
# clusters/staging/image-automation.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: web-app
  namespace: flux-system
spec:
  image: myregistry/web-app
  interval: 5m
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: web-app-staging
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: web-app
  filterTags:
    pattern: '^main-[a-f0-9]+-(?P<ts>[0-9]+)'
    extract: '$ts'
  policy:
    numerical:
      order: asc
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: staging-auto-update
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: flux-bot
        email: flux@example.com
      messageTemplate: "chore: update staging images"
    push:
      branch: main
  update:
    path: ./apps/staging
    strategy: Setters
```

Mark the image in the staging deployment with an update marker:

```yaml
# apps/staging/web-app/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base/web-app
images:
  - name: myregistry/web-app
    newTag: main-abc123-1710000000 # {"$imagepolicy": "flux-system:web-app-staging:tag"}
```

## Manual Promotion to Production

Production uses pinned image tags that are updated through PRs:

```yaml
# apps/production/web-app/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base/web-app
images:
  - name: myregistry/web-app
    newTag: v1.5.0
patches:
  - target:
      kind: Deployment
      name: web-app
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: web-app
      spec:
        replicas: 5
```

## The Trunk-Based Workflow

```bash
# 1. Create a short-lived feature branch
git checkout -b feat/add-caching main

# 2. Make changes to the base or staging overlay
# Edit apps/base/web-app/deployment.yaml

# 3. Push and create a PR against main
git push origin feat/add-caching
gh pr create --base main --title "Add caching to web-app"

# 4. After review and CI passes, merge to main
gh pr merge --squash

# 5. Flux automatically updates staging
# Image automation commits new tags to apps/staging/

# 6. After verification, promote to production
git checkout main
git pull
# Update apps/production/web-app/kustomization.yaml with new tag
git commit -m "promote: web-app v1.6.0 to production"
git push
```

## CI Integration for Trunk-Based Development

Configure CI to build and tag images on every commit to main:

```yaml
# .github/workflows/build.yaml (in the application repo)
name: Build and Push
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build and push image
        run: |
          TAG="main-${GITHUB_SHA::8}-$(date +%s)"
          docker build -t myregistry/web-app:$TAG .
          docker push myregistry/web-app:$TAG

      - name: Create release tag on merge
        if: contains(github.event.head_commit.message, 'release:')
        run: |
          VERSION=$(echo "${{ github.event.head_commit.message }}" | grep -oP 'release: v\K[0-9.]+')
          docker tag myregistry/web-app:$TAG myregistry/web-app:v$VERSION
          docker push myregistry/web-app:v$VERSION
```

## Feature Flags Instead of Feature Branches

In trunk-based development, use feature flags to control the rollout of incomplete features:

```yaml
# apps/base/web-app/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  template:
    spec:
      containers:
        - name: web-app
          image: myregistry/web-app:latest
          env:
            - name: FEATURE_NEW_UI
              value: "false"
            - name: FEATURE_CACHING
              value: "false"
```

Enable features per environment using Kustomize patches:

```yaml
# apps/staging/web-app/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base/web-app
patches:
  - target:
      kind: Deployment
      name: web-app
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: web-app
      spec:
        template:
          spec:
            containers:
              - name: web-app
                env:
                  - name: FEATURE_NEW_UI
                    value: "true"
                  - name: FEATURE_CACHING
                    value: "true"
```

## Conclusion

Trunk-based development with Flux GitOps simplifies the deployment pipeline by using a single branch with directory-based environment separation. Automated image updates handle staging deployments while production promotion remains a deliberate, reviewable action. This approach reduces merge conflicts, provides fast feedback loops, and aligns well with continuous integration practices. Feature flags complement this model by allowing incomplete features to coexist on the main branch without affecting production.
