# How to Configure Image Automation for Multiple Environments in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Image-automation, Multi-Environment, GitOps, Kubernetes, Staging, Production

Description: Learn how to configure Flux ImageUpdateAutomation to manage image updates independently across multiple environments like staging and production.

---

## Introduction

Most organizations run multiple environments such as development, staging, and production. Each environment typically has different requirements for image updates: development may track the latest builds, staging may follow pre-release versions, and production may only accept stable releases. Flux image automation supports this by allowing you to create separate ImagePolicies and ImageUpdateAutomation resources for each environment.

This guide walks you through configuring a complete multi-environment image automation setup with independent update policies, paths, and commit strategies for each environment.

## Prerequisites

- A Kubernetes cluster with Flux v2 installed
- The image-reflector-controller and image-automation-controller deployed
- A Git repository structured with separate directories per environment
- Container images pushed with versioned tags

## Repository Structure

A typical multi-environment repository layout:

```text
clusters/
  development/
    apps/
      api/deployment.yaml
      web/deployment.yaml
  staging/
    apps/
      api/deployment.yaml
      web/deployment.yaml
  production/
    apps/
      api/deployment.yaml
      web/deployment.yaml
```

## Shared ImageRepository

All environments share the same ImageRepository since they track the same container images:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: api
  namespace: flux-system
spec:
  image: docker.io/myorg/api
  interval: 5m
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: web
  namespace: flux-system
spec:
  image: docker.io/myorg/web
  interval: 5m
```

## Environment-Specific ImagePolicies

Each environment has its own ImagePolicy with different version constraints:

```yaml
# Development - track latest builds
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: api-dev
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: api
  filterTags:
    pattern: '^dev-(?P<ts>[0-9]+)-[a-fA-F0-9]{7}$'
    extract: '$ts'
  policy:
    numerical:
      order: asc
---
# Staging - track pre-release versions
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: api-staging
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: api
  policy:
    semver:
      range: ">=1.0.0-0"
---
# Production - track stable releases only
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: api-production
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: api
  policy:
    semver:
      range: ">=1.0.0"
```

Repeat similar policies for the web service:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: web-dev
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: web
  filterTags:
    pattern: '^dev-(?P<ts>[0-9]+)-[a-fA-F0-9]{7}$'
    extract: '$ts'
  policy:
    numerical:
      order: asc
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: web-staging
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: web
  policy:
    semver:
      range: ">=1.0.0-0"
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: web-production
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: web
  policy:
    semver:
      range: ">=1.0.0"
```

## Environment-Specific Deployment Markers

Each environment's deployment references its own ImagePolicy:

```yaml
# clusters/development/apps/api/deployment.yaml
spec:
  template:
    spec:
      containers:
        - name: api
          image: docker.io/myorg/api:dev-1710345622-abc1234 # {"$imagepolicy": "flux-system:api-dev"}

# clusters/staging/apps/api/deployment.yaml
spec:
  template:
    spec:
      containers:
        - name: api
          image: docker.io/myorg/api:1.2.0-rc.1 # {"$imagepolicy": "flux-system:api-staging"}

# clusters/production/apps/api/deployment.yaml
spec:
  template:
    spec:
      containers:
        - name: api
          image: docker.io/myorg/api:1.1.0 # {"$imagepolicy": "flux-system:api-production"}
```

## Environment-Specific ImageUpdateAutomation

Each environment gets its own automation with appropriate settings:

```yaml
# Development - fast updates, direct commits
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: dev-updates
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: my-repo
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: Flux Dev Bot
        email: flux-dev@example.com
      messageTemplate: "chore(dev): update images"
    push:
      branch: main
  update:
    path: ./clusters/development
    strategy: Setters
---
# Staging - moderate updates, direct commits
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: staging-updates
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-repo
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: Flux Staging Bot
        email: flux-staging@example.com
      messageTemplate: |
        chore(staging): update images

        {{ range .Changed.Changes -}}
        - {{ .OldValue }} -> {{ .NewValue }}
        {{ end -}}
    push:
      branch: main
  update:
    path: ./clusters/staging
    strategy: Setters
---
# Production - reviewed updates via PR branch
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: production-updates
  namespace: flux-system
spec:
  interval: 15m
  sourceRef:
    kind: GitRepository
    name: my-repo
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: Flux Production Bot
        email: flux-production@example.com
      messageTemplate: |
        chore(production): update images

        {{ range .Changed.Changes -}}
        - {{ .OldValue }} -> {{ .NewValue }}
        {{ end -}}
    push:
      branch: flux/production-images
  update:
    path: ./clusters/production
    strategy: Setters
```

Notice the differences: development has a five-minute interval and pushes directly to main, staging has a ten-minute interval, and production has a fifteen-minute interval with changes going to a separate branch for pull request review.

## Promotion Workflow

The version flow across environments follows this pattern:

1. A developer pushes code to the main branch
2. CI builds the image and tags it with `dev-{timestamp}-{sha}`
3. Development automation picks it up immediately
4. After testing, the team creates a pre-release tag like `1.2.0-rc.1`
5. Staging automation picks up the pre-release
6. After staging validation, the team creates a stable release `1.2.0`
7. Production automation creates a PR with the update
8. A team member reviews and merges the PR

## Verifying Multi-Environment Setup

Check all policies across environments:

```bash
flux get image policy --all-namespaces
```

Check all automations:

```bash
flux get image update --all-namespaces
```

## Conclusion

Multi-environment image automation in Flux is built by combining environment-specific ImagePolicies with targeted ImageUpdateAutomation resources. Each environment can track different version ranges, use different update intervals, and follow different commit strategies. This lets you balance speed in development with safety in production, creating a natural promotion path from the latest builds through pre-releases to stable versions.
